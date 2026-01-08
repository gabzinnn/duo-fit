"use client"

import { createContext, useContext, useState, useMemo, type ReactNode } from "react"

interface DateContextType {
    selectedDate: Date
    selectedDateKey: string // YYYY-MM-DD format for API calls
    setSelectedDate: (date: Date) => void
    goToToday: () => void
    goToPrevDay: () => void
    goToNextDay: () => void
    formatSelectedDate: () => string
    isToday: boolean
    isFuture: boolean
}

const DateContext = createContext<DateContextType | null>(null)

// Helper to get Brazil timezone date key
function getTodayBrazilKey(): string {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
}

// Helper to get date key from a Date object in Brazil timezone
function getDateKey(date: Date): string {
    return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
}

// Parse a date key (YYYY-MM-DD) to a local Date at noon (to avoid timezone edge issues)
function parseDateKey(dateKey: string): Date {
    return new Date(dateKey + "T12:00:00")
}

export function DateProvider({ children }: { children: ReactNode }) {
    // Start with today in Brazil timezone
    const [selectedDateKey, setSelectedDateKey] = useState<string>(getTodayBrazilKey)

    const selectedDate = useMemo(() => parseDateKey(selectedDateKey), [selectedDateKey])

    const todayKey = getTodayBrazilKey()

    const isToday = selectedDateKey === todayKey
    const isFuture = selectedDateKey > todayKey

    const setSelectedDate = (date: Date) => {
        setSelectedDateKey(getDateKey(date))
    }

    const goToToday = () => {
        setSelectedDateKey(getTodayBrazilKey())
    }

    const goToPrevDay = () => {
        const prev = new Date(selectedDate)
        prev.setDate(prev.getDate() - 1)
        setSelectedDateKey(getDateKey(prev))
    }

    const goToNextDay = () => {
        const next = new Date(selectedDate)
        next.setDate(next.getDate() + 1)
        setSelectedDateKey(getDateKey(next))
    }

    const formatSelectedDate = () => {
        if (isToday) {
            return "Hoje, " + selectedDate.toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
                timeZone: "America/Sao_Paulo"
            })
        }

        const formatted = selectedDate.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "America/Sao_Paulo"
        })
        return formatted.charAt(0).toUpperCase() + formatted.slice(1)
    }

    const value: DateContextType = {
        selectedDate,
        selectedDateKey,
        setSelectedDate,
        goToToday,
        goToPrevDay,
        goToNextDay,
        formatSelectedDate,
        isToday,
        isFuture
    }

    return <DateContext.Provider value={value}>{children}</DateContext.Provider>
}

export function useDate() {
    const context = useContext(DateContext)
    if (!context) {
        throw new Error("useDate must be used within a DateProvider")
    }
    return context
}
