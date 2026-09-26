import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "KubeBound — Kubernetes agent security lab",
  description:
    "The seven secure-AI-agent controls applied to a Kubernetes SRE agent: identity, allow-lists, short-lived tokens, human approval, trust labels, audit, and a kill switch.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#07080a] text-zinc-100">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  )
}
