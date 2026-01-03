"use client"

import { useState } from "react"
import Link from "next/link"
import { Input, Button } from "../ui"
import { ExerciciosTable } from "./ExerciciosTable"
import type { ExercicioData } from "@/app/actions/exercicios"

interface ExerciciosContentProps {
  exercicios: ExercicioData[]
}

export function ExerciciosContent({ exercicios }: ExerciciosContentProps) {
  const [filterText, setFilterText] = useState("")

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Exercícios
            </h2>
            <p className="text-slate-500 text-sm">
              Acompanhe o histórico de atividades físicas da dupla.
            </p>
          </div>
          <Link href="/exercicios/adicionar">
            <Button
              size="md"
              leftIcon={
                <span className="material-symbols-outlined text-xl">add</span>
              }
            >
              Adicionar exercício
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Input
                placeholder="Buscar exercício..."
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
                Mostrando <strong>{exercicios.length}</strong> registros
              </span>
            </div>
          </div>

          {/* Table */}
          <ExerciciosTable data={exercicios} filterText={filterText} />
        </div>
      </div>
    </div>
  )
}
