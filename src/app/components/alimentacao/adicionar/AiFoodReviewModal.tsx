"use client"

import { useState } from "react"
import { Button } from "@/app/components/ui"
import type { AlimentoAnalisado } from "@/app/actions/analisar-foto"

interface AiFoodReviewModalProps {
  foods: AlimentoAnalisado[]
  onConfirm: (foods: AlimentoAnalisado[]) => void
  onClose: () => void
}

const UNIDADES = ["g", "ml", "porção", "prato", "un", "fatia", "colher", "xícara", "copo"]

const round1 = (n: number) => Math.round(n * 10) / 10

export function AiFoodReviewModal({ foods, onConfirm, onClose }: AiFoodReviewModalProps) {
  const [items, setItems] = useState<AlimentoAnalisado[]>(foods)

  const update = (index: number, updates: Partial<AlimentoAnalisado>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...updates } : it)))
  }

  // Editar a quantidade reescala os macros proporcionalmente (valores são totais)
  const handleQtyChange = (index: number, newQty: number) => {
    const it = items[index]
    if (it.quantidade > 0 && newQty > 0) {
      const r = newQty / it.quantidade
      update(index, {
        quantidade: newQty,
        calorias: Math.round(it.calorias * r),
        proteinas: round1(it.proteinas * r),
        carboidratos: round1(it.carboidratos * r),
        gorduras: round1(it.gorduras * r),
      })
    } else {
      update(index, { quantidade: newQty })
    }
  }

  const remove = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const totals = items.reduce(
    (acc, it) => ({
      calorias: acc.calorias + it.calorias,
      proteinas: acc.proteinas + it.proteinas,
      carboidratos: acc.carboidratos + it.carboidratos,
      gorduras: acc.gorduras + it.gorduras,
    }),
    { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 }
  )

  const macroInput = (
    index: number,
    field: keyof AlimentoAnalisado,
    label: string,
    color: string
  ) => (
    <div className="flex flex-col gap-0.5">
      <label className={`text-[10px] font-medium ${color}`}>{label}</label>
      <input
        type="number"
        step="0.1"
        value={items[index][field] as number}
        onChange={(e) => update(index, { [field]: Number(e.target.value) || 0 })}
        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-sm text-center
          outline-none focus:ring-2 focus:ring-primary/40"
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-slate-900">Alimentos detectados</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Revise, ajuste as quantidades e macros, remova o que não quiser.
        </p>

        {items.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            Nenhum alimento. Feche e tente novamente.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((it, index) => (
              <div key={index} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={it.nome}
                    onChange={(e) => update(index, { nome: e.target.value })}
                    className="flex-1 min-w-0 font-semibold text-slate-900 bg-transparent
                      border-b border-transparent hover:border-slate-300 focus:border-primary
                      outline-none px-1 py-0.5"
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer shrink-0"
                    aria-label="Remover"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-medium text-slate-500">Quantidade</label>
                    <input
                      type="number"
                      value={it.quantidade}
                      onChange={(e) => handleQtyChange(index, Number(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-sm text-center
                        outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-medium text-slate-500">Unidade</label>
                    <select
                      value={it.unidade}
                      onChange={(e) => update(index, { unidade: e.target.value })}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-sm
                        outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                    >
                      {UNIDADES.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {macroInput(index, "calorias", "kcal", "text-amber-600")}
                  {macroInput(index, "proteinas", "Prot", "text-blue-600")}
                  {macroInput(index, "carboidratos", "Carb", "text-green-600")}
                  {macroInput(index, "gorduras", "Gord", "text-orange-600")}
                </div>

                <label className="flex items-center gap-2 mt-3 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!it.salvarNoBanco}
                    onChange={(e) => update(index, { salvarNoBanco: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                  Salvar no banco de alimentos (reutilizável na busca)
                </label>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-4 bg-slate-100 rounded-xl p-3 flex justify-between text-sm">
            <span className="font-bold text-slate-900">{Math.round(totals.calorias)} kcal</span>
            <span className="text-blue-600">{round1(totals.proteinas)}g prot</span>
            <span className="text-green-600">{round1(totals.carboidratos)}g carb</span>
            <span className="text-orange-600">{round1(totals.gorduras)}g gord</span>
          </div>
        )}

        <div className="flex flex-col gap-3 mt-5">
          <Button
            type="button"
            fullWidth
            disabled={items.length === 0}
            onClick={() => onConfirm(items)}
            leftIcon={<span className="material-symbols-outlined text-lg">add</span>}
          >
            Adicionar à refeição
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
