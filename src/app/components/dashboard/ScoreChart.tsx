"use client"

import dynamic from "next/dynamic"
import { useState, useRef, useEffect, useMemo, useCallback } from "react"

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false })

type EscalaTempo = "dias" | "semanas" | "meses"

interface ScoreChartProps {
  data: {
    data: string // formato dd/mm/yyyy
    usuario1: number
    usuario2: number
  }[]
  usuario1Nome: string
  usuario2Nome: string
  usuario1Cor: string
  usuario2Cor: string
}

function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/").map(Number)
  return new Date(year, month - 1, day)
}

function agruparPorEscala(
  data: ScoreChartProps["data"],
  escala: EscalaTempo
): { data: string; usuario1: number; usuario2: number }[] {
  // Filtra dias sem pontos
  const comDados = data.filter(d => d.usuario1 > 0 || d.usuario2 > 0)
  
  if (comDados.length === 0) return []

  if (escala === "dias") {
    return comDados.slice(-30).map(item => {
      const date = parseDate(item.data)
      const dia = date.getDate().toString().padStart(2, "0")
      const mes = (date.getMonth() + 1).toString().padStart(2, "0")
      return {
        data: `${dia}/${mes}`,
        usuario1: item.usuario1,
        usuario2: item.usuario2,
      }
    })
  }

  const grupos = new Map<string, { 
    usuario1: number[]
    usuario2: number[]
    sortKey: number 
  }>()

  comDados.forEach((item) => {
    const date = parseDate(item.data)
    let chave: string
    let sortKey: number

    if (escala === "semanas") {
      const inicioSemana = new Date(date)
      inicioSemana.setDate(date.getDate() - date.getDay())
      const dia = inicioSemana.getDate().toString().padStart(2, "0")
      const mes = (inicioSemana.getMonth() + 1).toString().padStart(2, "0")
      chave = `Sem ${dia}/${mes}`
      sortKey = inicioSemana.getTime()
    } else {
      const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
      chave = `${meses[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`
      sortKey = new Date(date.getFullYear(), date.getMonth(), 1).getTime()
    }

    if (!grupos.has(chave)) {
      grupos.set(chave, { usuario1: [], usuario2: [], sortKey })
    }
    
    const grupo = grupos.get(chave)!
    if (item.usuario1 > 0) grupo.usuario1.push(item.usuario1)
    if (item.usuario2 > 0) grupo.usuario2.push(item.usuario2)
  })

  // SOMA os pontos (não média) para semanas/meses
  return Array.from(grupos.entries())
    .sort((a, b) => a[1].sortKey - b[1].sortKey)
    .map(([data, valores]) => ({
      data,
      usuario1: valores.usuario1.reduce((a, b) => a + b, 0),
      usuario2: valores.usuario2.reduce((a, b) => a + b, 0),
    }))
    .filter(d => d.usuario1 > 0 || d.usuario2 > 0)
}

export function ScoreChart({
  data,
  usuario1Nome,
  usuario2Nome,
  usuario1Cor,
  usuario2Cor,
}: ScoreChartProps) {
  const [escala, setEscala] = useState<EscalaTempo>("dias")
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const dadosAgrupados = useMemo(() => agruparPorEscala(data, escala), [data, escala])
  
  const cor1 = usuario1Cor === "AMARELO" ? "#ffb900" : "#9333ea"
  const cor2 = usuario2Cor === "AMARELO" ? "#ffb900" : "#9333ea"

  // Scroll para o final (dados mais recentes) quando muda escala ou dados
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [escala, dadosAgrupados.length])

  const handleEscalaChange = useCallback((novaEscala: EscalaTempo) => {
    setEscala(novaEscala)
  }, [])

  // Calcula largura baseada nos dados
  const chartWidth = Math.max(400, dadosAgrupados.length * 55)
  const needsScroll = dadosAgrupados.length > 8

  const options: ApexCharts.ApexOptions = useMemo(() => ({
    chart: {
      id: `score-chart-${escala}`,
      type: "line",
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "Lexend, sans-serif",
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 400,
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      },
      redrawOnParentResize: true,
    },
    colors: [cor1, cor2],
    stroke: {
      curve: "smooth",
      width: 3,
    },
    markers: {
      size: 5,
      strokeWidth: 2,
      strokeColors: "#fff",
      hover: { size: 7 },
    },
    xaxis: {
      categories: dadosAgrupados.map((d) => d.data),
      labels: {
        rotate: dadosAgrupados.length > 10 ? -45 : 0,
        rotateAlways: dadosAgrupados.length > 10,
        style: {
          colors: "#64748b",
          fontSize: "11px",
          fontWeight: 500,
        },
        offsetY: dadosAgrupados.length > 10 ? 5 : 0,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      labels: {
        style: {
          colors: "#94a3b8",
          fontSize: "12px",
        },
        formatter: (val) => Math.round(val).toString(),
      },
    },
    grid: {
      borderColor: "#e2e8f0",
      strokeDashArray: 4,
      padding: {
        left: 5,
        right: 15,
        bottom: dadosAgrupados.length > 10 ? 10 : 0,
      },
    },
    legend: { show: false },
    tooltip: {
      theme: "light",
      shared: true,
      intersect: false,
      y: {
        formatter: (val) => `${val} pts`,
      },
    },
  }), [escala, dadosAgrupados, cor1, cor2])

  const series = useMemo(() => [
    {
      name: usuario1Nome,
      data: dadosAgrupados.map((d) => d.usuario1),
    },
    {
      name: usuario2Nome,
      data: dadosAgrupados.map((d) => d.usuario2),
    },
  ], [dadosAgrupados, usuario1Nome, usuario2Nome])

  const escalas: { valor: EscalaTempo; label: string }[] = [
    { valor: "dias", label: "Dias" },
    { valor: "semanas", label: "Semanas" },
    { valor: "meses", label: "Meses" },
  ]

  if (dadosAgrupados.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[340px]">
        <span className="material-symbols-rounded text-4xl text-slate-300 mb-2">
          trending_up
        </span>
        <p className="text-slate-500 text-sm">Nenhum dado de pontuação ainda</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Evolução da Pontuação
          </h3>
          <p className="text-sm text-slate-500">
            {escala === "dias" && `Últimos ${dadosAgrupados.length} dias com atividade`}
            {escala === "semanas" && `${dadosAgrupados.length} semanas (total)`}
            {escala === "meses" && `${dadosAgrupados.length} meses (total)`}
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: cor1 }}
            />
            <span className="text-xs font-medium text-slate-600">
              {usuario1Nome}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: cor2 }}
            />
            <span className="text-xs font-medium text-slate-600">
              {usuario2Nome}
            </span>
          </div>
        </div>
      </div>

      {/* Seletor de escala */}
      <div className="flex gap-1 mb-4 p-1 bg-slate-100 rounded-lg w-fit">
        {escalas.map((e) => (
          <button
            key={e.valor}
            onClick={() => handleEscalaChange(e.valor)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              escala === e.valor
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* Container com scroll horizontal */}
      <div 
        ref={scrollRef}
        className="flex-1 w-full min-h-[280px] overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100"
      >
        <div style={{ width: needsScroll ? `${chartWidth}px` : "100%", height: "100%" }}>
          <Chart 
            key={`chart-${escala}`}
            options={options} 
            series={series} 
            type="line" 
            height={270} 
            width="100%"
          />
        </div>
      </div>

      {/* Indicador de scroll */}
      {needsScroll && (
        <p className="text-xs text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
          <span className="material-symbols-rounded text-sm">swipe</span>
          Arraste para ver histórico
        </p>
      )}
    </div>
  )
}