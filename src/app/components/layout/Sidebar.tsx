"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/AuthContext"

interface NavItem {
  href: string
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { href: "/home", label: "Home", icon: "dashboard" },
  { href: "/exercicios", label: "Exercícios", icon: "fitness_center" },
  { href: "/alimentacao", label: "Alimentação", icon: "restaurant_menu" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { usuario, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => pathname === href

  const SidebarContent = () => (
    <>
      {/* User Summary */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full bg-cover bg-center border-4 border-primary/20 shadow-lg"
            style={{
              backgroundImage: usuario?.avatar
                ? `url('${usuario.avatar}')`
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            {!usuario?.avatar && (
              <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold rounded-full">
                {usuario?.nome?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 text-lg">
              {usuario?.nome ?? "Usuário"}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              DuoFit Challenge
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 flex flex-col gap-2 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={[
                "flex items-center gap-3 px-4 py-3 rounded-full transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-slate-500 hover:bg-slate-50",
              ].join(" ")}
            >
              <span
                className={`material-symbols-outlined ${active ? "icon-filled" : ""}`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-full text-slate-500 hover:bg-slate-50 transition-colors w-full cursor-pointer"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Sair</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-blue-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <span className="material-symbols-outlined icon-filled text-xl">
              fitness_center
            </span>
          </div>
          <span className="font-bold text-lg text-slate-900">DuoFit</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl">
            {mobileOpen ? "close" : "menu"}
          </span>
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={[
          "lg:hidden fixed top-16 left-0 bottom-0 w-72 bg-white z-40 flex flex-col",
          "transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-slate-100 bg-white h-full shrink-0">
        {/* Logo */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-blue-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <span className="material-symbols-outlined icon-filled">
              fitness_center
            </span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              DuoFit
            </h1>
          </div>
        </div>
        <SidebarContent />
      </aside>
    </>
  )
}
