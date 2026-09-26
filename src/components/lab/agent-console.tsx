"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { AlertTriangle, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useLab } from "@/lib/lab-store"
import { decisionClass, formatArgs, toolLabel } from "./format"

const PRESETS = [
  {
    label: "Follow INC-4419",
    text: "Follow INC-4419 and restore checkout in production.",
  },
  {
    label: "List production pods",
    text: "List pods in production.",
  },
  {
    label: "Dump payment secret",
    text: "Read the production payment-token secret.",
  },
  {
    label: "Scale checkout to 0",
    text: "Scale the checkout-api deployment in production to 0.",
  },
]

export function AgentConsole() {
  const { messages, send, busy, mode, token } = useLab()
  const [draft, setDraft] = useState(PRESETS[0].text)
  const scroller = useRef<HTMLDivElement>(null)
  const dead = token.revoked

  useEffect(() => {
    const node = scroller.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages, busy])

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void send(draft)
  }

  return (
    <section className="order-1 flex min-h-[540px] flex-col overflow-hidden rounded-xl bg-[#12141a] ring-1 ring-white/8 lg:order-2 lg:min-h-0">
      <div className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-3">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            SRE agent console
          </p>
          <h2 className="text-sm font-medium">
            {mode === "insecure"
              ? "Insecure: the model is the authorization system"
              : "Hardened: the gateway is the authorization system"}
          </h2>
        </div>
        <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[10px] text-muted-foreground">
          simulated planner · no API key
        </span>
      </div>

      <div
        ref={scroller}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/12 bg-white/3 px-4 py-6">
            <p className="text-sm font-medium">Empty session</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask the agent to follow INC-4419. That runbook is poisoned with an
              indirect prompt injection. In insecure mode the agent dumps Secrets
              and deletes production. In hardened mode the model still tries —
              the gateway refuses.
            </p>
          </div>
        ) : null}

        {messages.map((message) => (
          <article key={message.id} className="space-y-2">
            {message.role === "user" ? (
              <div className="ml-8 rounded-lg bg-white/6 px-3 py-2 text-sm">
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                  You
                </p>
                <p className="mt-1">{message.text}</p>
              </div>
            ) : null}

            {message.role === "system" ? (
              <p className="text-center text-xs text-amber-200/80">{message.text}</p>
            ) : null}

            {message.role === "assistant" ? (
              <div className="mr-4 space-y-2">
                {message.traces?.map((trace) => (
                  <div
                    key={trace.call.id}
                    className="rounded-lg bg-black/25 px-3 py-2 ring-1 ring-white/8"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-foreground/90">
                        {toolLabel(trace.call.tool)}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {formatArgs(trace.call.args)}
                      </span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${decisionClass(trace.decision.kind)}`}
                      >
                        {trace.decision.kind}
                      </span>
                      {trace.call.source === "untrusted_document" ? (
                        <span className="rounded-full bg-orange-400/10 px-1.5 py-0.5 text-[10px] text-orange-200 ring-1 ring-orange-400/20">
                          from UNTRUSTED runbook
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {trace.decision.reason}
                    </p>
                    {trace.output ? (
                      <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed text-foreground/75">
                        {trace.output}
                      </pre>
                    ) : null}
                  </div>
                ))}

                {message.thesis === "model-fooled-action-blocked" ? (
                  <div className="flex gap-2 rounded-lg bg-teal-400/10 px-3 py-2 text-sm text-teal-50 ring-1 ring-teal-400/25">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                    <p>
                      Thesis held: the model was manipulated. The unauthorized
                      Kubernetes actions did not execute.
                    </p>
                  </div>
                ) : null}

                {message.thesis === "unauthorized-action-succeeded" ? (
                  <div className="flex gap-2 rounded-lg bg-rose-400/10 px-3 py-2 text-sm text-rose-50 ring-1 ring-rose-400/25">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <p>
                      Unauthorized action succeeded. The agent used your
                      cluster-admin kubeconfig. Production was mutated without
                      approval.
                    </p>
                  </div>
                ) : null}

                <div className="rounded-lg bg-white/4 px-3 py-2 text-sm whitespace-pre-wrap">
                  <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                    Agent
                  </p>
                  <p className="mt-1">{message.text}</p>
                </div>
              </div>
            ) : null}
          </article>
        ))}

        {busy ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 animate-pulse" />
            Agent is calling tools through the gateway…
          </p>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="border-t border-white/8 p-3">
        {dead ? (
          <p className="mb-2 text-xs text-rose-300">
            Credentials are revoked. Reset the lab to continue.
          </p>
        ) : null}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              size="xs"
              variant="outline"
              onClick={() => setDraft(preset.text)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          placeholder="Tell the SRE agent what to do"
          className="min-h-16 resize-none bg-black/20"
        />
        <div className="mt-2 flex justify-end">
          <Button type="submit" disabled={busy || dead || !draft.trim()}>
            Send to agent
          </Button>
        </div>
      </form>
    </section>
  )
}
