"use client"

import { Badge } from "@/components/ui/badge"
import { livePods, namespacesIn } from "@/lib/cluster"
import { ALL_TOOLS, toolStance } from "@/lib/policy"
import { useLab } from "@/lib/lab-store"

function phaseClass(phase: string) {
  if (phase === "Running") return "text-emerald-300"
  if (phase === "CrashLoopBackOff") return "text-amber-300"
  if (phase === "Deleted") return "text-rose-300 line-through"
  return "text-muted-foreground"
}

export function OpsSidebar() {
  const { cluster, policy, token, mode } = useLab()
  const pods = livePods(cluster)
  const namespaces = namespacesIn(cluster)

  return (
    <aside className="order-2 flex min-h-0 flex-col gap-3 lg:order-1 lg:overflow-y-auto">
      <section className="rounded-xl bg-[#12141a] p-4 ring-1 ring-white/8">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          1 · Agent identity
        </p>
        <h2 className="mt-1 font-medium">
          {mode === "insecure" ? "User impersonation" : "Dedicated ServiceAccount"}
        </h2>
        <p className="mt-2 font-mono text-[11px] break-all text-teal-200/90">
          {policy.agentId}
        </p>
        <dl className="mt-3 space-y-1.5 text-xs text-muted-foreground">
          <div className="flex justify-between gap-3">
            <dt>RBAC</dt>
            <dd className="text-right text-foreground/80">{policy.rbac}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Credential</dt>
            <dd className="text-right text-foreground/80">
              {token.kind === "standing-kubeconfig"
                ? "laptop kubeconfig, no expiry"
                : "projected token, 15 min"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Namespaces</dt>
            <dd className="text-right text-foreground/80">
              {policy.allowedNamespaces === "*"
                ? "all, including kube-system"
                : policy.allowedNamespaces.join(", ")}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl bg-[#12141a] p-4 ring-1 ring-white/8">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Cluster · Northwind
          </p>
          <Badge variant="outline">{pods.length} live</Badge>
        </div>
        <div className="mt-3 space-y-3">
          {namespaces.map((namespace) => {
            const rows = cluster.pods.filter((pod) => pod.namespace === namespace)
            const denied = policy.deniedNamespaces.includes(namespace)
            return (
              <div key={namespace}>
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-[11px] text-foreground/80">
                    {namespace}
                  </span>
                  {denied ? (
                    <Badge variant="destructive">out of scope</Badge>
                  ) : null}
                </div>
                <ul className="space-y-1">
                  {rows.map((pod) => (
                    <li
                      key={pod.name}
                      className="flex items-center justify-between gap-2 font-mono text-[11px]"
                    >
                      <span className="truncate">{pod.name}</span>
                      <span className={phaseClass(pod.phase)}>{pod.phase}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
        <div className="mt-3 border-t border-white/8 pt-3">
          <p className="mb-1 text-[11px] text-muted-foreground">Secrets (restricted)</p>
          <ul className="space-y-1 font-mono text-[11px] text-rose-200/80">
            {cluster.secrets.map((secret) => (
              <li key={`${secret.namespace}/${secret.name}`}>
                {secret.namespace}/{secret.name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-xl bg-[#12141a] p-4 ring-1 ring-white/8">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          2 · Tool allow-list
        </p>
        <ul className="mt-3 space-y-1.5">
          {ALL_TOOLS.map((tool) => {
            const stance = toolStance(policy, tool)
            return (
              <li
                key={tool}
                className="flex items-center justify-between gap-2 font-mono text-[11px]"
              >
                <span>{tool}</span>
                <span
                  className={
                    stance === "allow"
                      ? "text-emerald-300"
                      : stance === "hitl"
                        ? "text-amber-300"
                        : "text-rose-300"
                  }
                >
                  {stance === "allow" ? "allow" : stance === "hitl" ? "HITL" : "deny"}
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </aside>
  )
}
