"use server"

import { unstable_noStore as noStore } from "next/cache"
import prisma from "@/lib/prisma"

export interface DashboardData {
    usuarios: {
        id: number
        nome: string
        avatar: string | null
        cor: string
        pontosTotais: number
        pontosHoje: number
        sequenciaAtual: number
        totalExercicios: number
    }[]
    evolucaoPontos: {
        data: string
        usuario1: number
        usuario2: number
    }[]
    caloriasDiarias: {
        usuarioId: number
        nome: string
        cor: string
        caloriasIngeridas: number
        metaCalorias: number
    }[]
    atividadesHoje: {
        id: number
        usuarioId: number
        nomeUsuario: string
        corUsuario: string
        tipo: string
        descricao: string
        pontos: number
        icone: string | null
        data: Date
    }[]
}

export async function getDashboardData(): Promise<DashboardData> {
    noStore() // Disable caching to always fetch fresh data

    // Create date in Brazil timezone, then convert to UTC midnight for @db.Date
    const todayBrazilDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
    const hoje = new Date(todayBrazilDate + "T00:00:00.000Z") // UTC midnight for @db.Date

    // Get all users with their stats
    const usuarios = await prisma.usuario.findMany({
        include: {
            sequencias: true,
            _count: {
                select: { exercicios: true },
            },
        },
        orderBy: { id: "asc" },
    })

    // Get today's points for each user
    const pontosHoje = await prisma.pontuacaoDiaria.findMany({
        where: {
            data: hoje,
        },
    })

    // Get total points for each user
    const pontosTotais = await prisma.pontuacaoDiaria.groupBy({
        by: ["usuarioId"],
        _sum: {
            pontosTotais: true,
        },
    })

    // Get last 7 days evolution
    const seteDiasAtras = new Date(hoje)
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 6)

    const evolucao = await prisma.pontuacaoDiaria.findMany({
        where: {
            data: {
                gte: seteDiasAtras,
                lte: hoje,
            },
        },
        orderBy: { data: "asc" },
    })

    // Get today's calories
    const calorias = await prisma.caloriasDiarias.findMany({
        where: {
            data: hoje,
        },
        include: {
            usuario: {
                select: { nome: true, cor: true },
            },
        },
    })

    // Get today's activities
    const atividades = await prisma.atividade.findMany({
        where: {
            data: {
                gte: hoje,
            },
        },
        orderBy: { data: "desc" },
        take: 10,
    })

    // Map activities with user info
    const usuarioMap = new Map(usuarios.map((u) => [u.id, u]))

    // Build response
    const usuariosData = await Promise.all(usuarios.map(async (u) => {
        const pts = pontosTotais.find((p) => p.usuarioId === u.id)
        const ptsHoje = pontosHoje.find((p) => p.usuarioId === u.id)
        let sequenciaAtual = u.sequencias[0]?.sequenciaAtual ?? 0

        // If no sequence record exists, calculate from exercise history
        if (!u.sequencias[0] && u._count.exercicios > 0) {
            // Get all daily point records for this user, ordered by date desc
            const diasComPontos = await prisma.pontuacaoDiaria.findMany({
                where: { usuarioId: u.id },
                orderBy: { data: "desc" },
                select: { data: true },
            })

            if (diasComPontos.length > 0) {
                // Calculate streak by checking consecutive days
                let streak = 0
                const todayKey = hoje.toISOString().split("T")[0]
                let currentDateCheck = new Date(hoje)

                for (const dia of diasComPontos) {
                    const diaKey = dia.data.toISOString().split("T")[0]
                    const checkKey = currentDateCheck.toISOString().split("T")[0]

                    if (diaKey === checkKey) {
                        streak++
                        currentDateCheck.setDate(currentDateCheck.getDate() - 1)
                    } else if (diaKey < checkKey) {
                        // Gap found, stop counting
                        break
                    }
                }
                sequenciaAtual = streak
            }
        }

        return {
            id: u.id,
            nome: u.nome,
            avatar: u.avatar,
            cor: u.cor,
            pontosTotais: pts?._sum.pontosTotais ?? 0,
            pontosHoje: ptsHoje?.pontosTotais ?? 0,
            sequenciaAtual,
            totalExercicios: u._count.exercicios,
        }
    }))

    // Sort by points (leader first)
    usuariosData.sort((a, b) => b.pontosTotais - a.pontosTotais)

    // Build evolution data - group by date string from database
    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    const evolucaoPontos: DashboardData["evolucaoPontos"] = []

    // Get day of week in Brazil timezone from a date
    const getDiaSemana = (date: Date) => {
        const brazilDateStr = date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
        const brazilDate = new Date(brazilDateStr)
        return diasSemana[brazilDate.getDay()]
    }

    // For @db.Date fields, the database stores just the date (no time).
    // Prisma returns them as midnight UTC. We extract using UTC getters to avoid timezone shift.
    const getDateKeyFromDbDate = (date: Date) => {
        const year = date.getUTCFullYear()
        const month = String(date.getUTCMonth() + 1).padStart(2, "0")
        const day = String(date.getUTCDate()).padStart(2, "0")
        return `${year}-${month}-${day}`
    }

    // For the day of week label, we use the UTC date directly since it represents the actual day stored
    const getDiaSemanaFromDbDate = (date: Date) => {
        return diasSemana[date.getUTCDay()]
    }

    // Get date key for "today" in Brazil timezone
    const getTodayDateKey = () => {
        const now = new Date()
        return now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
    }

    // Build map of evolution data by date
    const evolucaoMap = new Map<string, { usuario1: number; usuario2: number; diaSemana: string }>()

    for (const e of evolucao) {
        const dateKey = getDateKeyFromDbDate(e.data)
        const diaSemana = getDiaSemanaFromDbDate(e.data)

        if (!evolucaoMap.has(dateKey)) {
            evolucaoMap.set(dateKey, { usuario1: 0, usuario2: 0, diaSemana })
        }

        const entry = evolucaoMap.get(dateKey)!
        if (e.usuarioId === usuarios[0]?.id) {
            entry.usuario1 = e.pontosTotais
        } else if (e.usuarioId === usuarios[1]?.id) {
            entry.usuario2 = e.pontosTotais
        }
    }

    // Get last 7 days including today (using Brazil timezone for "today")
    const todayBrazil = getTodayDateKey()
    const todayDate = new Date(todayBrazil + "T12:00:00") // Use noon to avoid date boundary issues

    for (let i = 6; i >= 0; i--) {
        const targetDate = new Date(todayDate)
        targetDate.setDate(targetDate.getDate() - i)
        const dateKey = targetDate.toISOString().split("T")[0] // YYYY-MM-DD in local time
        const diaSemana = diasSemana[targetDate.getDay()]

        const entry = evolucaoMap.get(dateKey)
        evolucaoPontos.push({
            data: entry?.diaSemana ?? diaSemana,
            usuario1: entry?.usuario1 ?? 0,
            usuario2: entry?.usuario2 ?? 0,
        })
    }

    // Build caloriasDiarias ensuring ALL users are present
    const caloriasMap = new Map(calorias.map((c) => [c.usuarioId, c]))

    const caloriasDiarias = usuarios.map((u) => {
        const record = caloriasMap.get(u.id)
        return {
            usuarioId: u.id,
            nome: u.nome,
            cor: u.cor,
            caloriasIngeridas: record?.caloriasIngeridas ?? 0,
            metaCalorias: record?.metaCalorias ?? u.metaCalorias,
        }
    })

    const atividadesHoje = atividades.map((a) => {
        const user = usuarioMap.get(a.usuarioId)
        return {
            id: a.id,
            usuarioId: a.usuarioId,
            nomeUsuario: user?.nome ?? "Usuário",
            corUsuario: user?.cor ?? "AMARELO",
            tipo: a.tipo,
            descricao: a.descricao,
            pontos: a.pontos,
            icone: a.icone,
            data: a.data,
        }
    })

    return {
        usuarios: usuariosData,
        evolucaoPontos,
        caloriasDiarias,
        atividadesHoje,
    }
}
