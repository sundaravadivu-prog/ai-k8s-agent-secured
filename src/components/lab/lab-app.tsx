"use client"

import { useEffect } from "react"
import { LabProvider, useLab } from "@/lib/lab-store"
import { AgentConsole } from "./agent-console"
import { OpsSidebar } from "./ops-sidebar"
import { ReviewSidebar } from "./review-sidebar"
import { TopBar } from "./top-bar"

function LabClock() {
  const { setNow } = useLab()
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [setNow])
  return null
}

function LabLayout() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <LabClock />
      <TopBar />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[300px_minmax(0,1fr)_320px] xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        <OpsSidebar />
        <AgentConsole />
        <ReviewSidebar />
      </div>
    </div>
  )
}

export function LabApp() {
  return (
    <LabProvider>
      <LabLayout />
    </LabProvider>
  )
}
