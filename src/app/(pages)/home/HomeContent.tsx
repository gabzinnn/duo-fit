"use client"

import { useAuth } from "@/context/AuthContext"
import {
  UserScoreCard,
  ScoreChart,
  CaloriesCard,
  ActivityFeed,
  ActivityCalendar,
  MonthlyRetrospective,
} from "@/app/components/dashboard"
import type { DashboardData } from "@/app/actions/dashboard"
import { getCalendarData, type CalendarData } from "@/app/actions/calendar"
import { getRetrospectivaMensal, type RetrospectivaMensal } from "@/app/actions/retrospectiva"

interface HomeContentProps {
  data: DashboardData
  calendarData: CalendarData
  retrospectiva: RetrospectivaMensal
}

export function HomeContent({ data, calendarData, retrospectiva }: HomeContentProps) {
  const { usuario } = useAuth()
  const { usuarios, evolucaoPontos, caloriasDiarias, atividadesHoje } = data

  // Current month/year
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1

  // Determine leader
  const leader = usuarios[0]
  const challenger = usuarios[1]

  // Data fetching handlers
  const handleCalendarChange = async (year: number, month: number) => {
    return getCalendarData(year, month)
  }

  const handleRetrospectivaChange = async (year: number, month: number) => {
    return getRetrospectivaMensal(year, month)
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="h-20 px-4 sm:px-8 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Visão Geral
          </h2>
          <p className="text-sm text-slate-500">DuoFit Challenge</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          {/* User Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {leader && (
              <UserScoreCard
                nome={leader.nome}
                avatar={leader.avatar}
                cor={leader.cor}
                pontosTotais={leader.pontosTotais}
                pontosHoje={leader.pontosHoje}
                sequenciaAtual={leader.sequenciaAtual}
                totalExercicios={leader.totalExercicios}
                isLeader={true}
                isCurrentUser={usuario?.id === leader.id}
              />
            )}
            {challenger && (
              <UserScoreCard
                nome={challenger.nome}
                avatar={challenger.avatar}
                cor={challenger.cor}
                pontosTotais={challenger.pontosTotais}
                pontosHoje={challenger.pontosHoje}
                sequenciaAtual={challenger.sequenciaAtual}
                totalExercicios={challenger.totalExercicios}
                isLeader={false}
                isCurrentUser={usuario?.id === challenger.id}
              />
            )}
          </div>

          {/* Calendars Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ActivityCalendar
              title="Exercícios"
              icon="fitness_center"
              data={calendarData.exercicios}
              ano={ano}
              mes={mes}
              onMesChange={async (y, m) => {
                const res = await handleCalendarChange(y, m)
                return res.exercicios
              }}
            />
            <ActivityCalendar
              title="Dieta"
              icon="restaurant"
              data={calendarData.calorias}
              ano={ano}
              mes={mes}
              onMesChange={async (y, m) => {
                const res = await handleCalendarChange(y, m)
                return res.calorias
              }}
            />
          </div>


          {/* Charts and Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Score Chart - 2 columns on large screens */}
            <div className="lg:col-span-2">
              {leader && challenger && (
                <ScoreChart
                data={evolucaoPontos}
                usuario1Nome={leader.nome}
                usuario2Nome={challenger.nome}
                usuario1Cor={leader.cor}
                usuario2Cor={challenger.cor}
                />
              )}
            </div>

            {/* Right column - Calories and Activity */}
            <div className="flex flex-col gap-6">
              <CaloriesCard usuarios={caloriasDiarias} />
              <ActivityFeed atividades={atividadesHoje} />
            </div>
          </div>
              {/* Monthly Retrospective */}
              <MonthlyRetrospective
                data={retrospectiva}
                ano={ano}
                mes={mes}
                onMesChange={handleRetrospectivaChange}
              />
        </div>
      </div>
    </div>
  )
}
