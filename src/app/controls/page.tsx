import Link from "next/link"
import { ShieldAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const CONTROLS = [
  {
    n: "1",
    title: "Dedicated agent identity",
    lab: "system:serviceaccount:agent-system:northwind-sre-agent — never the human's kubeconfig.",
    kubernetes: [
      "A ServiceAccount just for the agent, in its own namespace",
      "No reuse of a person's laptop kubeconfig or cluster-admin context",
      "Optional: IRSA / Workload Identity so the pod never holds a long-lived cloud key",
      "Every kubectl-equivalent call is attributable to that SA in the audit log",
    ],
  },
  {
    n: "2",
    title: "Tool allow-list and resource scope",
    lab: "Reads are allow-listed. Secrets and exec are denied. Only production and staging are in scope. kube-system is forbidden.",
    kubernetes: [
      "RBAC Role/RoleBinding, not ClusterRole/cluster-admin",
      "verbs: get/list/watch on pods and pods/log — not get on secrets",
      "ResourceNames or namespace bindings so the agent cannot touch every object",
      "Admission (ValidatingAdmissionPolicy / OPA / Kyverno) as a second gate on the API server",
      "NetworkPolicy so the agent pod can only reach the API server and approved tools",
    ],
  },
  {
    n: "3",
    title: "Short-lived scoped credentials",
    lab: "Projected ServiceAccount token, 15-minute TTL, listed scopes. Insecure mode uses a standing kubeconfig that never expires.",
    kubernetes: [
      "projectedServiceAccountToken with expirationSeconds",
      "Bound tokens (audience + time), not a copied secret from another namespace",
      "No kubeconfig files baked into the agent image or pasted into prompts",
      "Token request API if the agent must mint even narrower, per-task credentials",
    ],
  },
  {
    n: "4",
    title: "Human-in-the-loop for high-impact actions",
    lab: "delete_pod, scale_deployment, and apply_manifest wait for an on-call approver.",
    kubernetes: [
      "Treat apply, delete, scale, drain, exec, and secret reads as mutations",
      "A ticket or chat approval that records who signed, not a prompt that says \"be careful\"",
      "GitOps / PR for manifests instead of the agent applying YAML directly",
      "Two-person rule for production replica changes",
    ],
  },
  {
    n: "5",
    title: "Input trust labels",
    lab: "INC-4419 is labeled UNTRUSTED. Injected text can persuade the model; it cannot become authorization.",
    kubernetes: [
      "Jira, Slack, PagerDuty, wiki pages, and logs are data — never instructions",
      "Separate retrieved runbook text from the system prompt (structural, not just wording)",
      "Strip or quarantine \"ignore previous instructions\" blocks before they reach the planner",
      "If a tool argument originated in untrusted text, force HITL or deny",
    ],
  },
  {
    n: "6",
    title: "Complete tool-call logging",
    lab: "Every allow, deny, and approval stores actor, tool, args, source, and which control fired.",
    kubernetes: [
      "Kubernetes API audit policy on the verbs the agent may call",
      "Application log of the planned tool, the gateway decision, and the kube-apiserver result",
      "Ship both to the same SIEM so a SOC can join \"model wanted X\" with \"API accepted X\"",
      "Alert on denied secret reads and on any mutation whose source is untrusted",
    ],
  },
  {
    n: "7",
    title: "Emergency revocation",
    lab: "Kill switch marks the projected token revoked. Pending mutations are cancelled. Reset is the only way back.",
    kubernetes: [
      "Delete the token, rotate the SA, or remove the RoleBinding",
      "Scale the agent Deployment to 0",
      "NetworkPolicy deny-egress as a belt-and-suspenders cut",
      "Break-glass documented: who can kill, how long until a new token is issued",
    ],
  },
]

export default function ControlsPage() {
  return (
    <main className="min-h-svh bg-[#07080a]">
      <header className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-teal-400/15 text-teal-300 ring-1 ring-teal-400/30">
            <ShieldAlert className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-tight">
              KubeBound
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Control mapping
            </span>
          </span>
        </Link>
        <Link
          href="/"
          className="rounded-md bg-white/8 px-2 py-1 text-sm hover:bg-white/12"
        >
          Open the lab
        </Link>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10">
        <Badge variant="outline">From the Secure AI Agent brief</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          The same seven controls, on a Kubernetes agent
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Taimur Ijlal&apos;s project 3 is a support agent with tickets and an
          asset inventory. This lab is the SRE version: the tools talk to
          Kubernetes. The thesis does not change. The model can be hijacked.
          Authorization must live outside the model.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <section className="rounded-xl bg-[#12141a] p-4 ring-1 ring-rose-400/20">
            <p className="text-[11px] tracking-wide text-rose-200 uppercase">
              Before · insecure
            </p>
            <p className="mt-2 text-sm text-foreground/85">
              The agent uses the operator&apos;s cluster-admin kubeconfig. Every
              tool is available. A poisoned runbook is treated as an order.
              Secrets leak. Production pods disappear. No human is asked.
            </p>
          </section>
          <section className="rounded-xl bg-[#12141a] p-4 ring-1 ring-teal-400/20">
            <p className="text-[11px] tracking-wide text-teal-200 uppercase">
              After · hardened
            </p>
            <p className="mt-2 text-sm text-foreground/85">
              The same injection still fools the planner. The gateway denies
              get_secret, refuses kube-system, and parks delete_pod for a
              human. The screenshot you want: model fooled, cluster untouched.
            </p>
          </section>
        </div>

        <ol className="mt-10 space-y-6">
          {CONTROLS.map((control) => (
            <li
              key={control.n}
              className="rounded-xl bg-[#12141a] p-5 ring-1 ring-white/8"
            >
              <p className="text-[11px] tracking-wide text-teal-300/80 uppercase">
                Control {control.n}
              </p>
              <h2 className="mt-1 text-lg font-medium">{control.title}</h2>
              <p className="mt-2 text-sm text-foreground/85">{control.lab}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {control.kubernetes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <section className="mt-10 rounded-xl bg-[#12141a] p-5 ring-1 ring-white/8">
          <h2 className="text-lg font-medium">What this lab does not do</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            It does not talk to a real cluster or a paid model. The planner is
            deterministic so the injection demo is reliable. Wire the same
            gateway in front of your real Kubernetes agent — LangGraph, the
            OpenAI Agents SDK, kubectl-mcp, or a custom reconcilers — and keep
            the kube-apiserver as the last word.
          </p>
        </section>
      </div>
    </main>
  )
}
