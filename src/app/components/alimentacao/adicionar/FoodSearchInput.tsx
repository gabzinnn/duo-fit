"use client"

import { useState, useEffect, useRef } from "react"
import { buscarAlimentos } from "@/app/actions/buscar-alimentos"
import type { AlimentoNormalizado } from "@/utils/normalizar-alimento"

interface FoodSearchInputProps {
  onSelect: (alimento: AlimentoNormalizado, quantidade: number, unidade: string) => void
  onCreateClick: () => void
}

export function FoodSearchInput({ onSelect, onCreateClick }: FoodSearchInputProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<AlimentoNormalizado[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [quantidade, setQuantidade] = useState(100)
  const [unidade, setUnidade] = useState("g")
  const [selectedFood, setSelectedFood] = useState<AlimentoNormalizado | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      const data = await buscarAlimentos(query)
      setResults(data)
      setLoading(false)
      setShowResults(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelectFood = (alimento: AlimentoNormalizado) => {
    setSelectedFood(alimento)
    setQuery(alimento.nome)
    setShowResults(false)
  }

  const handleAdd = () => {
    if (selectedFood) {
      onSelect(selectedFood, quantidade, unidade)
      setQuery("")
      setSelectedFood(null)
      setQuantidade(100)
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex flex-col gap-6">
        {/* Search */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700">
            O que você comeu?
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <span className="material-symbols-outlined">search</span>
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedFood(null)
              }}
              onFocus={() => results.length > 0 && setShowResults(true)}
              placeholder="Ex: Peito de frango grelhado, Arroz integral..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl 
                focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none 
                transition-all placeholder:text-slate-400 text-slate-900"
            />
            {loading && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2">
                <span className="material-symbols-outlined animate-spin text-slate-400">
                  progress_activity
                </span>
              </span>
            )}

            {/* Results Dropdown */}
            {showResults && results.length > 0 && (
              <div
                ref={resultsRef}
                className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto"
              >
                {results.map((alimento, idx) => (
                  <button
                    key={`${alimento.origem}-${alimento.id ?? idx}`}
                    type="button"
                    onClick={() => handleSelectFood(alimento)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 flex justify-between items-center border-b border-slate-100 last:border-0 cursor-pointer"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{alimento.nome}</p>
                      <p className="text-xs text-slate-500">
                        {alimento.calorias} kcal | P: {alimento.proteinas}g | C:{" "}
                        {alimento.carboidratos}g | G: {alimento.gorduras}g
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        alimento.origem === "LOCAL"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {alimento.origem === "LOCAL" ? "Local" : "API"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center px-1">
            <button
              type="button"
              onClick={onCreateClick}
              className="text-sm text-primary font-medium hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Criar novo alimento
            </button>
            <span className="text-xs text-slate-400">
              Busca local + Open Food Facts
            </span>
          </div>
        </div>

        {/* Quantity Row */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-semibold text-slate-700 mb-2 block">
              Quantidade
            </label>
            <div className="flex items-center">
              <input
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
                className="w-20 sm:w-24 py-3 px-4 bg-slate-50 border border-slate-200 rounded-l-xl 
                  focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none text-slate-900"
              />
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                className="flex-1 py-3 pl-3 pr-4 bg-slate-100 border-y border-r border-slate-200 
                  rounded-r-xl text-slate-700 focus:ring-0 cursor-pointer"
              >
                <option value="g">gramas (g)</option>
                <option value="un">unidades</option>
                <option value="colher">colheres</option>
                <option value="ml">ml</option>
              </select>
            </div>
          </div>
          <div className="sm:self-end">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!selectedFood}
              className="w-full sm:w-auto h-[50px] px-6 sm:px-8 bg-slate-900 text-white font-bold rounded-xl 
                hover:bg-primary transition-all shadow-lg shadow-slate-200 
                flex items-center justify-center gap-2
                disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
