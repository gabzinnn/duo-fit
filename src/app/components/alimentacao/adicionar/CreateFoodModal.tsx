"use client"

import { useState, useMemo } from "react"
import { criarAlimento } from "@/app/actions/refeicao"
import { Button } from "@/app/components/ui"

interface CreateFoodModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (alimento: {
    id: number
    nome: string
    calorias: number
    proteinas: number
    carboidratos: number
    gorduras: number
  }) => void
}

export function CreateFoodModal({ isOpen, onClose, onCreated }: CreateFoodModalProps) {
  const [nome, setNome] = useState("")
  const [porcaoBase, setPorcaoBase] = useState("100") // Default 100g
  const [calorias, setCalorias] = useState("")
  const [proteinas, setProteinas] = useState("")
  const [carboidratos, setCarboidratos] = useState("")
  const [gorduras, setGorduras] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Calculate normalized values (per 100g)
  const normalized = useMemo(() => {
    const porcao = Number(porcaoBase) || 100
    const multiplier = 100 / porcao
    return {
      calorias: Math.round((Number(calorias) || 0) * multiplier),
      proteinas: Math.round(((Number(proteinas) || 0) * multiplier) * 10) / 10,
      carboidratos: Math.round(((Number(carboidratos) || 0) * multiplier) * 10) / 10,
      gorduras: Math.round(((Number(gorduras) || 0) * multiplier) * 10) / 10,
    }
  }, [porcaoBase, calorias, proteinas, carboidratos, gorduras])

  const resetForm = () => {
    setNome("")
    setPorcaoBase("100")
    setCalorias("")
    setProteinas("")
    setCarboidratos("")
    setGorduras("")
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!nome.trim()) {
      setError("Nome é obrigatório")
      return
    }

    setSaving(true)
    try {
      const alimento = await criarAlimento({
        nome: nome.trim(),
        calorias: normalized.calorias,
        proteinas: normalized.proteinas,
        carboidratos: normalized.carboidratos,
        gorduras: normalized.gorduras,
      })
      onCreated(alimento)
      resetForm()
      onClose()
    } catch {
      setError("Erro ao criar alimento")
    } finally {
      setSaving(false)
    }
  }

  const handleUseOnce = () => {
    if (!nome.trim()) {
      setError("Nome é obrigatório")
      return
    }
    onCreated({
      id: -Date.now(),
      nome: nome.trim(),
      calorias: normalized.calorias,
      proteinas: normalized.proteinas,
      carboidratos: normalized.carboidratos,
      gorduras: normalized.gorduras,
    })
    resetForm()
    onClose()
  }

  const showNormalized = Number(porcaoBase) !== 100 && Number(porcaoBase) > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Criar Novo Alimento</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Nome do alimento
            </label>
            <input
              type="text"
              placeholder="Ex: Peito de frango grelhado"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="w-full h-12 px-4 rounded-xl bg-slate-100 text-slate-900 
                border-none outline-none placeholder:text-slate-400
                focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          {/* Portion size section */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Tamanho da porção (g)
            </label>
            <p className="text-xs text-slate-500 -mt-1">
              Informe o tamanho da porção que está na embalagem (ex: 30g)
            </p>
            <div className="flex gap-2">
              {[30, 50, 100, 150, 200].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPorcaoBase(String(size))}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${porcaoBase === String(size)
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  {size}g
                </button>
              ))}
              <input
                type="number"
                placeholder="Outro"
                value={[30, 50, 100, 150, 200].includes(Number(porcaoBase)) ? "" : porcaoBase}
                onChange={(e) => setPorcaoBase(e.target.value)}
                className="w-20 h-10 px-3 rounded-lg bg-slate-100 text-slate-900 text-sm
                  border-none outline-none placeholder:text-slate-400
                  focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          {/* Nutritional info section */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">
              Informação nutricional{" "}
              <span className="font-normal text-slate-500">
                (por {porcaoBase || 100}g)
              </span>
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">Calorias</label>
                <input
                  type="number"
                  placeholder="0"
                  value={calorias}
                  onChange={(e) => setCalorias(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-white text-slate-900 text-sm
                    border border-slate-200 outline-none placeholder:text-slate-400
                    focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">Proteínas (g)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={proteinas}
                  onChange={(e) => setProteinas(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-white text-slate-900 text-sm
                    border border-slate-200 outline-none placeholder:text-slate-400
                    focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">Carboidratos (g)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={carboidratos}
                  onChange={(e) => setCarboidratos(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-white text-slate-900 text-sm
                    border border-slate-200 outline-none placeholder:text-slate-400
                    focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">Gorduras (g)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={gorduras}
                  onChange={(e) => setGorduras(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-white text-slate-900 text-sm
                    border border-slate-200 outline-none placeholder:text-slate-400
                    focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

          {/* Normalized preview - only show if portion is not 100g */}
          {showNormalized && (Number(calorias) > 0 || Number(proteinas) > 0) && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">info</span>
                Valores convertidos para 100g (como será salvo):
              </p>
              <div className="flex gap-4 text-sm">
                <span className="text-blue-800">
                  <strong>{normalized.calorias}</strong> kcal
                </span>
                <span className="text-blue-600">
                  <strong>{normalized.proteinas}</strong>g prot
                </span>
                <span className="text-blue-600">
                  <strong>{normalized.carboidratos}</strong>g carb
                </span>
                <span className="text-blue-600">
                  <strong>{normalized.gorduras}</strong>g gord
                </span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 mt-2">
            <Button
              type="submit"
              isLoading={saving}
              fullWidth
            >
              Criar e Salvar no Banco
            </Button>
            <button
              type="button"
              onClick={handleUseOnce}
              className="w-full h-12 px-6 rounded-xl border-2 border-dashed border-slate-300 
                text-slate-600 font-semibold hover:border-primary hover:text-primary 
                transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">restaurant</span>
              Usar apenas uma vez (não salvar)
            </button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

