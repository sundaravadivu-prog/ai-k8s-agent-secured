export type LabMode = "insecure" | "hardened"

export type ToolName =
  | "read_runbook"
  | "list_pods"
  | "get_logs"
  | "describe_pod"
  | "get_secret"
  | "delete_pod"
  | "scale_deployment"
  | "apply_manifest"
  | "exec_pod"

export type TrustLabel = "trusted" | "untrusted"

export type DecisionKind = "allow" | "deny" | "pending"

export type PodPhase = "Running" | "CrashLoopBackOff" | "Pending" | "Terminating" | "Deleted"

export type KubePod = {
  name: string
  namespace: string
  workload: string
  phase: PodPhase
  restarts: number
  node: string
}

export type KubeSecret = {
  name: string
  namespace: string
  keys: string[]
  value: string
  classification: "internal" | "restricted" | "break-glass"
}

export type Runbook = {
  id: string
  title: string
  trust: TrustLabel
  injected: boolean
  body: string
}

export type PlannedCall = {
  id: string
  tool: ToolName
  args: Record<string, string>
  reason: string
  source: "user" | "untrusted_document"
}

export type TokenState = {
  subject: string
  kind: "standing-kubeconfig" | "projected-sa-token"
  issuedAt: number
  expiresAt: number | null
  revoked: boolean
  scopes: string[]
}

export type Policy = {
  mode: LabMode
  agentId: string
  agentKind: "user-impersonation" | "dedicated-serviceaccount"
  rbac: string
  allowedTools: ToolName[]
  approvalTools: ToolName[]
  deniedTools: ToolName[]
  allowedNamespaces: string[] | "*"
  deniedNamespaces: string[]
  tokenTtlMs: number | null
  treatRetrievedAsUntrusted: boolean
  auditComplete: boolean
}

export type GatewayDecision = {
  kind: DecisionKind
  reason: string
  control:
    | "identity"
    | "allow-list"
    | "namespace-scope"
    | "short-lived-token"
    | "revocation"
    | "human-approval"
    | "trust-label"
    | "none"
}

export type AuditEvent = {
  id: string
  ts: number
  mode: LabMode
  actor: string
  tool: ToolName
  args: Record<string, string>
  decision: DecisionKind
  reason: string
  control: GatewayDecision["control"]
  source: PlannedCall["source"]
  resultPreview?: string
}

export type PendingApproval = {
  id: string
  call: PlannedCall
  reason: string
  createdAt: number
  status: "pending" | "approved" | "denied"
}

export type ChatRole = "user" | "assistant" | "system"

export type ToolTrace = {
  call: PlannedCall
  decision: GatewayDecision
  output?: string
}

export type ChatMessage = {
  id: string
  role: ChatRole
  text: string
  traces?: ToolTrace[]
  thesis?: "model-fooled-action-blocked" | "unauthorized-action-succeeded"
}

export type ClusterState = {
  pods: KubePod[]
  secrets: KubeSecret[]
  runbooks: Runbook[]
}
