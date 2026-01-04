interface FoodItemProps {
  nome: string
  calorias: number
  quantidade: number
  unidade: string
}

export function FoodItem({ nome, calorias, quantidade, unidade }: FoodItemProps) {
  return (
    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="bg-slate-200 rounded-lg w-10 h-10 flex items-center justify-center">
          <span className="material-symbols-outlined text-slate-500 text-lg">
            restaurant
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-900">{nome}</span>
          <span className="text-xs text-slate-500">
            {quantidade} {unidade}
          </span>
        </div>
      </div>
      <span className="text-sm font-bold text-slate-600">
        {Math.round(calorias)} kcal
      </span>
    </div>
  )
}
