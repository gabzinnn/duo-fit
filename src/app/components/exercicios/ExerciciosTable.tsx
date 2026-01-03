"use client"

import { useMemo } from "react"
import DataTable, { TableColumn } from "react-data-table-component"
import type { ExercicioData } from "@/app/actions/exercicios"

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
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return `Hoje, ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
  } else if (diffDays === 1) {
    return `Ontem, ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
  } else {
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
  }
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

  return (
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
  )
}
