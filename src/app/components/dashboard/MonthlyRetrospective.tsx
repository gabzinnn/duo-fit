"use client"

import { useState, useTransition } from "react"
import {
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  Dumbbell,
  Timer,
  Trophy,
  Star,
} from "lucide-react"
import type { RetrospectivaMensal } from "@/app/actions/retrospectiva"

interface MonthlyRetrospectiveProps {
  data: RetrospectivaMensal
  ano: number
  mes: number
  onMesChange?: (ano: number, mes: number) => Promise<RetrospectivaMensal>
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

const COR_STYLES: Record<string, { bg: string; bar: string; text: string; border: string }> = {
  AMARELO: {
    bg: "bg-amber-50",
    bar: "bg-amber-400",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  ROXO: {
    bg: "bg-purple-50",
    bar: "bg-purple-500",
    text: "text-purple-700",
    border: "border-purple-200",
  },
}

function formatarTempo(minutos: number): string {
  if (minutos < 60) return `${minutos}min`
  const horas = Math.floor(minutos / 60)
  const mins = minutos % 60
  return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`
}

function ProgressBar({
  valor,
  total,
  corClass,
}: {
  valor: number
  total: number
  corClass: string
}) {
  const pct = total > 0 ? Math.min((valor / total) * 100, 100) : 0

  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${corClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function MonthlyRetrospective({
  data: initialData,
  ano: anoInicial,
  mes: mesInicial,
  onMesChange,
}: MonthlyRetrospectiveProps) {
  const [anoAtual, setAnoAtual] = useState(anoInicial)
  const [mesAtual, setMesAtual] = useState(mesInicial)
  const [data, setData] = useState(initialData)
  const [isPending, startTransition] = useTransition()

  const hoje = new Date()
  const mesCorrAno = hoje.getFullYear()
  const mesCorrMes = hoje.getMonth() + 1
  const isNoMesAtual = anoAtual === mesCorrAno && mesAtual === mesCorrMes

  const navegarMes = (direcao: -1 | 1) => {
    let novoMes = mesAtual + direcao
    let novoAno = anoAtual

    if (novoMes < 1) {
      novoMes = 12
      novoAno -= 1
    } else if (novoMes > 12) {
      novoMes = 1
      novoAno += 1
    }

    if (novoAno > mesCorrAno || (novoAno === mesCorrAno && novoMes > mesCorrMes)) {
      return
    }

    setAnoAtual(novoAno)
    setMesAtual(novoMes)

    if (onMesChange) {
      startTransition(async () => {
        const novosDados = await onMesChange(novoAno, novoMes)
        setData(novosDados)
      })
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Trophy size={20} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-900">Retrospectiva</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navegarMes(-1)}
              disabled={isPending}
              className="p-0.5 rounded-md hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700 disabled:opacity-40"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-xs text-slate-500 min-w-[110px] text-center font-medium">
              {isPending ? "..." : `${MESES[mesAtual - 1]} ${anoAtual}`}
            </p>
            <button
              onClick={() => navegarMes(1)}
              disabled={isPending || isNoMesAtual}
              className="p-0.5 rounded-md hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700 disabled:opacity-20"
              aria-label="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* User Cards */}
      <div
        className={`flex flex-col gap-5 transition-opacity ${isPending ? "opacity-40" : ""}`}
      >
        {data.usuarios.map((usuario) => {
          const style = COR_STYLES[usuario.cor] ?? COR_STYLES.AMARELO

          return (
            <div
              key={usuario.id}
              className={`rounded-xl border p-4 ${style.bg} ${style.border}`}
            >
              {/* User name */}
              <p className={`text-sm font-bold mb-3 ${style.text}`}>
                {usuario.nome}
              </p>

              {/* Stats grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Dias na dieta */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed size={14} className={style.text} />
                    <span className="text-xs text-slate-600">Dias na dieta</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${style.text}`}>
                      {usuario.diasNaDieta}
                    </span>
                    <span className="text-xs text-slate-400">
                      / {data.totalDiasNoMes} dias
                    </span>
                  </div>
                  <ProgressBar
                    valor={usuario.diasNaDieta}
                    total={data.totalDiasNoMes}
                    corClass={style.bar}
                  />
                </div>

                {/* Dias treinados */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Dumbbell size={14} className={style.text} />
                    <span className="text-xs text-slate-600">Dias treinados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${style.text}`}>
                      {usuario.diasTreinados}
                    </span>
                    <span className="text-xs text-slate-400">
                      / {data.totalDiasNoMes} dias
                    </span>
                  </div>
                  <ProgressBar
                    valor={usuario.diasTreinados}
                    total={data.totalDiasNoMes}
                    corClass={style.bar}
                  />
                </div>

                {/* Tempo de exercício */}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center">
                    <Timer size={16} className={style.text} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Tempo total</p>
                    <p className={`text-sm font-bold ${style.text}`}>
                      {formatarTempo(usuario.tempoExercicio)}
                    </p>
                  </div>
                </div>

                {/* Sessões */}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center">
                    <Star size={16} className={style.text} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Sessões / Pontos</p>
                    <p className={`text-sm font-bold ${style.text}`}>
                      {usuario.totalSessoes} sessões · {usuario.pontosTotais} pts
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
