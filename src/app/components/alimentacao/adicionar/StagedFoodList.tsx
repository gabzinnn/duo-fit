import { StagedFoodItem, type StagedItem } from "./StagedFoodItem"

interface StagedFoodListProps {
  items: StagedItem[]
  onRemove: (id: string) => void
  onManualAdd: () => void
}

export function StagedFoodList({ items, onRemove, onManualAdd }: StagedFoodListProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-2">
        Itens no Prato
      </h3>

      {items.length === 0 ? (
        <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
          <span className="material-symbols-outlined text-3xl mb-2">
            restaurant
          </span>
          <p className="text-sm">Nenhum alimento adicionado ainda</p>
        </div>
      ) : (
        items.map((item) => (
          <StagedFoodItem key={item.id} item={item} onRemove={onRemove} />
        ))
      )}

      <button
        type="button"
        onClick={onManualAdd}
        className="p-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 
          hover:text-primary hover:border-primary hover:bg-primary/5 
          transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <span className="material-symbols-outlined">edit_square</span>
        Não encontrou? Adicione manualmente
      </button>
    </div>
  )
}
