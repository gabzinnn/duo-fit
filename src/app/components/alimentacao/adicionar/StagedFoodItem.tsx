"use client"

import { useState } from "react"

export interface StagedItem {
  id: string // Unique key for list
  alimentoId: number
  nome: string
  quantidade: number
  unidade: string
  calorias: number
  proteinas: number
  carboidratos: number
  gorduras: number
  isPreCalculated?: boolean // True when values already include quantity (e.g., from photo analysis)
}

interface StagedFoodItemProps {
  item: StagedItem
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<StagedItem>) => void
}

export function StagedFoodItem({ item, onRemove, onUpdate }: StagedFoodItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editQuantidade, setEditQuantidade] = useState(item.quantidade)
  const [editUnidade, setEditUnidade] = useState(item.unidade)
  
  // Base values (per 100g or per 1 unit)
  const [baseCalorias, setBaseCalorias] = useState(item.calorias)
  const [baseProteinas, setBaseProteinas] = useState(item.proteinas)
  const [baseCarboidratos, setBaseCarboidratos] = useState(item.carboidratos)
  const [baseGorduras, setBaseGorduras] = useState(item.gorduras)

  // Calculate displayed macros for the list view
  const fator = item.isPreCalculated ? 1 : item.quantidade / 100
  const displayCalorias = Math.round(item.calorias * fator)
  const displayProteinas = Math.round(item.proteinas * fator)

  // Check if unit uses weight-based calculation (g, ml) or unit-based (1 unit = 100g worth)
  const isWeightUnit = (unit: string) => unit === "g" || unit === "ml"
  
  // Calculate the multiplier based on unit type
  const getMultiplier = (qty: number, unit: string) => {
    if (isWeightUnit(unit)) {
      return qty / 100 // 100g = base values
    }
    return qty // 1 porção = base values (100g worth)
  }

  // Calculate LIVE preview values when editing (uses editable base values)
  const editMultiplier = getMultiplier(editQuantidade, editUnidade)
  const previewCalorias = Math.round(baseCalorias * editMultiplier)
  const previewProteinas = Number((baseProteinas * editMultiplier).toFixed(1))
  const previewCarboidratos = Number((baseCarboidratos * editMultiplier).toFixed(1))
  const previewGorduras = Number((baseGorduras * editMultiplier).toFixed(1))

  const handleStartEdit = () => {
    setEditQuantidade(item.quantidade)
    setEditUnidade(item.unidade)
    setBaseCalorias(item.calorias)
    setBaseProteinas(item.proteinas)
    setBaseCarboidratos(item.carboidratos)
    setBaseGorduras(item.gorduras)
    setIsEditing(true)
  }

  const handleSave = () => {
    // Save with the new quantity/unit and updated base values
    onUpdate(item.id, {
      quantidade: editQuantidade,
      unidade: editUnidade,
      calorias: baseCalorias,
      proteinas: baseProteinas,
      carboidratos: baseCarboidratos,
      gorduras: baseGorduras,
      isPreCalculated: false,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  // Get unit label for display
  const getUnitLabel = (unit: string, qty: number) => {
    const plural = qty !== 1
    switch (unit) {
      case "porção": return plural ? "porções" : "porção"
      case "prato": return plural ? "pratos" : "prato"
      case "un": return plural ? "unidades" : "unidade"
      case "fatia": return plural ? "fatias" : "fatia"
      case "colher": return plural ? "colheres" : "colher"
      case "xícara": return plural ? "xícaras" : "xícara"
      case "copo": return plural ? "copos" : "copo"
      default: return unit
    }
  }

  if (isEditing) {
    return (
      <div className="bg-white p-4 rounded-xl border-2 border-primary shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-xl">edit</span>
          </div>
          <h4 className="font-bold text-slate-900">{item.nome}</h4>
        </div>

        {/* Quantity + Unit Row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">
              Quantidade
            </label>
            <input
              type="number"
              step={isWeightUnit(editUnidade) ? "1" : "0.5"}
              value={editQuantidade}
              onChange={(e) => setEditQuantidade(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg 
                focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-slate-900 text-center text-lg font-semibold"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">
              Unidade
            </label>
            <select
              value={editUnidade}
              onChange={(e) => setEditUnidade(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg 
                text-slate-700 focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="g">gramas (g)</option>
              <option value="ml">ml</option>
              <option value="porção">porção</option>
              <option value="prato">prato</option>
              <option value="un">unidade</option>
              <option value="fatia">fatia</option>
              <option value="colher">colher</option>
              <option value="xícara">xícara</option>
              <option value="copo">copo</option>
            </select>
          </div>
        </div>

        {/* Dynamic Macros Preview - Updates in real-time */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">calculate</span>
            {editQuantidade} {getUnitLabel(editUnidade, editQuantidade)}
          </p>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{previewCalorias}</div>
              <div className="text-xs text-slate-500">kcal</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{previewProteinas}</div>
              <div className="text-xs text-slate-500">Prot</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{previewCarboidratos}</div>
              <div className="text-xs text-slate-500">Carb</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{previewGorduras}</div>
              <div className="text-xs text-slate-500">Gord</div>
            </div>
          </div>
        </div>

        {/* Collapsible base values editor */}
        <details className="mb-4">
          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">tune</span>
            Editar valores base ({isWeightUnit(editUnidade) ? "por 100g" : "por unidade"})
          </summary>
          <div className="grid grid-cols-4 gap-2 mt-3 p-3 bg-white rounded-lg border border-slate-200">
            <div>
              <label className="text-xs text-amber-600 font-medium mb-1 block">Cal</label>
              <input
                type="number"
                value={baseCalorias}
                onChange={(e) => setBaseCalorias(Number(e.target.value) || 0)}
                className="w-full px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-sm text-center"
              />
            </div>
            <div>
              <label className="text-xs text-blue-600 font-medium mb-1 block">Prot</label>
              <input
                type="number"
                step="0.1"
                value={baseProteinas}
                onChange={(e) => setBaseProteinas(Number(e.target.value) || 0)}
                className="w-full px-2 py-1.5 bg-blue-50 border border-blue-200 rounded text-sm text-center"
              />
            </div>
            <div>
              <label className="text-xs text-green-600 font-medium mb-1 block">Carb</label>
              <input
                type="number"
                step="0.1"
                value={baseCarboidratos}
                onChange={(e) => setBaseCarboidratos(Number(e.target.value) || 0)}
                className="w-full px-2 py-1.5 bg-green-50 border border-green-200 rounded text-sm text-center"
              />
            </div>
            <div>
              <label className="text-xs text-orange-600 font-medium mb-1 block">Gord</label>
              <input
                type="number"
                step="0.1"
                value={baseGorduras}
                onChange={(e) => setBaseGorduras(Number(e.target.value) || 0)}
                className="w-full px-2 py-1.5 bg-orange-50 border border-orange-200 rounded text-sm text-center"
              />
            </div>
          </div>
        </details>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-4 py-2.5 text-slate-600 bg-slate-100 rounded-lg 
              hover:bg-slate-200 transition-colors font-medium cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 text-white bg-primary rounded-lg 
              hover:bg-primary-dark transition-colors font-medium cursor-pointer
              flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">check</span>
            OK
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-primary/50 transition-colors cursor-pointer"
      onClick={handleStartEdit}
    >
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <span className="material-symbols-outlined">restaurant</span>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-slate-900 truncate">{item.nome}</h4>
        <p className="text-sm text-slate-500">
          {item.quantidade} {item.unidade} • {displayProteinas}g Proteína
        </p>
      </div>
      <div className="text-right">
        <span className="block font-bold text-slate-900">{displayCalorias} kcal</span>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleStartEdit()
            }}
            className="text-xs text-primary hover:text-primary-dark font-medium cursor-pointer"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(item.id)
            }}
            className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  )
}
