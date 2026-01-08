"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { useDate } from "@/context/DateContext"
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
  const { selectedDateKey, formatSelectedDate, goToPrevDay, goToNextDay, isToday, isFuture, goToToday } = useDate()
  const [data, setData] = useState<AlimentacaoData>(defaultData)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const triggerRefresh = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const result = await getAlimentacaoData(usuario?.id ?? null, selectedDateKey)
      setData(result)
      setLoading(false)
    }
    fetchData()
  }, [usuario?.id, selectedDateKey, refreshKey])

  const dataCapitalizada = formatSelectedDate()

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <AlimentacaoHeader dataAtual={dataCapitalizada} />

      {/* Date Navigation */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={goToPrevDay}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">chevron_left</span>
            <span className="text-sm font-medium hidden sm:inline">Anterior</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900">{dataCapitalizada}</p>
              {!isToday && (
                <button
                  onClick={goToToday}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  Voltar para hoje
                </button>
              )}
            </div>
            {isFuture && (
              <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                Futuro
              </span>
            )}
          </div>

          <button
            onClick={goToNextDay}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <span className="text-sm font-medium hidden sm:inline">Próximo</span>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

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
              Refeições {isToday ? "de Hoje" : "do Dia"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.refeicoes.map((refeicao) => (
                <MealCard
                  key={refeicao.tipo}
                  refeicaoId={refeicao.id}
                  tipo={refeicao.tipo}
                  horario={refeicao.horario}
                  totalCalorias={refeicao.totalCalorias}
                  alimentos={refeicao.alimentos}
                  onDataChange={triggerRefresh}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

