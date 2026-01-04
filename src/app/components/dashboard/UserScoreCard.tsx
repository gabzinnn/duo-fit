interface UserScoreCardProps {
  nome: string
  avatar: string | null
  cor: string
  pontosTotais: number
  pontosHoje: number
  sequenciaAtual: number
  totalExercicios: number
  isLeader: boolean
  isCurrentUser?: boolean
}

export function UserScoreCard({
  nome,
  avatar,
  cor,
  pontosTotais,
  pontosHoje,
  sequenciaAtual,
  totalExercicios,
  isLeader,
  isCurrentUser = false,
}: UserScoreCardProps) {
  const isAmarelo = cor === "AMARELO"
  const colorClasses = isAmarelo
    ? "bg-amber-100 text-amber-600 border-amber-200"
    : "bg-purple-100 text-purple-600 border-purple-200"
  const accentColor = isAmarelo ? "#d97706" : "#9333ea"

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
      {/* Decorative corner */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"
        style={{ backgroundColor: isAmarelo ? "#fef3c7" : "#f3e8ff" }}
      />

      {/* Header */}
      <div className="flex justify-between items-start relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            {/* Crown for leader */}
            {isLeader && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/1 z-10">
                <span 
                  className="material-symbols-outlined text-2xl drop-shadow-sm"
                  style={{ color: "#fbbf24", transform: "rotate(-16deg)", display: "block" }}
                >
                  crown
                </span>
              </div>
            )}
            <div
              className="w-14 h-14 rounded-full bg-cover bg-center border-4"
              style={{
                backgroundImage: avatar
                  ? `url('${avatar}')`
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderColor: isAmarelo ? "#fef3c7" : "#f3e8ff",
              }}
            >
              {!avatar && (
                <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold rounded-full">
                  {nome.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">
              {nome} {isCurrentUser && "(Você)"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black text-slate-900 tracking-tight">
            {pontosTotais.toLocaleString("pt-BR")}
          </p>
          <p
            className="font-medium text-sm flex items-center justify-end gap-1"
            style={{ color: accentColor }}
          >
            <span className="material-symbols-outlined text-sm">
              trending_up
            </span>
            +{pontosHoje} hoje
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center relative z-10">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Sequência Atual
          </span>
          <span className="font-bold text-slate-700">
            {sequenciaAtual} Dias
          </span>
        </div>
        <div className="h-8 w-px bg-slate-200" />
        <div className="flex flex-col gap-1 text-right">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Treinos
          </span>
          <span className="font-bold text-slate-700">
            {totalExercicios} Total
          </span>
        </div>
      </div>
    </div>
  )
}
