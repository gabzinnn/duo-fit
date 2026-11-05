"use client"

import dynamic from "next/dynamic"
import { useState, useMemo } from "react"

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

// Agrupa TODO o histórico, inclusive dias/períodos zerados, para o eixo X ser contínuo.
// data já vem em ordem cronológica com todos os dias, então a ordem de inserção do Map basta.
function agruparPorEscala(
  data: ScoreChartProps["data"],
  escala: EscalaTempo
): { data: string; usuario1: number; usuario2: number }[] {
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  const grupos = new Map<string, { usuario1: number; usuario2: number }>()

  data.forEach((item) => {
    const date = parseDate(item.data)
    let chave: string

    if (escala === "dias") {
      chave = item.data
    } else if (escala === "semanas") {
      const inicioSemana = new Date(date)
      inicioSemana.setDate(date.getDate() - date.getDay())
      const dia = inicioSemana.getDate().toString().padStart(2, "0")
      const mes = (inicioSemana.getMonth() + 1).toString().padStart(2, "0")
      chave = `${dia}/${mes}/${inicioSemana.getFullYear()}`
    } else {
      chave = `${meses[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`
    }

    // SOMA os pontos (não média) para semanas/meses
    const grupo = grupos.get(chave) ?? { usuario1: 0, usuario2: 0 }
    grupo.usuario1 += item.usuario1
    grupo.usuario2 += item.usuario2
    grupos.set(chave, grupo)
  })

  return Array.from(grupos, ([data, v]) => ({ data, ...v }))
}

// Chaves de dias/semanas levam o ano (evita colisão); só exibimos dd/mm
const rotulo = (chave: string) => chave.length === 10 ? chave.slice(0, 5) : chave

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
  // 0 = janela mais recente; cada +1 volta uma janela no tempo
  const [pagina, setPagina] = useState(0)

  const todos = useMemo(() => agruparPorEscala(data, escala), [data, escala])

  const tamanho = TAMANHO_JANELA[escala]
  const fim = Math.max(0, todos.length - pagina * tamanho)
  const inicio = Math.max(0, fim - tamanho)
  const janela = useMemo(() => todos.slice(inicio, fim), [todos, inicio, fim])
  const temAnterior = inicio > 0
  const temProximo = pagina > 0

  const cor1 = usuario1Cor === "AMARELO" ? "#ffb900" : "#9333ea"
  const cor2 = usuario2Cor === "AMARELO" ? "#ffb900" : "#9333ea"

  const trocarEscala = (novaEscala: EscalaTempo) => {
    setEscala(novaEscala)
    setPagina(0)
  }

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
      categories: janela.map((d) => rotulo(d.data)),
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
          const label = rotulo(janela[dataPointIndex]?.data ?? "")
          return escala === "semanas" ? `Semana de ${label}` : label
        },
      },
      y: {
        formatter: (val) => `${val} pts`,
      },
    },
  }), [escala, janela, cor1, cor2])

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
        <span className="material-symbols-rounded text-4xl text-slate-300 mb-2">
          trending_up
        </span>
        <p className="text-slate-500 text-sm">Nenhum dado de pontuação ainda</p>
      </div>
    )
  }

  const total1 = janela.reduce((s, d) => s + d.usuario1, 0)
  const total2 = janela.reduce((s, d) => s + d.usuario2, 0)
  const rotuloIntervalo = janela.length
    ? `${rotulo(janela[0].data)} – ${rotulo(janela[janela.length - 1].data)}`
    : ""

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Evolução da Pontuação
          </h3>
          <p className="text-sm text-slate-500">
            Total no período: {total1} × {total2} pts
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
              onClick={() => trocarEscala(e.valor)}
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

        {/* Navegação no tempo */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPagina((p) => p + 1)}
            disabled={!temAnterior}
            aria-label="Período anterior"
            className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <span className="material-symbols-rounded text-xl leading-none">chevron_left</span>
          </button>
          <span className="text-xs font-medium text-slate-600 min-w-[110px] text-center">
            {rotuloIntervalo}
          </span>
          <button
            onClick={() => setPagina((p) => p - 1)}
            disabled={!temProximo}
            aria-label="Próximo período"
            className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <span className="material-symbols-rounded text-xl leading-none">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[280px]">
        <Chart
          options={options}
          series={series}
          type="line"
          height={270}
          width="100%"
        />
      </div>
    </div>
  )
}
