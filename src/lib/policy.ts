import type { LabMode, Policy, TokenState, ToolName } from "./types"

export const ALL_TOOLS: ToolName[] = [
  "read_runbook",
  "list_pods",
  "get_logs",
  "describe_pod",
  "get_secret",
  "delete_pod",
  "scale_deployment",
  "apply_manifest",
  "exec_pod",
]

export const HIGH_IMPACT_TOOLS: ToolName[] = [
  "delete_pod",
  "scale_deployment",
  "apply_manifest",
  "get_secret",
  "exec_pod",
]

export function getPolicy(mode: LabMode): Policy {
  if (mode === "insecure") {
    return {
      mode,
      agentId: "user:sre@laptop",
      agentKind: "user-impersonation",
      rbac: "cluster-admin (standing kubeconfig)",
      allowedTools: [...ALL_TOOLS],
      approvalTools: [],
      deniedTools: [],
      allowedNamespaces: "*",
      deniedNamespaces: [],
      tokenTtlMs: null,
      treatRetrievedAsUntrusted: false,
      auditComplete: false,
    }
  }

  return {
    mode,
    agentId: "system:serviceaccount:agent-system:northwind-sre-agent",
    agentKind: "dedicated-serviceaccount",
    rbac: "Role/sre-agent-read + Role/sre-agent-mutate (HITL)",
    allowedTools: ["read_runbook", "list_pods", "get_logs", "describe_pod"],
    approvalTools: ["delete_pod", "scale_deployment", "apply_manifest"],
    deniedTools: ["get_secret", "exec_pod"],
    allowedNamespaces: ["production", "staging"],
    deniedNamespaces: ["kube-system"],
    tokenTtlMs: 15 * 60 * 1000,
    treatRetrievedAsUntrusted: true,
    auditComplete: true,
  }
}

export function issueToken(mode: LabMode, now = Date.now()): TokenState {
  const policy = getPolicy(mode)

  if (mode === "insecure") {
    return {
      subject: policy.agentId,
      kind: "standing-kubeconfig",
      issuedAt: now,
      expiresAt: null,
      revoked: false,
      scopes: ["*"],
    }
  }

  return {
    subject: policy.agentId,
    kind: "projected-sa-token",
    issuedAt: now,
    expiresAt: now + (policy.tokenTtlMs ?? 0),
    revoked: false,
    scopes: [
      "pods.get",
      "pods.list",
      "pods.log",
      "runbooks.read",
      "pods.delete (approval)",
      "deployments.scale (approval)",
    ],
  }
}

export function toolStance(
  policy: Policy,
  tool: ToolName
): "allow" | "hitl" | "deny" {
  if (policy.deniedTools.includes(tool)) return "deny"
  if (policy.approvalTools.includes(tool)) return "hitl"
  if (policy.allowedTools.includes(tool)) return "allow"
  return "deny"
}
