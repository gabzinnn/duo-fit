"use client"

import dynamic from "next/dynamic"

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false })

interface ScoreChartProps {
  data: {
    data: string
    usuario1: number
    usuario2: number
  }[]
  usuario1Nome: string
  usuario2Nome: string
  usuario1Cor: string
  usuario2Cor: string
}

export function ScoreChart({
  data,
  usuario1Nome,
  usuario2Nome,
  usuario1Cor,
  usuario2Cor,
}: ScoreChartProps) {
  const cor1 = usuario1Cor === "AMARELO" ? "#f6e2b9" : "#9333ea"
  const cor2 = usuario2Cor === "AMARELO" ? "#f6e2b9" : "#9333ea"

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "Lexend, sans-serif",
    },
    colors: [cor1, cor2],
    stroke: {
      curve: "smooth",
      width: 4,
    },
    markers: {
      size: 0,
      hover: { size: 6 },
    },
    xaxis: {
      categories: data.map((d) => d.data),
      labels: {
        style: {
          colors: "#94a3b8",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#94a3b8",
          fontSize: "12px",
        },
        formatter: (val) => val.toFixed(0),
      },
    },
    grid: {
      borderColor: "#e2e8f0",
      strokeDashArray: 4,
    },
    legend: { show: false },
    tooltip: {
      theme: "light",
      y: {
        formatter: (val) => `${val} pts`,
      },
    },
  }

  const series = [
    {
      name: usuario1Nome,
      data: data.map((d) => d.usuario1),
    },
    {
      name: usuario2Nome,
      data: data.map((d) => d.usuario2),
    },
  ]

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Evolução da Pontuação
          </h3>
          <p className="text-sm text-slate-500">
            Comparação dos últimos 7 dias
          </p>
        </div>
        <div className="flex gap-4">
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
      <div className="flex-1 w-full min-h-[240px]">
        <Chart options={options} series={series} type="line" height="100%" />
      </div>
    </div>
  )
}
