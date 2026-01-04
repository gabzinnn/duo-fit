import { TipoRefeicao } from "@/generated/prisma/client"

interface MealTypeSelectorProps {
  selected: TipoRefeicao
  onChange: (tipo: TipoRefeicao) => void
}

const MEAL_TYPES: { tipo: TipoRefeicao; label: string; icon: string }[] = [
  { tipo: "CAFE_DA_MANHA", label: "Café", icon: "bakery_dining" },
  { tipo: "ALMOCO", label: "Almoço", icon: "restaurant" },
  { tipo: "JANTAR", label: "Jantar", icon: "nights_stay" },
  { tipo: "LANCHE", label: "Lanche", icon: "nutrition" },
]

export function MealTypeSelector({ selected, onChange }: MealTypeSelectorProps) {
  return (
    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {MEAL_TYPES.map(({ tipo, label, icon }) => (
          <button
            key={tipo}
            type="button"
            onClick={() => onChange(tipo)}
            className={`
              flex flex-col items-center justify-center py-3 px-2 rounded-lg 
              transition-all cursor-pointer
              ${selected === tipo
                ? "bg-primary/10 text-primary font-bold ring-1 ring-primary/20"
                : "text-slate-500 hover:bg-slate-50"
              }
            `}
          >
            <span className="material-symbols-outlined mb-1 text-[20px]">
              {icon}
            </span>
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
