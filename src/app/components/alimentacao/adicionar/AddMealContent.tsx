"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { useDate } from "@/context/DateContext"
import { TipoRefeicao } from "@/generated/prisma/client"
import type { AlimentoNormalizado } from "@/utils/normalizar-alimento"
import { salvarRefeicao } from "@/app/actions/refeicao"
import { getAlimentacaoData } from "@/app/actions/alimentacao"

import { MealTypeSelector } from "./MealTypeSelector"
import { FoodSearchInput } from "./FoodSearchInput"
import { StagedFoodList } from "./StagedFoodList"
import { MealSummaryCard } from "./MealSummaryCard"
import { CreateFoodModal } from "./CreateFoodModal"
import { PhotoAnalyzer } from "./PhotoAnalyzer"
import type { StagedItem } from "./StagedFoodItem"
import type { AlimentoAnalisado } from "@/app/actions/analisar-foto"

export function AddMealContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { usuario } = useAuth()
  const { selectedDateKey, formatSelectedDate, isToday, isFuture } = useDate()

  // Get meal type from URL or default to lunch
  const tipoParam = searchParams.get("tipo") as TipoRefeicao | null
  const [mealType, setMealType] = useState<TipoRefeicao>(
    tipoParam || "ALMOCO"
  )

  const [stagedItems, setStagedItems] = useState<StagedItem[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [metaCalorias, setMetaCalorias] = useState(2000)
  const [caloriasHoje, setCaloriasHoje] = useState(0)

  // Fetch user's daily data for the selected date
  useEffect(() => {
    async function fetchData() {
      if (usuario?.id) {
        const data = await getAlimentacaoData(usuario.id, selectedDateKey)
        setMetaCalorias(data.metaCalorias)
        setCaloriasHoje(data.caloriasIngeridas)
      }
    }
    fetchData()
  }, [usuario?.id, selectedDateKey])

  const handleAddFood = (
    alimento: AlimentoNormalizado,
    quantidade: number,
    unidade: string
  ) => {
    const newItem: StagedItem = {
      id: `${Date.now()}-${Math.random()}`,
      alimentoId: alimento.id ?? 0,
      nome: alimento.nome,
      quantidade,
      unidade,
      calorias: alimento.calorias,
      proteinas: alimento.proteinas,
      carboidratos: alimento.carboidratos,
      gorduras: alimento.gorduras,
    }
    setStagedItems((prev) => [...prev, newItem])
  }

  const handleRemoveItem = (id: string) => {
    setStagedItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleUpdateItem = (id: string, updates: Partial<StagedItem>) => {
    setStagedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  const handleFoodCreated = (alimento: {
    id: number
    nome: string
    calorias: number
    proteinas: number
    carboidratos: number
    gorduras: number
  }) => {
    // Add created food to staged items
    const newItem: StagedItem = {
      id: `${Date.now()}-${Math.random()}`,
      alimentoId: alimento.id,
      nome: alimento.nome,
      quantidade: 100,
      unidade: "g",
      calorias: alimento.calorias,
      proteinas: alimento.proteinas,
      carboidratos: alimento.carboidratos,
      gorduras: alimento.gorduras,
    }
    setStagedItems((prev) => [...prev, newItem])
  }

  const handleFoodsFromPhoto = (foods: AlimentoAnalisado[]) => {
    const newItems: StagedItem[] = foods.map((food) => ({
      id: `${Date.now()}-${Math.random()}-${food.nome}`,
      alimentoId: food.alimentoId ?? -Date.now(), // Use DB ID if available
      nome: food.nome,
      quantidade: food.quantidade,
      unidade: food.unidade,
      calorias: food.calorias,
      proteinas: food.proteinas,
      carboidratos: food.carboidratos,
      gorduras: food.gorduras,
      isPreCalculated: true, // Values are already calculated for the quantity
    }))
    setStagedItems((prev) => [...prev, ...newItems])
  }

  const handleSave = async () => {
    if (!usuario?.id || stagedItems.length === 0) return

    setSaving(true)
    try {
      await salvarRefeicao(
        usuario.id,
        mealType,
        stagedItems.map((item) => {
          const isTempItem = item.alimentoId <= 0
          const isPreCalculated = item.isPreCalculated // Values are already Total for the quantity

          const payload: any = {
            alimentoId: item.alimentoId,
            quantidade: item.quantidade,
            unidade: item.unidade,
          }

          if (isTempItem) {
            payload.nome = item.nome

            // Server expects TOTAL values for the quantity provided
            // It will then normalize to 100g base: (Total / Qty) * 100

            if (isPreCalculated) {
              // Item values are ALREADY totals
              payload.calorias = item.calorias
              payload.proteinas = item.proteinas
              payload.carboidratos = item.carboidratos
              payload.gorduras = item.gorduras
            } else {
              // Item values are BASE (per 100g or per unit)
              // We must convert to totals based on unit type
              const isWeightUnit = item.unidade === "g" || item.unidade === "ml"
              const multiplier = isWeightUnit ? item.quantidade / 100 : item.quantidade
              payload.calorias = item.calorias * multiplier
              payload.proteinas = item.proteinas * multiplier
              payload.carboidratos = item.carboidratos * multiplier
              payload.gorduras = item.gorduras * multiplier
            }
          }

          return payload
        }),
        selectedDateKey // Pass the selected date to save meal on that day
      )
    } catch (error) {
      console.error("Erro ao salvar refeição:", error)
    } finally {
      setSaving(false)
    }
    router.push("/alimentacao")
  }

  const handleCancel = () => {
    router.push("/alimentacao")
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/alimentacao"
            className="flex items-center gap-2 text-slate-400 text-sm mb-3 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Voltar ao Diário
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            Adicionar Refeição
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500 text-base">
              {formatSelectedDate()}
            </p>
            {isFuture && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                Futuro
              </span>
            )}
            {!isToday && !isFuture && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                Retroativo
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Input */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <MealTypeSelector selected={mealType} onChange={setMealType} />
              <PhotoAnalyzer onFoodsDetected={handleFoodsFromPhoto} />
              <FoodSearchInput
                onSelect={handleAddFood}
                onCreateClick={() => setShowCreateModal(true)}
              />
              <StagedFoodList
                items={stagedItems}
                onRemove={handleRemoveItem}
                onUpdate={handleUpdateItem}
                onManualAdd={() => setShowCreateModal(true)}
              />
            </div>

            {/* Right Column - Summary */}
            <div className="lg:col-span-5">
              <MealSummaryCard
                items={stagedItems}
                metaCalorias={metaCalorias}
                caloriasConsumidasHoje={caloriasHoje}
                onSave={handleSave}
                onCancel={handleCancel}
                saving={saving}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Create Food Modal */}
      <CreateFoodModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleFoodCreated}
      />
    </div>
  )
}
