"use client"

import { useState } from "react"
import type { DiaHistorico } from "@/app/actions/alimentacao"

interface WeeklyHistoryChartProps {
  data: DiaHistorico[]
  usuarioNome: string
  rivalNome: string
}

export function WeeklyHistoryChart({
  data,
  usuarioNome,
  rivalNome,
}: WeeklyHistoryChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  return (
    <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-slate-100 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg lg:text-xl font-bold text-slate-900">
            Histórico Semanal
          </h3>
          <p className="text-slate-500 text-sm">Comparativo com sua meta</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs font-bold text-slate-600">{usuarioNome}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-xs font-bold text-slate-600">{rivalNome}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 flex items-end justify-between gap-2 lg:gap-4 h-48 px-2">
        {data.map((dia, index) => (
          <BarItem
            key={index}
            index={index}
            diaSemana={dia.diaSemana}
            usuario={dia.usuario}
            rival={dia.rival}
            isHoje={dia.isHoje}
            isFuturo={dia.isFuturo}
            isSelected={selectedIndex === index}
            onSelect={() => setSelectedIndex(selectedIndex === index ? null : index)}
            usuarioNome={usuarioNome}
            rivalNome={rivalNome}
          />
        ))}
      </div>
    </div>
  )
}

interface BarItemProps {
  index: number
  diaSemana: string
  usuario: number
  rival: number
  isHoje: boolean
  isFuturo: boolean
  isSelected: boolean
  onSelect: () => void
  usuarioNome: string
  rivalNome: string
}

function BarItem({
  diaSemana,
  usuario,
  rival,
  isHoje,
  isFuturo,
  isSelected,
  onSelect,
  usuarioNome,
  rivalNome,
}: BarItemProps) {
  return (
    <div
      className={`
        flex flex-col items-center gap-2 w-full h-full justify-end 
        group cursor-pointer relative
        ${isFuturo ? "opacity-30" : ""}
      `}
      onClick={onSelect}
    >
      {/* Tooltip */}
      {isSelected && !isFuturo && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-2 rounded-lg shadow-lg z-10 min-w-max">
          <div className="text-xs font-medium space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{usuarioNome}: {usuario}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span>{rivalNome}: {rival}%</span>
            </div>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-slate-900 rotate-45" />
        </div>
      )}

      <div className="w-full max-w-[40px] flex items-end justify-center h-[80%] gap-1 relative">
        <div
          className={`
            w-3 rounded-full group-hover:opacity-80 transition-all duration-300
            ${isFuturo ? "bg-slate-200" : "bg-amber-400"}
            ${isSelected && !isFuturo ? "ring-2 ring-amber-600" : ""}
          `}
          style={{ height: `${Math.min(Math.max(isFuturo ? 10 : usuario, 5), 100)}%` }}
        />
        <div
          className={`
            w-3 rounded-full group-hover:opacity-80 transition-all duration-300
            ${isFuturo ? "bg-slate-200" : "bg-purple-500"}
            ${isSelected && !isFuturo ? "ring-2 ring-purple-700" : ""}
          `}
          style={{ height: `${Math.min(Math.max(isFuturo ? 10 : rival, 5), 100)}%` }}
        />
      </div>
      <span
        className={`
          text-xs font-medium text-slate-500
          ${isHoje ? "font-bold text-primary" : ""}
        `}
      >
        {isHoje ? "Hoje" : diaSemana}
      </span>
    </div>
  )
}
