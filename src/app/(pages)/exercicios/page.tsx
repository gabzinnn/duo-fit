import { AppLayout } from "@/app/components/layout"
import { getExercicios } from "@/app/actions/exercicios"
import { ExerciciosContent } from "@/app/components/exercicios"

export default async function ExerciciosPage() {
  const exercicios = await getExercicios()

  return (
    <AppLayout>
      <ExerciciosContent exercicios={exercicios} />
    </AppLayout>
  )
}
