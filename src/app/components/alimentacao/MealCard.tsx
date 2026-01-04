import Link from "next/link"
import { TipoRefeicao } from "@/generated/prisma/client"
import { FoodItem } from "./FoodItem"
import type { AlimentoItem } from "@/app/actions/alimentacao"

interface MealCardProps {
  tipo: TipoRefeicao
  horario: string
  totalCalorias: number
  alimentos: AlimentoItem[]
}

const TIPO_CONFIG: Record<TipoRefeicao, {
  label: string
  icon: string
  bgColor: string
  textColor: string
}> = {
  CAFE_DA_MANHA: {
    label: "Café da Manhã",
    icon: "bakery_dining",
    bgColor: "bg-orange-100",
    textColor: "text-orange-600",
  },
  ALMOCO: {
    label: "Almoço",
    icon: "soup_kitchen",
    bgColor: "bg-green-100",
    textColor: "text-green-600",
  },
  LANCHE: {
    label: "Lanche da Tarde",
    icon: "nutrition",
    bgColor: "bg-purple-100",
    textColor: "text-purple-600",
  },
  JANTAR: {
    label: "Jantar",
    icon: "dinner_dining",
    bgColor: "bg-blue-100",
    textColor: "text-blue-600",
  },
}

export function MealCard({
  tipo,
  horario,
  totalCalorias,
  alimentos,
}: MealCardProps) {
  const config = TIPO_CONFIG[tipo]
  const temAlimentos = alimentos.length > 0

  return (
    <div
      className={`
        bg-white rounded-2xl p-6 shadow-sm border border-slate-100 
        group hover:shadow-md transition-all
        ${!temAlimentos ? "opacity-70 hover:opacity-100" : ""}
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${config.bgColor} ${config.textColor}
            `}
          >
            <span className="material-symbols-outlined">{config.icon}</span>
          </div>
          <div>
            <h4 className="font-bold text-slate-900">{config.label}</h4>
            <p className="text-xs text-slate-500">
              {temAlimentos
                ? `${horario} • ${Math.round(totalCalorias)} kcal`
                : "Ainda não registrado"}
            </p>
          </div>
        </div>
        <Link
          href={`/alimentacao/adicionar?tipo=${tipo}`}
          className={`
            w-10 h-10 flex items-center justify-center rounded-full transition-colors cursor-pointer
            ${temAlimentos
              ? "text-slate-400 hover:text-primary hover:bg-primary/10"
              : "bg-primary/20 text-slate-900 hover:bg-primary"
            }
          `}
        >
          <span className="material-symbols-outlined">
            {temAlimentos ? "add_circle" : "add"}
          </span>
        </Link>
      </div>

      {/* Content */}
      {temAlimentos ? (
        <div className="space-y-3">
          {alimentos.map((alimento) => (
            <FoodItem
              key={alimento.id}
              nome={alimento.nome}
              calorias={alimento.calorias}
              quantidade={alimento.quantidade}
              unidade={alimento.unidade}
            />
          ))}
        </div>
      ) : (
        <Link
          href={`/alimentacao/adicionar?tipo=${tipo}`}
          className="flex items-center justify-center h-20 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-primary hover:text-primary transition-colors cursor-pointer"
        >
          <span className="text-sm">Toque no + para adicionar</span>
        </Link>
      )}
    </div>
  )
}
