import type { StagedItem } from "./StagedFoodItem"

interface MealSummaryCardProps {
  items: StagedItem[]
  metaCalorias: number
  caloriasConsumidasHoje: number
  onSave: () => void
  onCancel: () => void
  saving: boolean
}

export function MealSummaryCard({
  items,
  metaCalorias,
  caloriasConsumidasHoje,
  onSave,
  onCancel,
  saving,
}: MealSummaryCardProps) {
  // Calculate totals from items (respect isPreCalculated flag)
  const totals = items.reduce(
    (acc, item) => {
      const fator = item.isPreCalculated ? 1 : item.quantidade / 100
      return {
        calorias: acc.calorias + item.calorias * fator,
        proteinas: acc.proteinas + item.proteinas * fator,
        carboidratos: acc.carboidratos + item.carboidratos * fator,
        gorduras: acc.gorduras + item.gorduras * fator,
      }
    },
    { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0 }
  )

  const caloriasRefeicao = Math.round(totals.calorias)
  const novoTotal = caloriasConsumidasHoje + caloriasRefeicao
  const percentMeta = Math.round((novoTotal / metaCalorias) * 100)
  const percentRefeicao = Math.round((caloriasRefeicao / metaCalorias) * 100)
  const progressAtual = Math.min((caloriasConsumidasHoje / metaCalorias) * 100, 100)
  const progressNovo = Math.min((novoTotal / metaCalorias) * 100, 100)

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 sticky top-24">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">Resumo da Refeição</h3>
        <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wide">
          Prévia
        </span>
      </div>

      {/* Main Calorie Counter */}
      <div className="flex flex-col items-center justify-center py-4 relative">
        <div className="relative w-40 h-40">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-100"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="text-primary transition-all duration-500"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeDasharray={`${Math.min((caloriasRefeicao / 1000) * 100, 100)}, 100`}
              strokeLinecap="round"
              strokeWidth="3"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-slate-900 tracking-tight">
              {caloriasRefeicao}
            </span>
            <span className="text-xs font-medium text-slate-500 uppercase">
              kcal
            </span>
          </div>
        </div>
      </div>

      {/* Macros Breakdown */}
      <div className="grid grid-cols-3 gap-2 my-6">
        <MacroBox
          label="Carbs"
          value={Math.round(totals.carboidratos)}
          color="blue"
          percent={(totals.carboidratos / 250) * 100}
        />
        <MacroBox
          label="Prot"
          value={Math.round(totals.proteinas)}
          color="purple"
          percent={(totals.proteinas / 150) * 100}
        />
        <MacroBox
          label="Gord"
          value={Math.round(totals.gorduras)}
          color="yellow"
          percent={(totals.gorduras / 65) * 100}
        />
      </div>

      {/* Daily Goal Impact */}
      <div className="mb-6 space-y-3">
        <div className="flex justify-between items-end">
          <span className="text-sm font-medium text-slate-500">Meta Diária</span>
          <span className="text-sm font-bold text-slate-900">
            {novoTotal.toLocaleString("pt-BR")} / {metaCalorias.toLocaleString("pt-BR")} kcal
          </span>
        </div>
        <div className="relative h-4 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-slate-300 z-10 transition-all duration-300"
            style={{ width: `${progressAtual}%` }}
          />
          <div
            className="absolute top-0 left-0 h-full bg-primary z-0 transition-all duration-300"
            style={{ width: `${progressNovo}%` }}
          />
        </div>
        {caloriasRefeicao > 0 && (
          <p className="text-xs text-center text-slate-500">
            Essa refeição adiciona{" "}
            <span className="font-bold text-primary">+{percentRefeicao}%</span> à
            sua meta.
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={items.length === 0 || saving}
          className="flex-1 py-4 px-6 bg-primary hover:bg-blue-600 text-white rounded-xl 
            font-bold text-lg shadow-lg shadow-blue-500/30 transition-all 
            transform hover:-translate-y-0.5 active:translate-y-0
            disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
        >
          {saving ? "Salvando..." : "Salvar Refeição"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-4 text-slate-500 hover:text-slate-900 font-semibold transition-colors cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

interface MacroBoxProps {
  label: string
  value: number
  color: "blue" | "purple" | "yellow"
  percent: number
}

function MacroBox({ label, value, color, percent }: MacroBoxProps) {
  const colors = {
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-600",
      bar: "bg-blue-200",
      fill: "bg-blue-500",
    },
    purple: {
      bg: "bg-purple-50",
      text: "text-purple-600",
      bar: "bg-purple-200",
      fill: "bg-purple-500",
    },
    yellow: {
      bg: "bg-yellow-50",
      text: "text-yellow-600",
      bar: "bg-yellow-200",
      fill: "bg-yellow-500",
    },
  }

  const c = colors[color]

  return (
    <div className={`flex flex-col items-center p-2 rounded-lg ${c.bg}`}>
      <span className={`text-xs font-medium mb-1 ${c.text}`}>{label}</span>
      <span className="text-lg font-bold text-slate-900">{value}g</span>
      <div className={`w-full h-1 ${c.bar} rounded-full mt-2 overflow-hidden`}>
        <div
          className={`h-full ${c.fill} transition-all duration-300`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  )
}
