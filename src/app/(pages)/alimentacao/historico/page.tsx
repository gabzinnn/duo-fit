import { AppLayout } from "@/app/components/layout"
import { getHistoricoRefeicoes, getDiasInvalidos } from "@/app/actions/alimentacao"
import { HistoricoRefeicaoContent } from "@/app/components/alimentacao"
import { unstable_noStore as noStore } from "next/cache"

export default async function HistoricoRefeicaoPage() {
  const [refeicoes, diasInvalidos] = await Promise.all([
    getHistoricoRefeicoes(),
    getDiasInvalidos(0), // Will be replaced with actual user, but for now get all
  ])

  // Get all invalid days for all users (merged)
  const allDiasInvalidos = await getAllDiasInvalidos()

  return (
    <AppLayout>
      <HistoricoRefeicaoContent refeicoes={refeicoes} diasInvalidos={allDiasInvalidos} />
    </AppLayout>
  )
}

async function getAllDiasInvalidos(): Promise<string[]> {
  noStore() // Disable caching to always fetch fresh data

  // Import prisma directly since this is a server component
  const prisma = (await import("@/lib/prisma")).default

  const dias = await prisma.caloriasDiarias.findMany({
    where: { registroInvalido: true },
    select: {
      data: true,
      usuarioId: true
    }
  })

  // Create unique keys for each user+date combination
  return dias.map(d => `${d.usuarioId}:${d.data.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`)
}
