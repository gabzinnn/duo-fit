"use server"

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
    // Get first and last day of month
    const primeiroDia = new Date(ano, mes - 1, 1)
    const ultimoDia = new Date(ano, mes, 0)

    // Get all users
    const usuarios = await prisma.usuario.findMany({
        select: { id: true, cor: true },
    })

    const usuarioMap = new Map(usuarios.map((u) => [u.id, u.cor]))

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

    // Get calories for the month where goal was met
    const caloriasMeta = await prisma.caloriasDiarias.findMany({
        where: {
            data: {
                gte: primeiroDia,
                lte: ultimoDia,
            },
            metaAtingida: true,
        },
        select: {
            usuarioId: true,
            data: true,
        },
    })

    // Group exercises by date
    const exerciciosPorDia = new Map<string, Set<number>>()
    for (const e of exercicios) {
        const dateKey = e.data.toISOString().split("T")[0]
        if (!exerciciosPorDia.has(dateKey)) {
            exerciciosPorDia.set(dateKey, new Set())
        }
        exerciciosPorDia.get(dateKey)!.add(e.usuarioId)
    }

    // Group calories by date
    const caloriasPorDia = new Map<string, Set<number>>()
    for (const c of caloriasMeta) {
        const dateKey = c.data.toISOString().split("T")[0]
        if (!caloriasPorDia.has(dateKey)) {
            caloriasPorDia.set(dateKey, new Set())
        }
        caloriasPorDia.get(dateKey)!.add(c.usuarioId)
    }

    // Build response
    const exerciciosData: CalendarDay[] = []
    for (const [date, userIds] of exerciciosPorDia) {
        exerciciosData.push({
            date,
            usuarios: Array.from(userIds).map((id) => ({
                usuarioId: id,
                cor: usuarioMap.get(id) ?? "AMARELO",
            })),
        })
    }

    const caloriasData: CalendarDay[] = []
    for (const [date, userIds] of caloriasPorDia) {
        caloriasData.push({
            date,
            usuarios: Array.from(userIds).map((id) => ({
                usuarioId: id,
                cor: usuarioMap.get(id) ?? "AMARELO",
            })),
        })
    }

    return {
        exercicios: exerciciosData,
        calorias: caloriasData,
    }
}
