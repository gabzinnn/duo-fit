import Link from "next/link"
import { Button } from "../ui"

interface AlimentacaoHeaderProps {
  dataAtual: string
}

export function AlimentacaoHeader({ dataAtual }: AlimentacaoHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Diário Alimentar
          </h2>
          <p className="text-slate-500 text-sm">{dataAtual}</p>
        </div>
        <Link href="/alimentacao/adicionar">
          <Button
            size="md"
            leftIcon={
              <span className="material-symbols-outlined text-xl">add</span>
            }
          >
            Adicionar Refeição
          </Button>
        </Link>
      </div>
    </header>
  )
}
