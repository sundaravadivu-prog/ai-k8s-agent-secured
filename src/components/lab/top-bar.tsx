"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShieldAlert, RotateCcw, Skull } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLab } from "@/lib/lab-store"
import { remainingLabel } from "./format"

export function TopBar() {
  const pathname = usePathname()
  const { mode, setMode, token, now, kill, reset } = useLab()
  const remaining = remainingLabel(token.expiresAt, now)
  const dead = token.revoked || remaining === "expired"

  return (
    <header className="flex flex-col gap-3 border-b border-white/8 bg-[#0c0d10] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-teal-400/15 text-teal-300 ring-1 ring-teal-400/30">
            <ShieldAlert className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-tight">
              KubeBound
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Kubernetes agent security lab
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className={`rounded-md px-2 py-1 ${pathname === "/" ? "bg-white/8 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Lab
          </Link>
          <Link
            href="/controls"
            className={`rounded-md px-2 py-1 ${pathname === "/controls" ? "bg-white/8 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Controls
          </Link>
        </nav>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-white/5 p-0.5 ring-1 ring-white/10">
          <Button
            size="sm"
            variant={mode === "insecure" ? "default" : "ghost"}
            className={mode === "insecure" ? "bg-rose-500 text-white hover:bg-rose-500/90" : ""}
            onClick={() => setMode("insecure")}
          >
            Insecure
          </Button>
          <Button
            size="sm"
            variant={mode === "hardened" ? "default" : "ghost"}
            className={mode === "hardened" ? "bg-teal-500 text-black hover:bg-teal-400" : ""}
            onClick={() => setMode("hardened")}
          >
            Hardened
          </Button>
        </div>
        <span
          className={`rounded-md px-2 py-1 font-mono text-[11px] ring-1 ${
            dead
              ? "bg-rose-400/10 text-rose-300 ring-rose-400/20"
              : token.kind === "standing-kubeconfig"
                ? "bg-rose-400/10 text-rose-200 ring-rose-400/20"
                : "bg-teal-400/10 text-teal-200 ring-teal-400/20"
          }`}
        >
          {token.revoked
            ? "token revoked"
            : token.kind === "standing-kubeconfig"
              ? "standing kubeconfig"
              : `SA token ${remaining}`}
        </span>
        <Button size="sm" variant="outline" onClick={reset}>
          <RotateCcw data-icon="inline-start" />
          Reset
        </Button>
        <Button size="sm" variant="destructive" onClick={kill} disabled={token.revoked}>
          <Skull data-icon="inline-start" />
          Kill switch
        </Button>
      </div>
    </header>
  )
}
