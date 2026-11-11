"use client"

import { useState } from "react"
import type { MacrosData } from "@/app/actions/alimentacao"
import { atualizarMetas, type MetasUsuario } from "@/app/actions/editar-refeicao-historico"

const CAMPOS_META: { chave: keyof MetasUsuario; label: string; unidade: string }[] = [
  { chave: "calorias", label: "Calorias", unidade: "kcal" },
  { chave: "proteinas", label: "Proteínas", unidade: "g" },
  { chave: "carboidratos", label: "Carbos", unidade: "g" },
  { chave: "gorduras", label: "Gorduras", unidade: "g" },
]

interface CaloriesProgressCardProps {
  caloriasIngeridas: number
  metaCalorias: number
  macros: MacrosData
  usuarioId?: number
  editavel?: boolean
  onMetaChange?: () => void
}

export function CaloriesProgressCard({
  caloriasIngeridas,
  metaCalorias,
  macros,
  usuarioId,
  editavel = false,
  onMetaChange,
}: CaloriesProgressCardProps) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<Record<keyof MetasUsuario, string>>({
    calorias: "", proteinas: "", carboidratos: "", gorduras: "",
  })
  const [salvando, setSalvando] = useState(false)

  const iniciarEdicao = () => {
    setForm({
      calorias: String(Math.round(metaCalorias)),
      proteinas: String(Math.round(macros.proteinas.meta)),
      carboidratos: String(Math.round(macros.carboidratos.meta)),
      gorduras: String(Math.round(macros.gorduras.meta)),
    })
    setEditando(true)
  }

  const salvarMetas = async () => {
    if (!usuarioId || salvando) return
    setSalvando(true)
    const result = await atualizarMetas(usuarioId, {
      calorias: Number(form.calorias),
      proteinas: Number(form.proteinas),
      carboidratos: Number(form.carboidratos),
      gorduras: Number(form.gorduras),
    })
    setSalvando(false)
    if (!result.success) {
      alert(result.error)
      return
    }
    setEditando(false)
    onMetaChange?.()
  }

  const percent = Math.min((caloriasIngeridas / metaCalorias) * 100, 100)
  const circumference = 2 * Math.PI * 15.9155
  const caloriasRestantes = Math.max(0, metaCalorias - caloriasIngeridas)
  const excedeu = caloriasIngeridas > metaCalorias

  return (
    <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Status Badge */}
      <div className="absolute top-4 right-4 lg:top-6 lg:right-6">
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
          excedeu 
            ? "bg-red-100 text-red-700" 
            : percent >= 100 
              ? "bg-green-100 text-green-700" 
              : "bg-amber-100 text-amber-700"
        }`}>
          {excedeu ? "Excedido" : percent >= 100 ? "Completo" : "Em progresso"}
        </span>
      </div>

      {/* Circular Progress */}
      <div className="relative w-40 h-40 lg:w-48 lg:h-48 mb-6 mt-4">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
          {/* Background Circle */}
          <path
            className="text-slate-100"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          {/* Progress Circle */}
          <path
            className={`drop-shadow-md transition-all duration-1000 ease-out ${
              excedeu ? "text-red-400" : "text-amber-400"
            }`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeDasharray={`${percent}, 100`}
            strokeLinecap="round"
            strokeWidth="3"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
            {Math.round(caloriasIngeridas)}
          </span>
          <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
            de {Math.round(metaCalorias)} kcal
            {editavel && usuarioId && !editando && (
              <button
                onClick={iniciarEdicao}
                aria-label="Editar metas"
                title="Editar metas (vale a partir de hoje)"
                className="text-slate-400 hover:text-primary cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">edit</span>
              </button>
            )}
          </span>
        </div>
      </div>

      {editando ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            salvarMetas()
          }}
          onKeyDown={(e) => e.key === "Escape" && setEditando(false)}
          className="w-full flex flex-col gap-3"
        >
          <div className="grid grid-cols-2 gap-3">
            {CAMPOS_META.map(({ chave, label, unidade }, i) => (
              <label key={chave} className="flex flex-col gap-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
                {label} ({unidade})
                <input
                  type="number"
                  autoFocus={i === 0}
                  min={0}
                  step="any"
                  required
                  value={form[chave]}
                  disabled={salvando}
                  onChange={(e) => setForm((f) => ({ ...f, [chave]: e.target.value }))}
                  className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 normal-case tracking-normal"
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-400 text-center">Vale a partir de hoje; dias anteriores mantêm a meta antiga.</p>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setEditando(false)}
              disabled={salvando}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-3 py-1.5 text-sm font-bold text-white bg-primary rounded-lg hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      ) : (
      <>
      {/* Macros */}
      <div className="flex gap-6 lg:gap-8 w-full justify-center">
        <MacroProgress
          label="Proteínas"
          atual={macros.proteinas.atual}
          meta={macros.proteinas.meta}
          color="bg-blue-500"
        />
        <MacroProgress
          label="Carbos"
          atual={macros.carboidratos.atual}
          meta={macros.carboidratos.meta}
          color="bg-green-500"
        />
        <MacroProgress
          label="Gorduras"
          atual={macros.gorduras.atual}
          meta={macros.gorduras.meta}
          color="bg-amber-500"
        />
      </div>

      {/* Calorias Restantes */}
      <p className={`mt-4 text-xs font-semibold ${excedeu ? "text-red-600" : "text-emerald-600"}`}>
        {excedeu 
          ? `${Math.round(caloriasIngeridas - metaCalorias)} kcal acima da meta`
          : `${Math.round(caloriasRestantes)} kcal restantes`
        }
      </p>
      </>
      )}
    </div>
  )
}

interface MacroProgressProps {
  label: string
  atual: number
  meta: number
  color: string
}

function MacroProgress({ label, atual, meta, color }: MacroProgressProps) {
  const percent = Math.min((atual / meta) * 100, 100)

  return (
    <div className="text-center">
      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
        {label}
      </p>
      <p className="text-base lg:text-lg font-bold text-slate-900">
        {Math.round(atual)}g
      </p>
      <div className="w-12 h-1 bg-slate-200 rounded-full mt-1 mx-auto">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
