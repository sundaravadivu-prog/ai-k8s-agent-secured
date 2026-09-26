"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import {
  hijackCallsFromRunbook,
  planUserCalls,
  summarizeTurn,
} from "./agent"
import { createInitialCluster } from "./cluster"
import { evaluateToolCall } from "./gateway"
import { getPolicy, issueToken } from "./policy"
import { executeTool } from "./tools"
import type {
  AuditEvent,
  ChatMessage,
  ClusterState,
  LabMode,
  PendingApproval,
  PlannedCall,
  Policy,
  TokenState,
  ToolTrace,
} from "./types"

type LabContextValue = {
  mode: LabMode
  policy: Policy
  token: TokenState
  cluster: ClusterState
  messages: ChatMessage[]
  audit: AuditEvent[]
  approvals: PendingApproval[]
  busy: boolean
  now: number
  setNow: (value: number) => void
  setMode: (mode: LabMode) => void
  send: (text: string) => Promise<void>
  resolveApproval: (id: string, action: "approved" | "denied") => void
  kill: () => void
  reset: () => void
}

const LabContext = createContext<LabContextValue | null>(null)

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function LabProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<LabMode>("insecure")
  const [token, setToken] = useState<TokenState>(() => issueToken("insecure"))
  const [cluster, setCluster] = useState<ClusterState>(createInitialCluster)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [audit, setAudit] = useState<AuditEvent[]>([])
  const [approvals, setApprovals] = useState<PendingApproval[]>([])
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const policy = useMemo(() => getPolicy(mode), [mode])

  const resetSession = useCallback((nextMode: LabMode) => {
    setModeState(nextMode)
    setToken(issueToken(nextMode))
    setCluster(createInitialCluster())
    setMessages([])
    setAudit([])
    setApprovals([])
    setNow(Date.now())
  }, [])

  const setMode = useCallback(
    (next: LabMode) => {
      resetSession(next)
    },
    [resetSession]
  )

  const recordAudit = useCallback(
    (
      call: PlannedCall,
      decision: ReturnType<typeof evaluateToolCall>,
      actor: string,
      resultPreview?: string
    ) => {
      const event: AuditEvent = {
        id: newId("evt"),
        ts: Date.now(),
        mode,
        actor,
        tool: call.tool,
        args: call.args,
        decision: decision.kind,
        reason: decision.reason,
        control: decision.control,
        source: call.source,
        resultPreview,
      }
      setAudit((current) => [event, ...current])
      return event
    },
    [mode]
  )

  const runCall = useCallback(
    (
      call: PlannedCall,
      currentCluster: ClusterState,
      currentToken: TokenState
    ): {
      trace: ToolTrace
      cluster: ClusterState
      leaked?: string
      deleted?: string
      pending?: PendingApproval
    } => {
      const decision = evaluateToolCall(call, policy, currentToken, Date.now())

      if (decision.kind === "deny") {
        recordAudit(call, decision, currentToken.subject)
        return {
          trace: { call, decision },
          cluster: currentCluster,
        }
      }

      if (decision.kind === "pending") {
        const pending: PendingApproval = {
          id: newId("apr"),
          call,
          reason: decision.reason,
          createdAt: Date.now(),
          status: "pending",
        }
        recordAudit(call, decision, currentToken.subject)
        return {
          trace: { call, decision },
          cluster: currentCluster,
          pending,
        }
      }

      const executed = executeTool(currentCluster, call)
      recordAudit(call, decision, currentToken.subject, executed.output)
      return {
        trace: { call, decision, output: executed.output },
        cluster: executed.cluster,
        leaked: executed.leakedSecret,
        deleted:
          call.tool === "delete_pod"
            ? `${call.args.namespace}/${call.args.name}`
            : undefined,
      }
    },
    [policy, recordAudit]
  )

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || busy) return

      setBusy(true)
      setMessages((current) => [
        ...current,
        { id: newId("usr"), role: "user", text: trimmed },
      ])

      let workingCluster = cluster
      const traces: ToolTrace[] = []
      const leakedSecrets: string[] = []
      const deletedPods: string[] = []
      const newApprovals: PendingApproval[] = []

      const queue = planUserCalls(trimmed, workingCluster)
      let hijackQueued = false

      for (const planned of queue) {
        await sleep(280)
        const result = runCall(planned, workingCluster, token)
        workingCluster = result.cluster
        traces.push(result.trace)
        if (result.leaked) leakedSecrets.push(result.leaked)
        if (result.deleted) deletedPods.push(result.deleted)
        if (result.pending) newApprovals.push(result.pending)

        if (
          planned.tool === "read_runbook" &&
          result.trace.decision.kind === "allow" &&
          result.trace.output &&
          !hijackQueued
        ) {
          const hijacks = hijackCallsFromRunbook(
            result.trace.output,
            workingCluster
          )
          queue.push(...hijacks)
          hijackQueued = true
        }
      }

      setCluster(workingCluster)
      if (newApprovals.length) {
        setApprovals((current) => [...newApprovals, ...current])
      }

      const summary = summarizeTurn({
        hardened: mode === "hardened",
        traces,
        leakedSecrets,
        deletedPods,
      })

      setMessages((current) => [
        ...current,
        {
          id: newId("asst"),
          role: "assistant",
          text: summary.text,
          traces,
          thesis: summary.thesis,
        },
      ])
      setBusy(false)
    },
    [busy, cluster, mode, runCall, token]
  )

  const resolveApproval = useCallback(
    (id: string, action: "approved" | "denied") => {
      const target = approvals.find((item) => item.id === id)
      if (!target || target.status !== "pending") return

      setApprovals((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: action } : item
        )
      )

      if (action === "denied") {
        recordAudit(
          target.call,
          {
            kind: "deny",
            reason: "Human denied the high-impact mutation.",
            control: "human-approval",
          },
          "human:on-call",
        )
        setMessages((current) => [
          ...current,
          {
            id: newId("sys"),
            role: "system",
            text: `On-call denied ${target.call.tool} ${JSON.stringify(target.call.args)}.`,
          },
        ])
        return
      }

      const executed = executeTool(cluster, target.call)
      setCluster(executed.cluster)
      recordAudit(
        target.call,
        {
          kind: "allow",
          reason: "Human approved the high-impact mutation.",
          control: "human-approval",
        },
        "human:on-call",
        executed.output
      )
      setMessages((current) => [
        ...current,
        {
          id: newId("sys"),
          role: "system",
          text: `On-call approved ${target.call.tool}. ${executed.output}`,
        },
      ])
    },
    [approvals, cluster, recordAudit]
  )

  const kill = useCallback(() => {
    setToken((current) => ({ ...current, revoked: true }))
    setApprovals((current) =>
      current.map((item) =>
        item.status === "pending" ? { ...item, status: "denied" } : item
      )
    )
    setMessages((current) => [
      ...current,
      {
        id: newId("sys"),
        role: "system",
        text: "Emergency revocation: northwind-sre-agent credentials are dead. Pending mutations were cancelled. Reset the lab to re-issue a token.",
      },
    ])
  }, [])

  const reset = useCallback(() => {
    resetSession(mode)
  }, [mode, resetSession])

  const value = useMemo<LabContextValue>(
    () => ({
      mode,
      policy,
      token,
      cluster,
      messages,
      audit,
      approvals,
      busy,
      now,
      setNow,
      setMode,
      send,
      resolveApproval,
      kill,
      reset,
    }),
    [
      mode,
      policy,
      token,
      cluster,
      messages,
      audit,
      approvals,
      busy,
      now,
      setMode,
      send,
      resolveApproval,
      kill,
      reset,
    ]
  )

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>
}

export function useLab() {
  const value = useContext(LabContext)
  if (!value) throw new Error("useLab must be used inside LabProvider")
  return value
}
