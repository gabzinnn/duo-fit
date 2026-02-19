"use client"

import { useMemo, useState, useTransition } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { CalendarDay } from "@/app/actions/calendar"

interface ActivityCalendarProps {
  title: string
  icon: string
  data: CalendarDay[]
  ano: number
  mes: number
  onMesChange?: (ano: number, mes: number) => Promise<CalendarDay[]>
}

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"]
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

export function ActivityCalendar({
  title,
  icon,
  data: initialData,
  ano: anoInicial,
  mes: mesInicial,
  onMesChange,
}: ActivityCalendarProps) {
  const [anoAtual, setAnoAtual] = useState(anoInicial)
  const [mesAtual, setMesAtual] = useState(mesInicial)
  const [data, setData] = useState(initialData)
  const [isPending, startTransition] = useTransition()

  // Mês corrente (limite máximo para navegação)
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

    // Não avançar além do mês corrente
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

  const diasDoMes = useMemo(() => {
    const primeiroDia = new Date(anoAtual, mesAtual - 1, 1)
    const ultimoDia = new Date(anoAtual, mesAtual, 0)
    const diasNoMes = ultimoDia.getDate()
    const primeiroDiaSemana = primeiroDia.getDay()

    const dias: (number | null)[] = []

    for (let i = 0; i < primeiroDiaSemana; i++) {
      dias.push(null)
    }

    for (let i = 1; i <= diasNoMes; i++) {
      dias.push(i)
    }

    return dias
  }, [anoAtual, mesAtual])

  const dataMap = useMemo(() => {
    const map = new Map<string, CalendarDay["usuarios"]>()
    for (const d of data) {
      map.set(d.date, d.usuarios)
    }
    return map
  }, [data])

  const getDayColors = (dia: number) => {
    const dateStr = `${anoAtual}-${String(mesAtual).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
    return dataMap.get(dateStr) ?? []
  }

  const renderDay = (dia: number | null, index: number) => {
    if (dia === null) {
      return <div key={`empty-${index}`} className="w-8 h-8" />
    }

    const usuarios = getDayColors(dia)
    const todayBrazil = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
    const dateStr = `${anoAtual}-${String(mesAtual).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
    const isToday = todayBrazil === dateStr

    let bgStyle: React.CSSProperties = {}
    let textColor = "text-slate-600"

    if (usuarios.length === 1) {
      const cor = usuarios[0].cor
      bgStyle.backgroundColor = cor === "AMARELO" ? "#fef3c7" : "#f3e8ff"
      textColor = cor === "AMARELO" ? "text-amber-700" : "text-purple-700"
    } else if (usuarios.length === 2) {
      bgStyle.background =
        "linear-gradient(135deg, #fef3c7 50%, #f3e8ff 50%)"
      textColor = "text-slate-700"
    }

    return (
      <div
        key={dia}
        className={[
          "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium",
          "transition-all hover:scale-110",
          isToday && usuarios.length === 0 ? "ring-2 ring-primary" : "",
          textColor,
        ].join(" ")}
        style={bgStyle}
      >
        {dia}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-900">{title}</h3>
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

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
          <span className="text-slate-500">JuuJ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-purple-100 border border-purple-200" />
          <span className="text-slate-500">GB</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded border border-slate-200"
            style={{
              background: "linear-gradient(135deg, #fef3c7 50%, #f3e8ff 50%)",
            }}
          />
          <span className="text-slate-500">Ambos</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={`grid grid-cols-7 gap-1 transition-opacity ${isPending ? "opacity-40" : ""}`}>
        {/* Week day headers */}
        {DIAS_SEMANA.map((dia, i) => (
          <div
            key={i}
            className="w-8 h-8 flex items-center justify-center text-xs font-medium text-slate-400"
          >
            {dia}
          </div>
        ))}

        {/* Days */}
        {diasDoMes.map((dia, i) => renderDay(dia, i))}
      </div>
    </div>
  )
}
