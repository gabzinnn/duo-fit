"use client"

import { useState } from "react"
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
  const [calorias, setCalorias] = useState("")
  const [proteinas, setProteinas] = useState("")
  const [carboidratos, setCarboidratos] = useState("")
  const [gorduras, setGorduras] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

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
        calorias: Number(calorias) || 0,
        proteinas: Number(proteinas) || 0,
        carboidratos: Number(carboidratos) || 0,
        gorduras: Number(gorduras) || 0,
      })
      onCreated(alimento)
      // Reset form
      setNome("")
      setCalorias("")
      setProteinas("")
      setCarboidratos("")
      setGorduras("")
      onClose()
    } catch {
      setError("Erro ao criar alimento")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Calorias (por 100g)
              </label>
              <input
                type="number"
                placeholder="0"
                value={calorias}
                onChange={(e) => setCalorias(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-slate-100 text-slate-900 
                  border-none outline-none placeholder:text-slate-400
                  focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Proteínas (g)
              </label>
              <input
                type="number"
                placeholder="0"
                value={proteinas}
                onChange={(e) => setProteinas(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-slate-100 text-slate-900 
                  border-none outline-none placeholder:text-slate-400
                  focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Carboidratos (g)
              </label>
              <input
                type="number"
                placeholder="0"
                value={carboidratos}
                onChange={(e) => setCarboidratos(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-slate-100 text-slate-900 
                  border-none outline-none placeholder:text-slate-400
                  focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Gorduras (g)
              </label>
              <input
                type="number"
                placeholder="0"
                value={gorduras}
                onChange={(e) => setGorduras(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-slate-100 text-slate-900 
                  border-none outline-none placeholder:text-slate-400
                  focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

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
              onClick={() => {
                if (!nome.trim()) {
                  setError("Nome é obrigatório")
                  return
                }
                // Create a temporary food object with negative ID to indicate it's not saved
                onCreated({
                  id: -Date.now(), // Negative ID to indicate temporary
                  nome: nome.trim(),
                  calorias: Number(calorias) || 0,
                  proteinas: Number(proteinas) || 0,
                  carboidratos: Number(carboidratos) || 0,
                  gorduras: Number(gorduras) || 0,
                })
                setNome("")
                setCalorias("")
                setProteinas("")
                setCarboidratos("")
                setGorduras("")
                onClose()
              }}
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
