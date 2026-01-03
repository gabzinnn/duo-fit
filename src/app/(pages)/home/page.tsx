import { AppLayout } from "@/app/components/layout"
import { getDashboardData } from "@/app/actions/dashboard"
import { getCalendarData } from "@/app/actions/calendar"
import { HomeContent } from "./HomeContent"

export default async function HomePage() {
  const hoje = new Date()
  const [data, calendarData] = await Promise.all([
    getDashboardData(),
    getCalendarData(hoje.getFullYear(), hoje.getMonth() + 1),
  ])

  return (
    <AppLayout>
      <HomeContent data={data} calendarData={calendarData} />
    </AppLayout>
  )
}