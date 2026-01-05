import { fixHistoricalCaloriasMeta } from "@/app/actions/fix-calorias"
import { redirect } from "next/navigation"

export default async function FixCaloriasPage() {
    const result = await fixHistoricalCaloriasMeta()
    
    console.log("Fix result:", result)
    
    redirect(`/home?fixed=${result.recordsFixed}&points=${result.pointsAwarded}`)
}
