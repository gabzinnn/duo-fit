import { cookies } from "next/headers"
import { AppLayout } from "@/app/components/layout"
import { AddExercicioContent } from "@/app/components/exercicios"
import { getSequenciaUsuario } from "@/app/actions/sequencia"

async function getUsuarioIdFromCookie(): Promise<number | null> {
  const cookieStore = await cookies()
  const usuarioData = cookieStore.get("@DuoFit:usuario")
  if (!usuarioData?.value) return null
  try {
    const parsed = JSON.parse(usuarioData.value)
    return parsed.id ?? null
  } catch {
    return null
  }
}

export default async function AddExercicioPage() {
  // Try to get user from cookie, fallback to 0 (will be handled client-side)
  const usuarioId = await getUsuarioIdFromCookie()
  const sequenciaAtual = usuarioId ? await getSequenciaUsuario(usuarioId) : 0

  return (
    <AppLayout>
      <AddExercicioContent sequenciaAtual={sequenciaAtual} />
    </AppLayout>
  )
}
