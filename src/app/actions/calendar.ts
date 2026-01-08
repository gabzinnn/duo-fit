"use server"

import { unstable_noStore as noStore } from "next/cache"
import prisma from "@/lib/prisma"

export interface CalendarDay {
    date: string // YYYY-MM-DD
    usuarios: {
        usuarioId: number
        cor: string
    }[]
}

export interface CalendarData {
    exercicios: CalendarDay[]
    calorias: CalendarDay[]
}

export async function getCalendarData(
    ano: number,
    mes: number
): Promise<CalendarData> {
    noStore() // Disable caching to always fetch fresh data

    // Use UTC dates for database queries (since @db.Date stores as UTC midnight)
    const primeiroDia = new Date(Date.UTC(ano, mes - 1, 1))
    const ultimoDia = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999))

    // Get all users with their calorie goals
    const usuarios = await prisma.usuario.findMany({
        select: { id: true, cor: true, metaCalorias: true },
    })

    const usuarioMap = new Map(usuarios.map((u) => [u.id, { cor: u.cor, meta: u.metaCalorias }]))

    // Get exercises for the month (grouped by day and user)
    const exercicios = await prisma.exercicio.findMany({
        where: {
            data: {
                gte: primeiroDia,
                lte: ultimoDia,
            },
        },
        select: {
            usuarioId: true,
            data: true,
        },
    })

    // Get ALL calorie records for the month (not just metaAtingida=true)
    // We'll calculate if goal was met dynamically
    const caloriasRecords = await prisma.caloriasDiarias.findMany({
        where: {
            data: {
                gte: primeiroDia,
                lte: ultimoDia,
            },
            registroInvalido: false, // Exclude days marked as invalid
        },
        select: {
            usuarioId: true,
            data: true,
            caloriasIngeridas: true,
            metaCalorias: true,
        },
    })

    // Group exercises by date (use UTC getters since data is stored as UTC)
    const exerciciosPorDia = new Map<string, Set<number>>()
    for (const e of exercicios) {
        // For DateTime fields, extract the Brazil date
        const dateKey = e.data.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
        if (!exerciciosPorDia.has(dateKey)) {
            exerciciosPorDia.set(dateKey, new Set())
        }
        exerciciosPorDia.get(dateKey)!.add(e.usuarioId)
    }

    // Group calories by date - only include if goal was met (calorias <= meta AND calorias > 0)
    const caloriasPorDia = new Map<string, Set<number>>()
    for (const c of caloriasRecords) {
        // For @db.Date fields, use UTC getters (stored as UTC midnight)
        const year = c.data.getUTCFullYear()
        const month = String(c.data.getUTCMonth() + 1).padStart(2, "0")
        const day = String(c.data.getUTCDate()).padStart(2, "0")
        const dateKey = `${year}-${month}-${day}`

        // Get user's actual meta (fallback to record's meta or default)
        const userInfo = usuarioMap.get(c.usuarioId)
        const metaCalorias = c.metaCalorias || userInfo?.meta || 2000

        // Goal is met if calories are > 0 AND <= meta (under the limit for diet)
        const goalMet = c.caloriasIngeridas > 0 && c.caloriasIngeridas <= metaCalorias

        if (goalMet) {
            if (!caloriasPorDia.has(dateKey)) {
                caloriasPorDia.set(dateKey, new Set())
            }
            caloriasPorDia.get(dateKey)!.add(c.usuarioId)
        }
    }

    // Build response
    const exerciciosData: CalendarDay[] = []
    for (const [date, userIds] of exerciciosPorDia) {
        exerciciosData.push({
            date,
            usuarios: Array.from(userIds).map((id) => ({
                usuarioId: id,
                cor: usuarioMap.get(id)?.cor ?? "AMARELO",
            })),
        })
    }

    const caloriasData: CalendarDay[] = []
    for (const [date, userIds] of caloriasPorDia) {
        caloriasData.push({
            date,
            usuarios: Array.from(userIds).map((id) => ({
                usuarioId: id,
                cor: usuarioMap.get(id)?.cor ?? "AMARELO",
            })),
        })
    }

    return {
        exercicios: exerciciosData,
        calorias: caloriasData,
    }
}

