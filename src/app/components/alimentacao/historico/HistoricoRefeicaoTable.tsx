"use client"

import { useState, useTransition } from "react"
import type { RefeicaoHistorico } from "@/app/actions/alimentacao"
import { marcarDiaInvalido } from "@/app/actions/alimentacao"
import { excluirRefeicao, excluirAlimentoRefeicao, editarQuantidadeAlimento } from "@/app/actions/editar-refeicao-historico"
import { TipoRefeicao } from "@/generated/prisma/client"
import { useAuth } from "@/context/AuthContext"

interface HistoricoRefeicaoTableProps {
  data: RefeicaoHistorico[]
  filterText: string
  diasInvalidos: string[] // List of dateKeys that are marked as invalid
}

const TIPO_CONFIG: Record<TipoRefeicao, { label: string; icon: string; bgColor: string; textColor: string }> = {
  CAFE_DA_MANHA: { label: "Café da Manhã", icon: "bakery_dining", bgColor: "bg-orange-100", textColor: "text-orange-600" },
  ALMOCO: { label: "Almoço", icon: "soup_kitchen", bgColor: "bg-green-100", textColor: "text-green-600" },
  LANCHE: { label: "Lanche", icon: "nutrition", bgColor: "bg-purple-100", textColor: "text-purple-600" },
  JANTAR: { label: "Jantar", icon: "dinner_dining", bgColor: "bg-blue-100", textColor: "text-blue-600" },
}

interface DayGroup {
  dateKey: string
  dateLabel: string
  dayOfWeek: string
  totalCalorias: number
  refeicoes: RefeicaoHistorico[]
}

function groupByDay(data: RefeicaoHistorico[]): DayGroup[] {
  const groups = new Map<string, DayGroup>()

  const DIAS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"]

  for (const refeicao of data) {
    const d = new Date(refeicao.data)
    const dateKey = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })

    if (!groups.has(dateKey)) {
      const dayIndex = d.getDay()
      groups.set(dateKey, {
        dateKey,
        dateLabel: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }),
        dayOfWeek: DIAS[dayIndex],
        totalCalorias: 0,
        refeicoes: [],
      })
    }

    const group = groups.get(dateKey)!
    group.refeicoes.push(refeicao)
    group.totalCalorias += refeicao.totalCalorias
  }

  // Sort by date descending
  return Array.from(groups.values()).sort((a, b) => {
    const dateA = new Date(a.refeicoes[0].data)
    const dateB = new Date(b.refeicoes[0].data)
    return dateB.getTime() - dateA.getTime()
  })
}

function isToday(dateKey: string): boolean {
  const today = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
  return dateKey === today
}

