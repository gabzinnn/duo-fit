"use client"

import dynamic from "next/dynamic"
import { useState, useMemo, useRef } from "react"

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

interface Grupo {
  inicio: Date
  fim: Date // último dia do período (pode ser futuro na semana/mês atual)
  usuario1: number
  usuario2: number
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/").map(Number)
  return new Date(year, month - 1, day)
}

// Agrupa TODO o histórico, inclusive dias/períodos zerados, para o eixo X ser contínuo.
// data já vem em ordem cronológica com todos os dias, então a ordem de inserção do Map basta.
function agruparPorEscala(data: ScoreChartProps["data"], escala: EscalaTempo): Grupo[] {
  const grupos = new Map<number, Grupo>()

  data.forEach((item) => {
    const date = parseDate(item.data)
    let inicio: Date
    let fim: Date

    if (escala === "dias") {
      inicio = fim = date
    } else if (escala === "semanas") {
      inicio = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay())
      fim = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6)
    } else {
      inicio = new Date(date.getFullYear(), date.getMonth(), 1)
      fim = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    }

    // SOMA os pontos (não média) para semanas/meses
    const chave = inicio.getTime()
    const grupo = grupos.get(chave) ?? { inicio, fim, usuario1: 0, usuario2: 0 }
    grupo.usuario1 += item.usuario1
    grupo.usuario2 += item.usuario2
    grupos.set(chave, grupo)
  })

  return Array.from(grupos.values())
}

const TAMANHO_JANELA: Record<EscalaTempo, number> = { dias: 14, semanas: 12, meses: 12 }

const escalas: { valor: EscalaTempo; label: string }[] = [
  { valor: "dias", label: "Dias" },
  { valor: "semanas", label: "Semanas" },
  { valor: "meses", label: "Meses" },
]

