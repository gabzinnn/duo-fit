"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { TipoRefeicao } from "@/generated/prisma/client"
import type { AlimentoItem } from "@/app/actions/alimentacao"
import { excluirRefeicao, excluirAlimentoRefeicao, editarQuantidadeAlimento } from "@/app/actions/editar-refeicao-historico"

interface MealCardProps {
  refeicaoId: number
  tipo: TipoRefeicao
  horario: string
  totalCalorias: number
  alimentos: AlimentoItem[]
  onDataChange?: () => void
}

const TIPO_CONFIG: Record<TipoRefeicao, {
  label: string
  icon: string
  bgColor: string
  textColor: string
}> = {
  CAFE_DA_MANHA: {
    label: "Café da Manhã",
    icon: "bakery_dining",
    bgColor: "bg-orange-100",
    textColor: "text-orange-600",
  },
  ALMOCO: {
    label: "Almoço",
    icon: "soup_kitchen",
    bgColor: "bg-green-100",
    textColor: "text-green-600",
  },
  LANCHE: {
    label: "Lanche da Tarde",
    icon: "nutrition",
    bgColor: "bg-purple-100",
    textColor: "text-purple-600",
  },
  JANTAR: {
    label: "Jantar",
    icon: "dinner_dining",
    bgColor: "bg-blue-100",
    textColor: "text-blue-600",
  },
}

export function MealCard({
  refeicaoId,
  tipo,
  horario,
  totalCalorias,
  alimentos,
  onDataChange,
}: MealCardProps) {
  const router = useRouter()
  const config = TIPO_CONFIG[tipo]
  const temAlimentos = alimentos.length > 0

  const [isPending, startTransition] = useTransition()
  const [showDeleteMealModal, setShowDeleteMealModal] = useState(false)
  const [deleteAlimentoModal, setDeleteAlimentoModal] = useState<{ id: number; nome: string } | null>(null)
  const [editAlimentoModal, setEditAlimentoModal] = useState<{ id: number; nome: string; quantidade: number } | null>(null)
  const [editQuantidade, setEditQuantidade] = useState("")

  const handleDeleteMeal = () => {
    if (refeicaoId <= 0) return
    startTransition(async () => {
      await excluirRefeicao(refeicaoId)
      setShowDeleteMealModal(false)
      onDataChange?.()
    })
  }

  const handleDeleteAlimento = () => {
    if (!deleteAlimentoModal) return
    startTransition(async () => {
      await excluirAlimentoRefeicao(deleteAlimentoModal.id)
      setDeleteAlimentoModal(null)
      onDataChange?.()
    })
  }

  const handleEditAlimento = () => {
    if (!editAlimentoModal) return
    const quantidade = parseFloat(editQuantidade)
    if (isNaN(quantidade) || quantidade <= 0) return
    startTransition(async () => {
      await editarQuantidadeAlimento(editAlimentoModal.id, quantidade)
      setEditAlimentoModal(null)
      setEditQuantidade("")
      onDataChange?.()
    })
  }

  return (
    <>
      {/* Delete Meal Modal */}
      {showDeleteMealModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600">delete</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Excluir refeição</h3>
                <p className="text-sm text-slate-500">{config.label}</p>
              </div>
            </div>
            <p className="text-slate-700 mb-4">
              Tem certeza que deseja excluir esta refeição? Isso irá recalcular as calorias e pontos do dia.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteMealModal(false)}
                disabled={isPending}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteMeal}
                disabled={isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Alimento Modal */}
      {deleteAlimentoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600">delete</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Excluir alimento</h3>
                <p className="text-sm text-slate-500">{deleteAlimentoModal.nome}</p>
              </div>
            </div>
            <p className="text-slate-700 mb-4">
              Excluir este alimento da refeição?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteAlimentoModal(null)}
                disabled={isPending}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAlimento}
                disabled={isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Alimento Modal */}
      {editAlimentoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">edit</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Editar quantidade</h3>
                <p className="text-sm text-slate-500">{editAlimentoModal.nome}</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nova quantidade</label>
              <input
                type="number"
                value={editQuantidade}
                onChange={(e) => setEditQuantidade(e.target.value)}
                placeholder={String(editAlimentoModal.quantidade)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditAlimentoModal(null)
                  setEditQuantidade("")
                }}
                disabled={isPending}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditAlimento}
                disabled={isPending || !editQuantidade}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`
          bg-white rounded-2xl p-6 shadow-sm border border-slate-100 
          group hover:shadow-md transition-all
          ${!temAlimentos ? "opacity-70 hover:opacity-100" : ""}
        `}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${config.bgColor} ${config.textColor}
              `}
            >
              <span className="material-symbols-outlined">{config.icon}</span>
            </div>
            <div>
              <h4 className="font-bold text-slate-900">{config.label}</h4>
              <p className="text-xs text-slate-500">
                {temAlimentos
                  ? `${horario} • ${Math.round(totalCalorias)} kcal`
                  : "Ainda não registrado"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Delete meal button - only if has food */}
            {temAlimentos && refeicaoId > 0 && (
              <button
                onClick={() => setShowDeleteMealModal(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                title="Excluir refeição"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            )}
            <Link
              href={`/alimentacao/adicionar?tipo=${tipo}`}
              className={`
                w-10 h-10 flex items-center justify-center rounded-full transition-colors cursor-pointer
                ${temAlimentos
                  ? "text-slate-400 hover:text-primary hover:bg-primary/10"
                  : "bg-primary/20 text-slate-900 hover:bg-primary"
                }
              `}
            >
              <span className="material-symbols-outlined">
                {temAlimentos ? "add_circle" : "add"}
              </span>
            </Link>
          </div>
        </div>

        {/* Content */}
        {temAlimentos ? (
          <div className="space-y-3">
            {alimentos.map((alimento) => (
              <div
                key={alimento.id}
                className="group/item"
              >
                {/* Food item with actions */}
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="bg-slate-200 rounded-lg w-10 h-10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-slate-500 text-lg">
                        restaurant
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-slate-900 truncate">{alimento.nome}</span>
                      <span className="text-xs text-slate-500">
                        {alimento.quantidade} {alimento.unidade}
                      </span>
                    </div>
                  </div>
                  {/* Right side: calories and action buttons */}
                  <div className="flex items-center shrink-0 ml-auto">
                    {/* Action buttons - always visible on mobile, hover on desktop */}
                    <div className="flex gap-1 max-w-24 sm:overflow-hidden sm:max-w-0 sm:group-hover/item:max-w-24 transition-all duration-200">
                      <button
                        onClick={() => {
                          setEditAlimentoModal({ id: alimento.id, nome: alimento.nome, quantidade: alimento.quantidade })
                          setEditQuantidade(String(alimento.quantidade))
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        title="Editar quantidade"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteAlimentoModal({ id: alimento.id, nome: alimento.nome })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Excluir alimento"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                    {/* Calories - always visible */}
                    <span className="text-sm font-bold text-slate-600 pl-2">
                      {Math.round(alimento.calorias)} kcal
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Link
            href={`/alimentacao/adicionar?tipo=${tipo}`}
            className="flex items-center justify-center h-20 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-primary hover:text-primary transition-colors cursor-pointer"
          >
            <span className="text-sm">Toque no + para adicionar</span>
          </Link>
        )}
      </div>
    </>
  )
}

