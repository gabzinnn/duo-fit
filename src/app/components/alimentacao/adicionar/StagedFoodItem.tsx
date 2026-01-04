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
}

interface StagedFoodItemProps {
  item: StagedItem
  onRemove: (id: string) => void
}

export function StagedFoodItem({ item, onRemove }: StagedFoodItemProps) {
  // Calculate macros based on quantity
  const fator = item.quantidade / 100
  const calorias = Math.round(item.calorias * fator)
  const proteinas = Math.round(item.proteinas * fator)

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-primary/50 transition-colors">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <span className="material-symbols-outlined">restaurant</span>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-slate-900 truncate">{item.nome}</h4>
        <p className="text-sm text-slate-500">
          {item.quantidade} {item.unidade} • {proteinas}g Proteína
        </p>
      </div>
      <div className="text-right">
        <span className="block font-bold text-slate-900">{calorias} kcal</span>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity font-medium cursor-pointer"
        >
          Remover
        </button>
      </div>
    </div>
  )
}
