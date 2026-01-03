"use client"

import { useMemo } from "react"

interface CalendarDay {
  date: string
  usuarios: {
    usuarioId: number
    cor: string
  }[]
}

interface ActivityCalendarProps {
  title: string
  icon: string
  data: CalendarDay[]
  ano: number
  mes: number
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
  data,
  ano,
  mes,
}: ActivityCalendarProps) {
  const diasDoMes = useMemo(() => {
    const primeiroDia = new Date(ano, mes - 1, 1)
    const ultimoDia = new Date(ano, mes, 0)
    const diasNoMes = ultimoDia.getDate()
    const primeiroDiaSemana = primeiroDia.getDay()

    const dias: (number | null)[] = []

    // Add empty slots for days before the first day
    for (let i = 0; i < primeiroDiaSemana; i++) {
      dias.push(null)
    }

    // Add days of the month
    for (let i = 1; i <= diasNoMes; i++) {
      dias.push(i)
    }

    return dias
  }, [ano, mes])

  const dataMap = useMemo(() => {
    const map = new Map<string, CalendarDay["usuarios"]>()
    for (const d of data) {
      map.set(d.date, d.usuarios)
    }
    return map
  }, [data])

  const getDayColors = (dia: number) => {
    const dateStr = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
    return dataMap.get(dateStr) ?? []
  }

  const renderDay = (dia: number | null, index: number) => {
    if (dia === null) {
      return <div key={`empty-${index}`} className="w-8 h-8" />
    }

    const usuarios = getDayColors(dia)
    const isToday =
      new Date().toISOString().split("T")[0] ===
      `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`

    // Determine background style
    let bgStyle: React.CSSProperties = {}
    let textColor = "text-slate-600"

    if (usuarios.length === 1) {
      // Single user - solid color
      const cor = usuarios[0].cor
      bgStyle.backgroundColor = cor === "AMARELO" ? "#fef3c7" : "#f3e8ff"
      textColor = cor === "AMARELO" ? "text-amber-700" : "text-purple-700"
    } else if (usuarios.length === 2) {
      // Both users - split gradient
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
        <div>
          <h3 className="font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">
            {MESES[mes - 1]} {ano}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
          <span className="text-slate-500">Amarelo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-purple-100 border border-purple-200" />
          <span className="text-slate-500">Roxo</span>
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
      <div className="grid grid-cols-7 gap-1">
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