export function ScoreChart({
  data,
  usuario1Nome,
  usuario2Nome,
  usuario1Cor,
  usuario2Cor,
}: ScoreChartProps) {
  const [escala, setEscala] = useState<EscalaTempo>("dias")
  // Último dia visível; null = acompanha o presente. Guardar uma data (e não uma página)
  // mantém o mesmo trecho do histórico ao trocar de escala.
  const [ancora, setAncora] = useState<Date | null>(null)
  const arraste = useRef<{ x: number; fim: number } | null>(null)
  const rodaAcumulada = useRef(0)

  const grupos = useMemo(() => agruparPorEscala(data, escala), [data, escala])
  const hoje = data.length ? parseDate(data[data.length - 1].data) : new Date()

  const tamanho = Math.min(TAMANHO_JANELA[escala], grupos.length)
  const idxAncora = ancora ? grupos.findLastIndex((g) => g.inicio <= ancora) : grupos.length - 1
  const fim = Math.min(grupos.length, Math.max(tamanho, idxAncora + 1))
  const inicio = fim - tamanho
  const janela = useMemo(() => grupos.slice(inicio, fim), [grupos, inicio, fim])
  const noPresente = fim === grupos.length

  // Escala Y fixa por escala de tempo, para não "pular" enquanto desliza
  const maxY = useMemo(
    () => Math.max(1, ...grupos.map((g) => Math.max(g.usuario1, g.usuario2))),
    [grupos]
  )

  const irPara = (novoFim: number) => {
    const alvo = Math.min(grupos.length, Math.max(tamanho, novoFim))
    if (alvo === fim) return
    setAncora(alvo === grupos.length ? null : grupos[alvo - 1].fim)
  }

  const formatarDia = (d: Date) => {
    const base = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
    return d.getFullYear() === hoje.getFullYear() ? base : `${base}/${String(d.getFullYear()).slice(-2)}`
  }
  const rotulo = (g: Grupo) =>
    escala === "meses"
      ? `${MESES[g.inicio.getMonth()]}/${String(g.inicio.getFullYear()).slice(-2)}`
      : formatarDia(g.inicio)
  const parcial = (g: Grupo) => escala !== "dias" && g.fim > hoje

  const cor1 = usuario1Cor === "AMARELO" ? "#ffb900" : "#9333ea"
  const cor2 = usuario2Cor === "AMARELO" ? "#ffb900" : "#9333ea"

  const options: ApexCharts.ApexOptions = useMemo(() => ({
    chart: {
      id: "score-chart",
      type: "line",
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "Lexend, sans-serif",
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 300,
        // Sem animação ao deslizar, senão o gráfico "treme" a cada passo
        dynamicAnimation: { enabled: false },
      },
      redrawOnParentResize: true,
    },
    colors: [cor1, cor2],
    stroke: {
      curve: "smooth",
      width: 3,
    },
    markers: {
      size: 4,
      strokeWidth: 2,
      strokeColors: "#fff",
      hover: { size: 6 },
    },
    xaxis: {
      categories: janela.map(rotulo),
      labels: {
        hideOverlappingLabels: true,
        style: {
          colors: "#64748b",
          fontSize: "11px",
          fontWeight: 500,
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      max: maxY,
      forceNiceScale: true,
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
      padding: { left: 5, right: 15 },
    },
    legend: { show: false },
    tooltip: {
      theme: "light",
      shared: true,
      intersect: false,
      x: {
        formatter: (_, { dataPointIndex }) => {
          const g = janela[dataPointIndex]
          if (!g) return ""
          const label = escala === "semanas" ? `Semana de ${rotulo(g)}` : rotulo(g)
          return parcial(g) ? `${label} (parcial)` : label
        },
      },
      y: {
        formatter: (val) => `${val} pts`,
      },
    },
  }), [escala, janela, cor1, cor2, maxY])

  const series = useMemo(() => [
    {
      name: usuario1Nome,
      data: janela.map((d) => d.usuario1),
    },
    {
      name: usuario2Nome,
      data: janela.map((d) => d.usuario2),
    },
  ], [janela, usuario1Nome, usuario2Nome])

  if (!data.some((d) => d.usuario1 > 0 || d.usuario2 > 0)) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[340px]">
        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">
          trending_up
        </span>
        <p className="text-slate-500 text-sm">Nenhum dado de pontuação ainda</p>
      </div>
    )
  }

  const total1 = janela.reduce((s, d) => s + d.usuario1, 0)
  const total2 = janela.reduce((s, d) => s + d.usuario2, 0)
  const ultimo = janela[janela.length - 1]
  const rotuloIntervalo = janela.length
    ? escala === "meses"
      ? `${rotulo(janela[0])} – ${rotulo(ultimo)}`
      : `${formatarDia(janela[0].inicio)} – ${formatarDia(ultimo.fim > hoje ? hoje : ultimo.fim)}`
    : ""

  // Passo em px de um ponto do gráfico, para arrastar/rolar acompanhar o dedo
  const passo = (el: HTMLElement) => el.clientWidth / Math.max(1, tamanho)

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Evolução da Pontuação
          </h3>
          <p className="text-sm text-slate-500 flex items-center gap-1.5">
            Total no período:
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cor1 }} />
            <span className="font-semibold text-slate-700">{total1}</span>
            ×
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cor2 }} />
            <span className="font-semibold text-slate-700">{total2}</span>
            pts
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

      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        {/* Seletor de escala */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          {escalas.map((e) => (
            <button
              key={e.valor}
              onClick={() => setEscala(e.valor)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                escala === e.valor
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>

        {/* Navegação no tempo: setas pulam uma janela inteira */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => irPara(fim - tamanho)}
            disabled={inicio === 0}
            aria-label="Período anterior"
            className="p-2 rounded-md text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-default"
          >
            <span className="material-symbols-outlined text-xl leading-none">chevron_left</span>
          </button>
          <span className="text-xs font-medium text-slate-600 min-w-[110px] text-center">
            {rotuloIntervalo}
          </span>
          <button
            onClick={() => irPara(fim + tamanho)}
            disabled={noPresente}
            aria-label="Próximo período"
            className="p-2 rounded-md text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-default"
          >
            <span className="material-symbols-outlined text-xl leading-none">chevron_right</span>
          </button>
          {!noPresente && (
            <button
              onClick={() => setAncora(null)}
              className="ml-1 px-2 py-1 text-xs font-medium text-primary rounded-md hover:bg-slate-100 cursor-pointer"
            >
              Atual
            </button>
          )}
        </div>
      </div>

      {/* Arrastar (dedo/mouse) ou rolar na horizontal (trackpad) desliza um ponto por vez */}
      <div
        className="flex-1 w-full min-h-[280px] select-none touch-pan-y overscroll-x-contain cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return
          arraste.current = { x: e.clientX, fim }
        }}
        onPointerMove={(e) => {
          if (!arraste.current) return
          const delta = Math.round((arraste.current.x - e.clientX) / passo(e.currentTarget))
          irPara(arraste.current.fim + delta)
        }}
        onPointerUp={() => (arraste.current = null)}
        onPointerLeave={() => (arraste.current = null)}
        onPointerCancel={() => (arraste.current = null)}
        onWheel={(e) => {
          if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
          rodaAcumulada.current += e.deltaX
          const p = passo(e.currentTarget)
          const n = Math.trunc(rodaAcumulada.current / p)
          if (n) {
            rodaAcumulada.current -= n * p
            irPara(fim + n)
          }
        }}
      >
        <Chart
          options={options}
          series={series}
          type="line"
          height={270}
          width="100%"
        />
      </div>

      {grupos.length > tamanho && (
        <input
          type="range"
          min={tamanho}
          max={grupos.length}
          value={fim}
          onChange={(e) => irPara(Number(e.target.value))}
          aria-label="Deslizar pelo histórico"
          className="w-full mt-2 h-1.5 appearance-none rounded-full bg-slate-100 cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-300 [&::-webkit-slider-thumb]:hover:bg-slate-400
            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-slate-300"
        />
      )}
    </div>
  )
}
