"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AlimentacaoHeader } from "./AlimentacaoHeader"
import { CaloriesProgressCard } from "./CaloriesProgressCard"
import { WeeklyHistoryChart } from "./WeeklyHistoryChart"
import { MealCard } from "./MealCard"
import { getAlimentacaoData, type AlimentacaoData } from "@/app/actions/alimentacao"
import { TipoRefeicao } from "@/generated/prisma/client"

// Default data with all 4 meal types
const defaultData: AlimentacaoData = {
  caloriasIngeridas: 0,
  metaCalorias: 2000,
  macros: {
    proteinas: { atual: 0, meta: 150 },
    carboidratos: { atual: 0, meta: 250 },
    gorduras: { atual: 0, meta: 65 },
  },
  refeicoes: (["CAFE_DA_MANHA", "ALMOCO", "LANCHE", "JANTAR"] as TipoRefeicao[]).map((tipo) => ({
    id: 0,
    tipo,
    horario: "",
    totalCalorias: 0,
    alimentos: [],
  })),
  historicoSemanal: [],
  rivalNome: "Rival",
  rivalCalorias: 0,
}

export function AlimentacaoContent() {
  const { usuario } = useAuth()
  const [data, setData] = useState<AlimentacaoData>(defaultData)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const result = await getAlimentacaoData(usuario?.id ?? null)
      setData(result)
      setLoading(false)
    }
    fetchData()
  }, [usuario?.id])

  // Format current date
  const hoje = new Date()
  const dataFormatada = hoje.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
  const dataCapitalizada =
    dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1)

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <AlimentacaoHeader dataAtual={dataCapitalizada} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-6 lg:gap-8 pb-8">
          {/* Hero Stats Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Circular Progress */}
            <div className="lg:col-span-4">
              <CaloriesProgressCard
                caloriasIngeridas={data.caloriasIngeridas}
                metaCalorias={data.metaCalorias}
                macros={data.macros}
              />
            </div>

            {/* History Chart */}
            <div className="lg:col-span-8">
              <WeeklyHistoryChart
                data={data.historicoSemanal}
                usuarioNome={usuario?.nome ?? "Você"}
                rivalNome={data.rivalNome}
              />
            </div>
          </div>

          {/* Meals Section */}
          <div>
            <h3 className="text-lg lg:text-xl font-bold text-slate-900 mb-4 px-1">
              Refeições de Hoje
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.refeicoes.map((refeicao) => (
                <MealCard
                  key={refeicao.tipo}
                  tipo={refeicao.tipo}
                  horario={refeicao.horario}
                  totalCalorias={refeicao.totalCalorias}
                  alimentos={refeicao.alimentos}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
