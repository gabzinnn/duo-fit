import { MEAL_ICONS } from "@/app/components/alimentacao/mealIcons"

interface MealIconPickerProps {
  selected: string
  onChange: (icone: string) => void
}

export function MealIconPicker({ selected, onChange }: MealIconPickerProps) {
  return (
    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {Object.entries(MEAL_ICONS).map(([nome, Icon]) => (
          <button
            key={nome}
            type="button"
            onClick={() => onChange(nome)}
            className={`
              flex items-center justify-center py-3 rounded-lg
              transition-all cursor-pointer
              ${selected === nome
                ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                : "text-slate-500 hover:bg-slate-50"
              }
            `}
            title={nome}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>
    </div>
  )
}
