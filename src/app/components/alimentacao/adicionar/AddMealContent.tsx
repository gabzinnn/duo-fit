"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
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

  // Fetch user's daily data
  useEffect(() => {
    async function fetchData() {
      if (usuario?.id) {
        const data = await getAlimentacaoData(usuario.id)
        setMetaCalorias(data.metaCalorias)
        setCaloriasHoje(data.caloriasIngeridas)
      }
    }
    fetchData()
  }, [usuario?.id])

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
        stagedItems.map((item) => ({
          alimentoId: item.alimentoId,
          quantidade: item.quantidade,
          unidade: item.unidade,
        }))
      )
      router.push("/alimentacao")
    } catch (error) {
      console.error("Erro ao salvar refeição:", error)
    } finally {
      setSaving(false)
    }
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
          <p className="text-slate-500 text-base mt-1">
            Registre seus alimentos para atualizar seu progresso diário.
          </p>
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
