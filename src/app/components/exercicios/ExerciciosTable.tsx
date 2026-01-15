"use client"

import { useMemo, useState, useTransition } from "react"
import DataTable, { TableColumn } from "react-data-table-component"
import { useAuth } from "@/context/AuthContext"
import { Input, Button } from "@/app/components/ui"
import { deleteExercicio, updateExercicio, type ExercicioData } from "@/app/actions/exercicios"
import type { TipoExercicio } from "@/generated/prisma/client"

interface ExerciciosTableProps {
  data: ExercicioData[]
  filterText: string
}

const getExerciseIcon = (tipo: string): { icon: string; bgColor: string; textColor: string } => {
  switch (tipo) {
    case "ACADEMIA":
      return { icon: "fitness_center", bgColor: "bg-blue-50", textColor: "text-blue-600" }
    case "CARDIO":
      return { icon: "directions_run", bgColor: "bg-orange-50", textColor: "text-orange-600" }
    default:
      return { icon: "sports", bgColor: "bg-emerald-50", textColor: "text-emerald-600" }
  }
}

const formatDate = (date: Date): string => {
  const now = new Date()
  const d = new Date(date)
  
  // Compare dates using local date strings to avoid timezone issues
  const nowDate = now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
  const dDate = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
  
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayDate = yesterday.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })

  if (dDate === nowDate) {
    return `Hoje, ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}`
  } else if (dDate === yesterdayDate) {
    return `Ontem, ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}`
  } else {
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
  }
}

const EXERCISE_TYPES = [
  { tipo: "CARDIO" as TipoExercicio, label: "Cardio", icon: "directions_run" },
  { tipo: "ACADEMIA" as TipoExercicio, label: "Musculação", icon: "fitness_center" },
  { tipo: "OUTRO" as TipoExercicio, label: "Outro", icon: "sports" },
]

const customStyles = {
  headRow: {
    style: {
      backgroundColor: "#f8fafc",
      borderBottomWidth: "1px",
      borderBottomColor: "#e2e8f0",
    },
  },
  headCells: {
    style: {
      fontSize: "0.75rem",
      fontWeight: "700",
      color: "#64748b",
      textTransform: "uppercase" as const,
      letterSpacing: "0.05em",
      paddingLeft: "1.5rem",
      paddingRight: "1.5rem",
    },
  },
  cells: {
    style: {
      paddingLeft: "1.5rem",
      paddingRight: "1.5rem",
    },
  },
  rows: {
    style: {
      "&:hover": {
        backgroundColor: "#f8fafc",
      },
    },
  },
}

const paginationComponentOptions = {
  rowsPerPageText: "Linhas por página:",
  rangeSeparatorText: "de",
  selectAllRowsItem: true,
  selectAllRowsItemText: "Todos",
}

