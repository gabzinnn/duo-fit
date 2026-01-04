import { Suspense } from "react"
import { AppLayout } from "@/app/components/layout"
import { AddMealContent } from "@/app/components/alimentacao/adicionar"

export default function AdicionarRefeicaoPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="p-8 text-center">Carregando...</div>}>
        <AddMealContent />
      </Suspense>
    </AppLayout>
  )
}
