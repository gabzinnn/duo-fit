"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Input, Button } from "@/app/components/ui"
import { createExercicio } from "@/app/actions/exercicios"
import type { TipoExercicio } from "@/generated/prisma/client"

interface ExerciseType {
  tipo: TipoExercicio
  label: string
  icon: string
}

const EXERCISE_TYPES: ExerciseType[] = [
  { tipo: "CARDIO", label: "Cardio", icon: "directions_run" },
  { tipo: "ACADEMIA", label: "Musculação", icon: "fitness_center" },
  { tipo: "OUTRO", label: "Outro", icon: "sports" },
]

interface AddExercicioFormProps {
  sequenciaAtual: number
}

export function AddExercicioForm({ sequenciaAtual }: AddExercicioFormProps) {
  const router = useRouter()
  const { usuario } = useAuth()
  const [isPending, startTransition] = useTransition()

  const [tipo, setTipo] = useState<TipoExercicio>("CARDIO")
  const [nome, setNome] = useState("")
  const [descricao, setDescricao] = useState("")
  const [duracao, setDuracao] = useState(30)
  const [error, setError] = useState("")

  // Calculate estimated points
  const calcularPontos = () => {
    if (tipo === "ACADEMIA") return 2
    if (tipo === "CARDIO") return Math.floor(duracao / 30)
    return 1
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!usuario) {
      setError("Você precisa estar logado")
      return
    }

    if (!nome.trim()) {
      setError("Digite o nome do exercício")
      return
    }

    if (duracao <= 0) {
      setError("A duração deve ser maior que 0")
      return
    }

    startTransition(async () => {
      try {
        await createExercicio({
          usuarioId: usuario.id,
          tipo,
          nome: nome.trim(),
          descricao: descricao.trim() || undefined,
          duracao,
        })
      } catch {
        setError("Erro ao salvar exercício")
        return
      }
      router.push("/exercicios")
    })
  }

  const addDuration = (mins: number) => {
    setDuracao((prev) => Math.max(0, prev + mins))
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-8 space-y-6">
          {/* Streak Badge */}
          {sequenciaAtual > 0 && (
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">
                local_fire_department
              </span>
              {sequenciaAtual} {sequenciaAtual === 1 ? "dia" : "dias"} de sequência
            </div>
          )}

          {/* Exercise Type Selection */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                category
              </span>
              Tipo de exercício
            </h3>
            <div className="flex gap-3 flex-wrap">
              {EXERCISE_TYPES.map((ex) => {
                const isActive = tipo === ex.tipo
                return (
                  <button
                    key={ex.tipo}
                    type="button"
                    onClick={() => setTipo(ex.tipo)}
                    className={[
                      "relative flex items-center gap-2 px-6 py-3 rounded-full transition-all cursor-pointer",
                      isActive
                        ? "bg-primary text-white shadow-lg shadow-primary/30 hover:scale-105"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    ].join(" ")}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {ex.icon}
                    </span>
                    <span className="font-medium">{ex.label}</span>
                    {isActive && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Details */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                edit_note
              </span>
              Detalhes da atividade
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">
                  Nome do exercício
                </label>
                <Input
                  placeholder="Ex: Corrida 5km, Treino A"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  leftIcon={
                    <span className="material-symbols-outlined">
                      fitness_center
                    </span>
                  }
                />
              </div>

              {/* Duração */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">
                  Duração (minutos)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={duracao}
                    onChange={(e) => setDuracao(Number(e.target.value))}
                    leftIcon={
                      <span className="material-symbols-outlined">schedule</span>
                    }
                    className="pr-24"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => addDuration(15)}
                      className="px-2 py-1 text-xs font-bold text-slate-500 bg-slate-200 rounded hover:bg-slate-300 transition-colors cursor-pointer"
                    >
                      +15
                    </button>
                    <button
                      type="button"
                      onClick={() => addDuration(30)}
                      className="px-2 py-1 text-xs font-bold text-slate-500 bg-slate-200 rounded hover:bg-slate-300 transition-colors cursor-pointer"
                    >
                      +30
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">
                Descrição (opcional)
              </label>
              <Input
                placeholder="Ex: Parque Ibirapuera, Treino de pernas"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                leftIcon={
                  <span className="material-symbols-outlined">description</span>
                }
              />
            </div>
          </div>
        </div>

        {/* Right Column: Points Preview (sticky) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
            {/* Top bar decoration */}
            <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-blue-400 to-primary" />

            <div className="p-8 flex flex-col items-center text-center">
              <div className="mb-2 inline-flex items-center justify-center p-3 rounded-full bg-blue-50 text-primary">
                <span className="material-symbols-outlined text-3xl">bolt</span>
              </div>
              <h4 className="text-slate-500 font-medium mb-1">
                Pontos estimados
              </h4>
              <div className="my-6">
                <span className="block text-6xl font-black text-slate-900 tracking-tighter leading-none">
                  {calcularPontos()}
                </span>
                <span className="text-primary font-bold text-sm uppercase tracking-widest">
                  Pontos
                </span>
              </div>

              {/* Breakdown */}
              <div className="w-full bg-slate-100 rounded-xl p-4 mb-6 text-left text-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-500">Tipo</span>
                  <span className="font-semibold">{tipo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Duração</span>
                  <span className="font-semibold">{duracao} min</span>
                </div>
                <div className="h-px bg-slate-200 my-3" />
                <p className="text-xs text-slate-400 italic text-center">
                  {tipo === "ACADEMIA"
                    ? "Musculação: 2 pontos por sessão"
                    : tipo === "CARDIO"
                      ? "Cardio: 1 ponto a cada 30 minutos"
                      : "Outro: 1 ponto por atividade"}
                </p>
              </div>

              {/* Error */}
              {error && (
                <p className="text-red-500 text-sm mb-4 animate-pulse">
                  {error}
                </p>
              )}

              {/* Submit */}
              <Button
                type="submit"
                fullWidth
                isLoading={isPending}
                leftIcon={
                  <span className="material-symbols-outlined">add_circle</span>
                }
              >
                Registrar Exercício
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