export function ExerciciosTable({ data, filterText }: ExerciciosTableProps) {
  const { usuario } = useAuth()
  const [isPending, startTransition] = useTransition()
  
  // Modal states
  const [exercicioToDelete, setExercicioToDelete] = useState<ExercicioData | null>(null)
  const [exercicioToEdit, setExercicioToEdit] = useState<ExercicioData | null>(null)
  
  // Edit form states
  const [editTipo, setEditTipo] = useState<TipoExercicio>("CARDIO")
  const [editNome, setEditNome] = useState("")
  const [editDescricao, setEditDescricao] = useState("")
  const [editDuracao, setEditDuracao] = useState(30)
  const [editError, setEditError] = useState("")

  const filteredData = useMemo(() => {
    if (!filterText) return data
    const lower = filterText.toLowerCase()
    return data.filter(
      (item) =>
        item.nome.toLowerCase().includes(lower) ||
        item.descricao?.toLowerCase().includes(lower) ||
        item.nomeUsuario.toLowerCase().includes(lower)
    )
  }, [data, filterText])

  const handleOpenEdit = (exercicio: ExercicioData) => {
    setExercicioToEdit(exercicio)
    setEditTipo(exercicio.tipo)
    setEditNome(exercicio.nome)
    setEditDescricao(exercicio.descricao || "")
    setEditDuracao(exercicio.duracao)
    setEditError("")
  }

  const handleCloseEdit = () => {
    setExercicioToEdit(null)
    setEditError("")
  }

  const handleDelete = () => {
    if (!exercicioToDelete || !usuario) return
    
    startTransition(async () => {
      try {
        await deleteExercicio(exercicioToDelete.id, usuario.id)
        setExercicioToDelete(null)
      } catch (error) {
        console.error("Erro ao excluir exercício:", error)
      }
    })
  }

  const handleEdit = () => {
    if (!exercicioToEdit || !usuario) return
    
    if (!editNome.trim()) {
      setEditError("Digite o nome do exercício")
      return
    }
    
    if (editDuracao <= 0) {
      setEditError("A duração deve ser maior que 0")
      return
    }

    startTransition(async () => {
      try {
        await updateExercicio(exercicioToEdit.id, usuario.id, {
          tipo: editTipo,
          nome: editNome.trim(),
          descricao: editDescricao.trim() || undefined,
          duracao: editDuracao,
        })
        handleCloseEdit()
      } catch (error) {
        console.error("Erro ao editar exercício:", error)
        setEditError("Erro ao salvar alterações")
      }
    })
  }

  // Calculate estimated points for edit form
  const calcularPontosEdit = () => {
    if (editTipo === "ACADEMIA") return 2
    if (editTipo === "CARDIO") return Math.floor(editDuracao / 30)
    return 1
  }

  const columns: TableColumn<ExercicioData>[] = [
    {
      name: "Tipo de exercício",
      selector: (row) => row.nome,
      sortable: true,
      grow: 2,
      cell: (row) => {
        const { icon, bgColor, textColor } = getExerciseIcon(row.tipo)
        return (
          <div className="flex items-center gap-3 py-2">
            <div className={`p-2 rounded-lg ${bgColor} ${textColor}`}>
              <span className="material-symbols-outlined block text-2xl">{icon}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{row.nome}</p>
              <p className="text-xs text-slate-500">{row.descricao ?? row.tipo}</p>
            </div>
          </div>
        )
      },
    },
    {
      name: "Duração",
      selector: (row) => row.duracao,
      sortable: true,
      cell: (row) => (
        <span className="text-sm font-medium text-slate-700">{row.duracao} min</span>
      ),
    },
    {
      name: "Pontos",
      selector: (row) => row.pontos,
      sortable: true,
      cell: (row) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
          +{row.pontos} pts
        </span>
      ),
    },
    {
      name: "Data",
      selector: (row) => new Date(row.data).getTime(),
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-slate-500">{formatDate(row.data)}</span>
      ),
    },
    {
      name: "Usuário",
      selector: (row) => row.nomeUsuario,
      sortable: true,
      cell: (row) => {
        const isAmarelo = row.corUsuario === "AMARELO"
        const borderClass = isAmarelo ? "border-amber-400" : "border-purple-500"
        const bgClass = isAmarelo ? "bg-amber-100" : "bg-purple-100"
        const textClass = isAmarelo ? "text-amber-700" : "text-purple-700"
        
        // Get initials from name
        const initials = row.nomeUsuario
          .split(" ")
          .map((n) => n[0])
          .join("")
          .substring(0, 2)
          .toUpperCase()

        return (
          <div className="flex items-center gap-2.5">
            {row.avatarUsuario ? (
              <img
                src={row.avatarUsuario}
                alt={row.nomeUsuario}
                className={`w-9 h-9 rounded-full object-cover border-3 ml-3 ${borderClass}`}
              />
            ) : (
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-3 ${borderClass} ${bgClass}`}>
                <span className={`text-xs font-bold ${textClass}`}>{initials}</span>
              </div>
            )}
          </div>
        )
      },
    },
    {
      name: "Ações",
      cell: (row) => {
        // Only show actions if user owns the exercise
        if (row.usuarioId !== usuario?.id) {
          return <span className="text-xs text-slate-400">—</span>
        }
        return (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleOpenEdit(row)}
              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Editar"
            >
              <span className="material-symbols-outlined text-xl">edit</span>
            </button>
            <button
              type="button"
              onClick={() => setExercicioToDelete(row)}
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Excluir"
            >
              <span className="material-symbols-outlined text-xl">delete</span>
            </button>
          </div>
        )
      },
      width: "100px",
    },
  ]

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredData}
          customStyles={customStyles}
          pagination
          paginationPerPage={10}
          paginationRowsPerPageOptions={[5, 10, 15, 20]}
          paginationComponentOptions={paginationComponentOptions}
          noDataComponent={
            <div className="py-12 text-center text-slate-500">
              <span className="material-symbols-outlined text-4xl mb-2 block">fitness_center</span>
              <p>Nenhum exercício encontrado</p>
            </div>
          }
          highlightOnHover
          responsive
        />
      </div>

      {/* Delete Confirmation Modal */}
      {exercicioToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Excluir exercício?</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Tem certeza que deseja excluir <strong>&ldquo;{exercicioToDelete.nome}&rdquo;</strong>? 
                  Isso também removerá os <strong>{exercicioToDelete.pontos} pontos</strong> associados.
                </p>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExercicioToDelete(null)}
                    disabled={isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                    isLoading={isPending}
                    leftIcon={<span className="material-symbols-outlined text-sm">delete</span>}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {exercicioToEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit</span>
                Editar exercício
              </h3>
              <button
                type="button"
                onClick={handleCloseEdit}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-5">
              {/* Type selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Tipo de exercício</label>
                <div className="flex gap-2 flex-wrap">
                  {EXERCISE_TYPES.map((ex) => {
                    const isActive = editTipo === ex.tipo
                    return (
                      <button
                        key={ex.tipo}
                        type="button"
                        onClick={() => setEditTipo(ex.tipo)}
                        className={[
                          "flex items-center gap-2 px-4 py-2 rounded-full transition-all cursor-pointer text-sm",
                          isActive
                            ? "bg-primary text-white shadow-lg shadow-primary/30"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                        ].join(" ")}
                      >
                        <span className="material-symbols-outlined text-lg">{ex.icon}</span>
                        <span className="font-medium">{ex.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nome do exercício</label>
                <Input
                  placeholder="Ex: Corrida 5km, Treino A"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  leftIcon={<span className="material-symbols-outlined">fitness_center</span>}
                />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Duração (minutos)</label>
                <Input
                  type="number"
                  value={editDuracao}
                  onChange={(e) => setEditDuracao(Number(e.target.value))}
                  leftIcon={<span className="material-symbols-outlined">schedule</span>}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Descrição (opcional)</label>
                <Input
                  placeholder="Ex: Parque Ibirapuera, Treino de pernas"
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  leftIcon={<span className="material-symbols-outlined">description</span>}
                />
              </div>

              {/* Points preview */}
              <div className="flex items-center justify-between px-4 py-3 bg-green-50 rounded-xl">
                <span className="text-sm font-medium text-slate-600">Pontos estimados</span>
                <span className="text-lg font-bold text-green-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xl">bolt</span>
                  +{calcularPontosEdit()} pts
                </span>
              </div>

              {/* Error */}
              {editError && (
                <p className="text-red-500 text-sm text-center">{editError}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <Button
                variant="ghost"
                onClick={handleCloseEdit}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEdit}
                isLoading={isPending}
                leftIcon={<span className="material-symbols-outlined">check</span>}
              >
                Salvar alterações
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
