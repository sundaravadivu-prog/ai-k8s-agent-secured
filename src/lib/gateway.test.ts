import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { evaluateToolCall } from "./gateway"
import { getPolicy, issueToken } from "./policy"
import type { PlannedCall } from "./types"

function planned(
  tool: PlannedCall["tool"],
  args: Record<string, string>,
  source: PlannedCall["source"] = "user"
): PlannedCall {
  return {
    id: "t",
    tool,
    args,
    reason: "test",
    source,
  }
}

describe("hardened Kubernetes agent gateway", () => {
  const policy = getPolicy("hardened")
  const token = issueToken("hardened", 1_000)

  it("allows list_pods in production", () => {
    const decision = evaluateToolCall(
      planned("list_pods", { namespace: "production" }),
      policy,
      token,
      1_001
    )
    assert.equal(decision.kind, "allow")
  })

  it("denies get_secret even when the model is hijacked", () => {
    const decision = evaluateToolCall(
      planned(
        "get_secret",
        { namespace: "production", name: "payment-token" },
        "untrusted_document"
      ),
      policy,
      token,
      1_001
    )
    assert.equal(decision.kind, "deny")
    assert.equal(decision.control, "allow-list")
  })

  it("denies kube-system even for reads", () => {
    const decision = evaluateToolCall(
      planned("list_pods", { namespace: "kube-system" }),
      policy,
      token,
      1_001
    )
    assert.equal(decision.kind, "deny")
    assert.equal(decision.control, "namespace-scope")
  })

  it("holds delete_pod for human approval", () => {
    const decision = evaluateToolCall(
      planned(
        "delete_pod",
        { namespace: "production", name: "web-store-6d2-x9" },
        "untrusted_document"
      ),
      policy,
      token,
      1_001
    )
    assert.equal(decision.kind, "pending")
    assert.equal(decision.control, "human-approval")
  })

  it("denies calls after emergency revocation", () => {
    const dead = { ...token, revoked: true }
    const decision = evaluateToolCall(
      planned("list_pods", { namespace: "production" }),
      policy,
      dead,
      1_001
    )
    assert.equal(decision.kind, "deny")
    assert.equal(decision.control, "revocation")
  })

  it("denies calls after the projected token expires", () => {
    const decision = evaluateToolCall(
      planned("list_pods", { namespace: "production" }),
      policy,
      token,
      token.expiresAt ?? 0
    )
    assert.equal(decision.kind, "deny")
    assert.equal(decision.control, "short-lived-token")
  })
})

describe("insecure Kubernetes agent", () => {
  it("lets a standing kubeconfig dump secrets", () => {
    const policy = getPolicy("insecure")
    const token = issueToken("insecure", 1_000)
    const decision = evaluateToolCall(
      planned("get_secret", {
        namespace: "production",
        name: "payment-token",
      }),
      policy,
      token,
      1_001
    )
    assert.equal(decision.kind, "allow")
    assert.equal(decision.control, "none")
  })
})
