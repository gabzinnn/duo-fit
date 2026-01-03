"use client"

import { ReactNode } from "react"
import { Sidebar } from "./Sidebar"

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden lg:pt-0 pt-16">
        {children}
      </main>
    </div>
  )
}
