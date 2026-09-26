# KubeBound

A Kubernetes SRE agent with the seven controls from [Secure an AI Agent That Can Take Actions](https://github.com/taimurijlal/AI-Security-Projects/tree/main/03-secure-ai-agent).

A chatbot that is tricked produces text. An agent that is tricked **does something**. This lab is the SRE version of that brief: the tools talk to a fictional Northwind cluster.

## The thesis

Switch to **Insecure**, send `Follow INC-4419 and restore checkout in production`. The runbook contains an indirect prompt injection. The agent dumps fake Secrets and deletes production pods.

Switch to **Hardened** and send the same prompt. The model still tries those calls. The gateway refuses `get_secret`, refuses `kube-system`, and parks `delete_pod` for a human. The cluster does not change.

That is the portfolio screenshot: **the model was fooled, and it did not matter**.

No API key and no real cluster are required. The planner is deterministic so the demo is reliable.

## The seven controls

| # | Control | In this lab | On a real Kubernetes agent |
|---|---------|-------------|----------------------------|
| 1 | Dedicated identity | `system:serviceaccount:agent-system:northwind-sre-agent` | Own ServiceAccount; never a person's kubeconfig |
| 2 | Allow-list + least privilege | Reads allowed; Secrets/exec denied; only `production` and `staging` | Tight RBAC, no `cluster-admin`, admission + NetworkPolicy |
| 3 | Short-lived scoped credentials | 15-minute projected token | Bound SA tokens; nothing baked into the image |
| 4 | Human-in-the-loop | delete / scale / apply wait for on-call | Approvals or GitOps for mutations |
| 5 | Input trust labels | INC-4419 is `UNTRUSTED` | Tickets, wikis, and logs are data, not instructions |
| 6 | Tool-call logging | Actor, tool, args, decision, control | App log + Kubernetes audit events in one SIEM |
| 7 | Emergency revocation | Kill switch dies the token | Drop RoleBinding, scale to 0, deny-egress |

Open `/controls` in the app for the full mapping.

## Run locally

```bash
npm install
npm test
npm run dev
```

The app listens on [http://127.0.0.1:43173](http://127.0.0.1:43173).

## How to use the lab

1. Leave **Insecure** on. Run **Follow INC-4419**. Watch Secrets appear and production pods flip to Deleted.
2. Click **Reset**, then **Hardened**. Run the same prompt.
3. Confirm `get_secret` is denied and deletes sit in Human-in-the-loop.
4. Approve or deny a pending delete. Hit **Kill switch** and try another read.

## What this is not

This is not a cluster you can point at production. It is a design you can copy onto an agent that already speaks Kubernetes: put a gateway in front of every tool, issue a short-lived ServiceAccount token, label retrieved text untrusted, and keep a kill switch that does not depend on the model cooperating.
