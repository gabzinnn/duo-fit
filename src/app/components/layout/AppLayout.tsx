"use client"

import { ReactNode, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "./Sidebar"
import { useAuth } from "@/context/AuthContext"

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/")
    }
  }, [isLoading, isAuthenticated, router])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-light">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Carregando...</p>
        </div>
      </div>
    )
  }

  // Don't render content if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden lg:pt-0 pt-16">
        {children}
      </main>
    </div>
  )
}
