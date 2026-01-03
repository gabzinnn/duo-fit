"use client"

import Link from "next/link"
import { AddExercicioForm } from "./AddExercicioForm"

interface AddExercicioContentProps {
  sequenciaAtual: number
}

export function AddExercicioContent({
  sequenciaAtual,
}: AddExercicioContentProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-6">
        <div className="flex items-center gap-4">
          <Link
            href="/exercicios"
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-500">
              arrow_back
            </span>
          </Link>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Adicionar Exercício
            </h2>
            <p className="text-slate-500 text-sm">
              Registre sua atividade e ganhe pontos!
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <AddExercicioForm sequenciaAtual={sequenciaAtual} />
        </div>
      </div>
    </div>
  )
}
