import type { DecisionKind, ToolName } from "@/lib/types"

export function formatArgs(args: Record<string, string>) {
  return Object.entries(args)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ")
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function remainingLabel(expiresAt: number | null, now: number) {
  if (expiresAt === null) return "never"
  const ms = expiresAt - now
  if (ms <= 0) return "expired"
  const total = Math.floor(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = String(total % 60).padStart(2, "0")
  return `${minutes}:${seconds}`
}

export function decisionClass(kind: DecisionKind) {
  if (kind === "allow") return "text-emerald-400 bg-emerald-400/10 ring-emerald-400/20"
  if (kind === "deny") return "text-rose-400 bg-rose-400/10 ring-rose-400/20"
  return "text-amber-300 bg-amber-400/10 ring-amber-400/20"
}

export function toolLabel(tool: ToolName) {
  return tool.replaceAll("_", " ")
}
