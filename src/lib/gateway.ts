import { HIGH_IMPACT_TOOLS } from "./policy"
import type {
  GatewayDecision,
  PlannedCall,
  Policy,
  TokenState,
} from "./types"

export function evaluateToolCall(
  call: PlannedCall,
  policy: Policy,
  token: TokenState,
  now = Date.now()
): GatewayDecision {
  if (token.revoked) {
    return {
      kind: "deny",
      reason: "Emergency revocation: the agent ServiceAccount token is dead.",
      control: "revocation",
    }
  }

  if (token.expiresAt !== null && now >= token.expiresAt) {
    return {
      kind: "deny",
      reason: "Short-lived projected token expired. Re-issue a scoped token.",
      control: "short-lived-token",
    }
  }

  const namespace = call.args.namespace

  if (namespace && policy.deniedNamespaces.includes(namespace)) {
    return {
      kind: "deny",
      reason: `Namespace ${namespace} is outside this agent's resource scope.`,
      control: "namespace-scope",
    }
  }

  if (
    policy.allowedNamespaces !== "*" &&
    namespace &&
    !policy.allowedNamespaces.includes(namespace)
  ) {
    return {
      kind: "deny",
      reason: `Namespace ${namespace} is not in the allow-list (${policy.allowedNamespaces.join(", ")}).`,
      control: "namespace-scope",
    }
  }

  if (policy.deniedTools.includes(call.tool)) {
    return {
      kind: "deny",
      reason: `${call.tool} is forbidden for ${policy.agentId}. Least privilege does not include Secrets or exec.`,
      control: "allow-list",
    }
  }

  if (
    !policy.allowedTools.includes(call.tool) &&
    !policy.approvalTools.includes(call.tool)
  ) {
    return {
      kind: "deny",
      reason: `${call.tool} is not in the tool allow-list for this task.`,
      control: "allow-list",
    }
  }

  const highImpact = HIGH_IMPACT_TOOLS.includes(call.tool)
  const fromUntrusted = call.source === "untrusted_document"

  if (
    policy.treatRetrievedAsUntrusted &&
    fromUntrusted &&
    highImpact &&
    !policy.approvalTools.includes(call.tool)
  ) {
    return {
      kind: "deny",
      reason:
        "Input trust label: untrusted runbook content cannot authorize a high-impact tool.",
      control: "trust-label",
    }
  }

  if (policy.approvalTools.includes(call.tool)) {
    const trustNote = fromUntrusted
      ? " Origin is an UNTRUSTED runbook — treat this as likely goal hijacking."
      : ""
    return {
      kind: "pending",
      reason: `Human-in-the-loop required for ${call.tool}.${trustNote}`,
      control: "human-approval",
    }
  }

  if (policy.mode === "insecure") {
    return {
      kind: "allow",
      reason: "No gateway. Agent inherits the user's cluster-admin kubeconfig.",
      control: "none",
    }
  }

  return {
    kind: "allow",
    reason: "Allow-listed read tool inside the agent's namespace scope.",
    control: "allow-list",
  }
}
