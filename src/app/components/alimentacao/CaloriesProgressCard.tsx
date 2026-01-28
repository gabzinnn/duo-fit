import type { MacrosData } from "@/app/actions/alimentacao"

interface CaloriesProgressCardProps {
  caloriasIngeridas: number
  metaCalorias: number
  macros: MacrosData
}

export function CaloriesProgressCard({
  caloriasIngeridas,
  metaCalorias,
  macros,
}: CaloriesProgressCardProps) {
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
          <span className="text-sm font-medium text-slate-500">
            de {Math.round(metaCalorias)} kcal
          </span>
        </div>
      </div>

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
