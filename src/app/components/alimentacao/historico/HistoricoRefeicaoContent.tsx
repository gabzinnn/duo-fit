"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Input, Button } from "@/app/components/ui"
import { HistoricoRefeicaoTable } from "./HistoricoRefeicaoTable"
import type { RefeicaoHistorico } from "@/app/actions/alimentacao"

interface HistoricoRefeicaoContentProps {
  refeicoes: RefeicaoHistorico[]
  diasInvalidos: string[]
}

type UserFilter = "todos" | number

export function HistoricoRefeicaoContent({ refeicoes, diasInvalidos }: HistoricoRefeicaoContentProps) {
  const [filterText, setFilterText] = useState("")
  const [userFilter, setUserFilter] = useState<UserFilter>("todos")

  // Get unique users from the data
  const usuarios = useMemo(() => {
    const map = new Map<number, { id: number; nome: string; cor: string }>()
    for (const r of refeicoes) {
      if (!map.has(r.usuarioId)) {
        map.set(r.usuarioId, { id: r.usuarioId, nome: r.nomeUsuario, cor: r.corUsuario })
      }
    }
    return Array.from(map.values())
  }, [refeicoes])

  // Filter by user
  const refeicoesFiltered = useMemo(() => {
    if (userFilter === "todos") return refeicoes
    return refeicoes.filter((r) => r.usuarioId === userFilter)
  }, [refeicoes, userFilter])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Link
              href="/alimentacao"
              className="flex items-center gap-2 text-slate-400 text-sm mb-1 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Voltar ao Diário
            </Link>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Histórico de Refeições
            </h2>
            <p className="text-slate-500 text-sm">
              Visualize todas as refeições registradas pela dupla.
            </p>
          </div>
          <Link href="/alimentacao/adicionar">
            <Button
              size="md"
              leftIcon={
                <span className="material-symbols-outlined text-xl">add</span>
              }
            >
              Adicionar Refeição
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {/* User filter buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setUserFilter("todos")}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer ${
                    userFilter === "todos"
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Todos
                </button>
                {usuarios.map((u) => {
                  const isActive = userFilter === u.id
                  const isAmarelo = u.cor === "AMARELO"
                  const activeClass = isAmarelo
                    ? "bg-amber-500 text-white"
                    : "bg-purple-500 text-white"
                  const inactiveClass = isAmarelo
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    : "bg-purple-100 text-purple-700 hover:bg-purple-200"

                  return (
                    <button
                      key={u.id}
                      onClick={() => setUserFilter(u.id)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer ${
                        isActive ? activeClass : inactiveClass
                      }`}
                    >
                      {u.nome.split(" ")[0]}
                    </button>
                  )
                })}
              </div>

              {/* Search input */}
              <Input
                placeholder="Buscar refeição..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                containerClassName="w-full sm:w-64"
                leftIcon={
                  <span className="material-symbols-outlined text-xl">
                    search
                  </span>
                }
              />
            </div>
            <div className="text-sm text-slate-500">
              <span>
                Mostrando <strong>{refeicoesFiltered.length}</strong> de {refeicoes.length} registros
              </span>
            </div>
          </div>

          {/* Table */}
          <HistoricoRefeicaoTable data={refeicoesFiltered} filterText={filterText} diasInvalidos={diasInvalidos} />
        </div>
      </div>
    </div>
  )
}
