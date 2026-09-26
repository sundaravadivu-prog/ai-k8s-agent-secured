"use client"

import { Button } from "@/components/ui/button"
import { useLab } from "@/lib/lab-store"
import { decisionClass, formatArgs, formatTime, toolLabel } from "./format"

export function ReviewSidebar() {
  const { approvals, audit, resolveApproval, policy } = useLab()
  const pending = approvals.filter((item) => item.status === "pending")

  return (
    <aside className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto">
      <section className="rounded-xl bg-[#12141a] p-4 ring-1 ring-white/8">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          4 · Human-in-the-loop
        </p>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No pending cluster mutations. High-impact tools wait here in
            hardened mode.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((item) => (
              <li
                key={item.id}
                className="rounded-lg bg-amber-400/8 p-3 ring-1 ring-amber-400/20"
              >
                <p className="font-mono text-[11px]">
                  {toolLabel(item.call.tool)} {formatArgs(item.call.args)}
                </p>
                <p className="mt-1 text-xs text-amber-100/80">{item.reason}</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => resolveApproval(item.id, "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveApproval(item.id, "denied")}
                  >
                    Deny
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="min-h-0 flex-1 rounded-xl bg-[#12141a] p-4 ring-1 ring-white/8">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            6 · Tool-call log
          </p>
          <span className="text-[10px] text-muted-foreground">
            {policy.auditComplete ? "complete" : "partial / insecure"}
          </span>
        </div>
        {audit.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Empty. Every allow, deny, and approval will land here with actor,
            tool, args, and the control that fired.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {audit.map((event) => (
              <li key={event.id} className="border-b border-white/6 pb-2 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px]">
                    {toolLabel(event.tool)}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ring-1 ${decisionClass(event.decision)}`}
                  >
                    {event.decision}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {formatTime(event.ts)} · {event.actor}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-foreground/70">
                  {formatArgs(event.args)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {event.control !== "none" ? `${event.control}: ` : ""}
                  {event.reason}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  )
}
