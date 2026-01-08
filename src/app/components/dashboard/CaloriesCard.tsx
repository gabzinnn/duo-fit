interface CaloriesCardProps {
  usuarios: {
    usuarioId: number
    nome: string
    cor: string
    caloriasIngeridas: number
    metaCalorias: number
  }[]
}

export function CaloriesCard({ usuarios }: CaloriesCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-6">
        Meta Calórica Diária
      </h3>
      <div className="flex flex-col gap-5">
        {usuarios.map((u) => {
          const percent = Math.min(
            (u.caloriasIngeridas / u.metaCalorias) * 100,
            100
          )
          const isAmarelo = u.cor === "AMARELO"
          const barColor = isAmarelo ? "#ffb900" : "#9333ea"

          return (
            <div key={u.usuarioId}>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-bold text-slate-700">{u.nome}</span>
                <span className="text-slate-500">
                  {u.caloriasIngeridas.toLocaleString("pt-BR")} /{" "}
                  {u.metaCalorias.toLocaleString("pt-BR")} kcal
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: barColor,
                    boxShadow: `0 2px 4px ${barColor}4D`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
