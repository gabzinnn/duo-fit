"use client"

interface UserCardProps {
  id: number
  nome: string
  avatar: string | null
  isSelected: boolean
  onSelect: () => void
}

export function UserCard({
  nome,
  avatar,
  isSelected,
  onSelect,
}: UserCardProps) {
  const buttonClasses = [
    "group relative flex flex-col items-center gap-3 p-4 rounded-3xl",
    "transition-all duration-300 hover:bg-slate-50 focus:outline-none cursor-pointer",
    !isSelected && "opacity-60 hover:opacity-100",
  ]
    .filter(Boolean)
    .join(" ")

  const ringClasses = [
    "w-24 h-24 rounded-full p-1 transition-transform group-hover:scale-105",
    isSelected
      ? "bg-linear-to-tr from-primary to-blue-200 shadow-lg shadow-primary/20"
      : "bg-slate-200",
  ].join(" ")

  const avatarClasses = [
    "w-full h-full rounded-full bg-cover bg-center border-4 border-white",
    "flex items-center justify-center",
    !isSelected && "grayscale group-hover:grayscale-0 transition-all",
  ]
    .filter(Boolean)
    .join(" ")

  const nameClasses = [
    "font-semibold text-lg",
    isSelected ? "text-[#101519]" : "text-slate-500",
  ].join(" ")

  return (
    <button type="button" onClick={onSelect} className={buttonClasses}>
      {/* Avatar Container */}
      <div className="relative">
        {/* Avatar Ring */}
        <div className={ringClasses}>
          {/* Avatar Image */}
          <div
            className={avatarClasses}
            style={{
              backgroundImage: avatar
                ? `url('${avatar}')`
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            {!avatar && (
              <span className="text-white text-2xl font-bold select-none">
                {nome.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center bg-green-500 rounded-full border-4 border-white">
            <span className="material-symbols-outlined text-white text-xs font-bold">
              check
            </span>
          </div>
        )}
      </div>

      {/* User Name */}
      <span className={nameClasses}>{nome}</span>
    </button>
  )
}