function isYesterday(dateKey: string): boolean {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return dateKey === yesterday.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

export function HistoricoRefeicaoTable({ data, filterText, diasInvalidos }: HistoricoRefeicaoTableProps) {
  const { usuario } = useAuth()
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [expandedMeals, setExpandedMeals] = useState<Set<number>>(new Set())
  const [localInvalidos, setLocalInvalidos] = useState<Set<string>>(new Set(diasInvalidos))
  const [isPending, startTransition] = useTransition()

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "refeicao" | "alimento"; id: number; nome: string } | null>(null)

  // Edit quantity state
  const [editingAlimento, setEditingAlimento] = useState<{ id: number; quantidade: number; nome: string } | null>(null)
  const [editQuantidade, setEditQuantidade] = useState<string>("")

  // Filter data
  const filteredData = filterText
    ? data.filter(
      (item) =>
        TIPO_CONFIG[item.tipo].label.toLowerCase().includes(filterText.toLowerCase()) ||
        item.nomeUsuario.toLowerCase().includes(filterText.toLowerCase()) ||
        item.alimentos.some((a) => a.nome.toLowerCase().includes(filterText.toLowerCase()))
    )
    : data

  const dayGroups = groupByDay(filteredData)

  const toggleDay = (dateKey: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev)
      if (next.has(dateKey)) {
        next.delete(dateKey)
      } else {
        next.add(dateKey)
      }
      return next
    })
  }

  const toggleMeal = (id: number) => {
    setExpandedMeals((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Create key for user+date combination
  const getInvalidoKey = (usuarioId: number, dateKey: string) => `${usuarioId}:${dateKey}`

  const handleToggleInvalido = (dateKey: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!usuario?.id) return

    const key = getInvalidoKey(usuario.id, dateKey)
    const isCurrentlyInvalido = localInvalidos.has(key)
    const newValue = !isCurrentlyInvalido

    // Optimistic update
    setLocalInvalidos((prev) => {
      const next = new Set(prev)
      if (newValue) {
        next.add(key)
      } else {
        next.delete(key)
      }
      return next
    })

    startTransition(async () => {
      try {
        await marcarDiaInvalido(usuario.id, dateKey, newValue)
      } catch (error) {
        // Revert on error
        setLocalInvalidos((prev) => {
          const next = new Set(prev)
          if (newValue) {
            next.delete(key)
          } else {
            next.add(key)
          }
          return next
        })
        console.error("Erro ao marcar dia:", error)
      }
    })
  }

  // Handle delete confirmation
  const handleConfirmDelete = () => {
    if (!deleteConfirm) return

    startTransition(async () => {
      try {
        if (deleteConfirm.type === "refeicao") {
          await excluirRefeicao(deleteConfirm.id)
        } else {
          await excluirAlimentoRefeicao(deleteConfirm.id)
        }
        setDeleteConfirm(null)
      } catch (error) {
        console.error("Erro ao excluir:", error)
      }
    })
  }

  // Handle edit quantity
  const handleSaveQuantidade = () => {
    if (!editingAlimento) return
    const quantidade = parseFloat(editQuantidade)
    if (isNaN(quantidade) || quantidade <= 0) return

    startTransition(async () => {
      try {
        await editarQuantidadeAlimento(editingAlimento.id, quantidade)
        setEditingAlimento(null)
        setEditQuantidade("")
      } catch (error) {
        console.error("Erro ao editar:", error)
      }
    })
  }

  if (dayGroups.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 py-12 text-center text-slate-500">
        <span className="material-symbols-outlined text-4xl mb-2 block">restaurant</span>
        <p>Nenhuma refeição encontrada</p>
      </div>
    )
  }

  return (
    <>
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600">delete</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Confirmar exclusão</h3>
                <p className="text-sm text-slate-500">
                  {deleteConfirm.type === "refeicao" ? "Esta refeição" : "Este alimento"} será removido
                </p>
              </div>
            </div>
            <p className="text-slate-700 mb-4">
              Excluir <strong>{deleteConfirm.nome}</strong>?
              Isso irá recalcular as calorias e pontos do dia.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isPending}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Quantity Modal */}
      {editingAlimento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">edit</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Editar quantidade</h3>
                <p className="text-sm text-slate-500">{editingAlimento.nome}</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nova quantidade</label>
              <input
                type="number"
                value={editQuantidade}
                onChange={(e) => setEditQuantidade(e.target.value)}
                placeholder={String(editingAlimento.quantidade)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditingAlimento(null)
                  setEditQuantidade("")
                }}
                disabled={isPending}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveQuantidade}
                disabled={isPending || !editQuantidade}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {dayGroups.map((day) => {
          const isDayExpanded = expandedDays.has(day.dateKey)
          const todayLabel = isToday(day.dateKey) ? "Hoje" : isYesterday(day.dateKey) ? "Ontem" : null
          // Check if current user has this day marked as invalid
          const isDiaInvalido = usuario?.id ? localInvalidos.has(getInvalidoKey(usuario.id, day.dateKey)) : false

          return (
            <div
              key={day.dateKey}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${isDiaInvalido ? "border-red-300 bg-red-50/30" : "border-slate-200"
                }`}
            >
              {/* Day Header */}
              <div
                className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${isDiaInvalido ? "bg-red-50/50" : ""
                  }`}
              >
                <button
                  onClick={() => toggleDay(day.dateKey)}
                  className="flex items-center gap-4 hover:opacity-80 transition-opacity cursor-pointer flex-1"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDiaInvalido ? "bg-red-100" : "bg-primary/10"
                    }`}>
                    <span className={`material-symbols-outlined text-2xl ${isDiaInvalido ? "text-red-500" : "text-primary"
                      }`}>
                      {isDiaInvalido ? "cancel" : "calendar_today"}
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold ${isDiaInvalido ? "text-red-700" : "text-slate-900"}`}>
                        {todayLabel || day.dayOfWeek}
                      </h3>
                      {todayLabel && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {day.dayOfWeek}
                        </span>
                      )}
                      {isDiaInvalido && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                          Não registrei
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${isDiaInvalido ? "text-red-400" : "text-slate-500"}`}>
                      {day.dateLabel}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-4">
                  {/* Toggle invalid button */}
                  <button
                    onClick={(e) => handleToggleInvalido(day.dateKey, e)}
                    disabled={isPending}
                    title={isDiaInvalido ? "Marcar como válido" : "Marcar como não registrei"}
                    className={`p-2 rounded-lg transition-colors cursor-pointer w-10 h-10 ${isDiaInvalido
                      ? "bg-red-100 text-red-600 hover:bg-red-200"
                      : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                      } ${isPending ? "opacity-50" : ""}`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {isDiaInvalido ? "undo" : "do_not_disturb_on"}
                    </span>
                  </button>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${isDiaInvalido ? "text-red-400 line-through" : "text-slate-900"}`}>
                      {Math.round(day.totalCalorias)} kcal
                    </p>
                    <p className="text-xs text-slate-500">{day.refeicoes.length} refeições</p>
                  </div>
                  <span className={`material-symbols-outlined text-slate-400 transition-transform ${isDayExpanded ? "rotate-180" : ""}`}>
                    expand_more
                  </span>
                </div>
              </div>

              {/* Meals */}
              {isDayExpanded && (
                <div className="border-t border-slate-100">
                  {day.refeicoes.map((refeicao) => {
                    const config = TIPO_CONFIG[refeicao.tipo]
                    const isMealExpanded = expandedMeals.has(refeicao.id)
                    const time = new Date(refeicao.data).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "America/Sao_Paulo",
                    })

                    return (
                      <div key={refeicao.id} className="border-b border-slate-100 last:border-b-0">
                        {/* Meal Header */}
                        <button
                          onClick={() => toggleMeal(refeicao.id)}
                          className="w-full px-6 py-3 pl-12 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${config.bgColor} ${config.textColor}`}>
                              <span className="material-symbols-outlined text-xl">{config.icon}</span>
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-slate-900">{config.label}</p>
                              <p className="text-xs text-slate-500">{time} • {refeicao.quantidadeAlimentos} alimentos</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex gap-3 text-xs">
                              <span className="text-blue-600 font-medium">{Math.round(refeicao.totalProteinas)}p</span>
                              <span className="text-green-600 font-medium">{Math.round(refeicao.totalCarbos)}c</span>
                              <span className="text-orange-600 font-medium">{Math.round(refeicao.totalGorduras)}g</span>
                            </div>
                            <span className="font-bold text-amber-600">{Math.round(refeicao.totalCalorias)} kcal</span>
                            {/* User avatar */}
                            {(() => {
                              const isAmarelo = refeicao.corUsuario === "AMARELO"
                              const borderClass = isAmarelo ? "border-amber-400" : "border-purple-500"
                              const bgClass = isAmarelo ? "bg-amber-100" : "bg-purple-100"
                              const textClass = isAmarelo ? "text-amber-700" : "text-purple-700"
                              const initials = refeicao.nomeUsuario.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()

                              return refeicao.avatarUsuario ? (
                                <img
                                  src={refeicao.avatarUsuario}
                                  alt={refeicao.nomeUsuario}
                                  title={refeicao.nomeUsuario}
                                  className={`w-7 h-7 rounded-full object-cover border-2 ${borderClass}`}
                                />
                              ) : (
                                <div
                                  title={refeicao.nomeUsuario}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${borderClass} ${bgClass}`}
                                >
                                  <span className={`text-[10px] font-bold ${textClass}`}>{initials}</span>
                                </div>
                              )
                            })()}
                            <span className={`material-symbols-outlined text-slate-400 transition-transform text-lg ${isMealExpanded ? "rotate-180" : ""}`}>
                              expand_more
                            </span>
                          </div>
                        </button>

                        {/* Delete meal button - only show when expanded */}
                        {isMealExpanded && refeicao.usuarioId === usuario?.id && (
                          <div className="px-6 py-2 pl-12 bg-slate-50/50 border-b border-slate-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteConfirm({ type: "refeicao", id: refeicao.id, nome: config.label })
                              }}
                              className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                              Excluir refeição
                            </button>
                          </div>
                        )}

                        {/* Foods */}
                        {isMealExpanded && (
                          <div className="bg-slate-50 px-6 py-3 pl-20 space-y-2">
                            {refeicao.alimentos.map((alimento) => (
                              <div
                                key={alimento.id}
                                className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-500 text-sm">lunch_dining</span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-900">{alimento.nome}</p>
                                    <p className="text-xs text-slate-500">{alimento.quantidade} {alimento.unidade}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="flex gap-2 text-xs">
                                    <span className="text-blue-600">{Math.round(alimento.proteinas)}p</span>
                                    <span className="text-green-600">{Math.round(alimento.carboidratos)}c</span>
                                    <span className="text-orange-600">{Math.round(alimento.gorduras)}g</span>
                                  </div>
                                  <span className="text-sm font-semibold text-amber-600">
                                    {Math.round(alimento.calorias)} kcal
                                  </span>
                                  {/* Edit/Delete buttons - show on hover or always on mobile */}
                                  {refeicao.usuarioId === usuario?.id && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-100">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setEditingAlimento({ id: alimento.id, quantidade: alimento.quantidade, nome: alimento.nome })
                                          setEditQuantidade(String(alimento.quantidade))
                                        }}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                        title="Editar quantidade"
                                      >
                                        <span className="material-symbols-outlined text-lg">edit</span>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setDeleteConfirm({ type: "alimento", id: alimento.id, nome: alimento.nome })
                                        }}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                        title="Excluir alimento"
                                      >
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
