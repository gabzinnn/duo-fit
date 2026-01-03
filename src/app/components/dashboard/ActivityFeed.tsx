interface ActivityFeedProps {
  atividades: {
    id: number
    usuarioId: number
    nomeUsuario: string
    corUsuario: string
    tipo: string
    descricao: string
    pontos: number
    icone: string | null
    data: Date
  }[]
}

export function ActivityFeed({ atividades }: ActivityFeedProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getIcon = (tipo: string, icone: string | null) => {
    if (icone) return icone
    switch (tipo) {
      case "exercicio":
        return "directions_run"
      case "refeicao":
        return "restaurant"
      case "agua":
        return "water_drop"
      default:
        return "check_circle"
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex-1 flex flex-col">
      <h3 className="text-lg font-bold text-slate-900 mb-4">
        Atividade de Hoje
      </h3>
      <div className="flex-1 flex flex-col gap-2">
        {atividades.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <span className="material-symbols-outlined text-4xl mb-2 block">
                event_busy
              </span>
              <p className="text-sm">Nenhuma atividade hoje</p>
            </div>
          </div>
        ) : (
          atividades.map((a) => {
            const isAmarelo = a.corUsuario === "AMARELO"
            const bgColor = isAmarelo ? "bg-amber-100" : "bg-purple-100"
            const textColor = isAmarelo ? "text-amber-600" : "text-purple-600"

            return (
              <div
                key={a.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div
                  className={`w-10 h-10 rounded-full ${bgColor} ${textColor} flex items-center justify-center shrink-0`}
                >
                  <span className="material-symbols-outlined text-xl">
                    {getIcon(a.tipo, a.icone)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {a.descricao}
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.nomeUsuario} • {formatTime(a.data)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-green-600">
                    +{a.pontos}pts
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
