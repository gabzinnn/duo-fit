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
        data: string // formato dd/mm/yyyy
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
        id: string
        usuarioId: number
        nomeUsuario: string
        corUsuario: string
        tipo: string
        descricao: string
        destaque: string // "+2pts" para exercício, "540 kcal" para refeição
        icone: string | null
        data: Date
    }[]
}

const NOMES_REFEICAO: Record<string, string> = {
    CAFE_DA_MANHA: "Café da Manhã",
    ALMOCO: "Almoço",
    JANTAR: "Jantar",
    LANCHE: "Lanche",
    OUTRO: "Refeição",
}

export async function getDashboardData(): Promise<DashboardData> {
    noStore()

    const todayBrazilDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
    const hoje = new Date(todayBrazilDate + "T00:00:00.000Z")

    // Get all users with their stats
    const usuarios = await prisma.usuario.findMany({
        include: {
            sequencias: true,
            _count: {
                select: { exercicios: {
                    where: {
                        tipo: "ACADEMIA"
                    }
                } },
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

    // Busca todo o histórico de pontos para permitir visualização por semanas/meses
    const evolucao = await prisma.pontuacaoDiaria.findMany({
        where: {
            data: {
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

    // Today's activity feed comes straight from exercises and meals (Brazil day boundaries),
    // so edits/deletes are always reflected. The Atividade table was never populated.
    const periodoHoje = {
        gte: new Date(todayBrazilDate + "T00:00:00.000-03:00"),
        lte: new Date(todayBrazilDate + "T23:59:59.999-03:00"),
    }
    const [exerciciosHoje, refeicoesHoje] = await Promise.all([
        prisma.exercicio.findMany({ where: { data: periodoHoje } }),
        prisma.refeicao.findMany({ where: { data: periodoHoje } }),
    ])

    // Map activities with user info
    const usuarioMap = new Map(usuarios.map((u) => [u.id, u]))

    // Build response
    const usuariosData = await Promise.all(usuarios.map(async (u) => {
        const pts = pontosTotais.find((p) => p.usuarioId === u.id)
        const ptsHoje = pontosHoje.find((p) => p.usuarioId === u.id)
        let sequenciaAtual = u.sequencias[0]?.sequenciaAtual ?? 0

        if (!u.sequencias[0] && u._count.exercicios > 0) {
            const diasComPontos = await prisma.pontuacaoDiaria.findMany({
                where: { usuarioId: u.id },
                orderBy: { data: "desc" },
                select: { data: true },
            })

            if (diasComPontos.length > 0) {
                let streak = 0
                let currentDateCheck = new Date(hoje)

                for (const dia of diasComPontos) {
                    const diaKey = dia.data.toISOString().split("T")[0]
                    const checkKey = currentDateCheck.toISOString().split("T")[0]

                    if (diaKey === checkKey) {
                        streak++
                        currentDateCheck.setDate(currentDateCheck.getDate() - 1)
                    } else if (diaKey < checkKey) {
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

    usuariosData.sort((a, b) => b.pontosTotais - a.pontosTotais)

    // Formata data do banco (UTC midnight) para dd/mm/yyyy
    const formatDateFromDb = (date: Date): string => {
        const day = String(date.getUTCDate()).padStart(2, "0")
        const month = String(date.getUTCMonth() + 1).padStart(2, "0")
        const year = date.getUTCFullYear()
        return `${day}/${month}/${year}`
    }

    // Build evolution data - agrupa por data
    const evolucaoMap = new Map<string, { usuario1: number; usuario2: number }>()

    for (const e of evolucao) {
        const dateKey = formatDateFromDb(e.data)

        if (!evolucaoMap.has(dateKey)) {
            evolucaoMap.set(dateKey, { usuario1: 0, usuario2: 0 })
        }

        const entry = evolucaoMap.get(dateKey)!
        // Same order as usuariosData (leader first), which is how the chart labels the series
        if (e.usuarioId === usuariosData[0]?.id) {
            entry.usuario1 = e.pontosTotais
        } else if (e.usuarioId === usuariosData[1]?.id) {
            entry.usuario2 = e.pontosTotais
        }
    }

    // Gera array de todos os dias desde o primeiro registro de pontos
    const evolucaoPontos: DashboardData["evolucaoPontos"] = []

    const primeiraData = evolucao[0]?.data ?? hoje
    const diasTotais = Math.max(
        0,
        Math.round((hoje.getTime() - primeiraData.getTime()) / (1000 * 60 * 60 * 24))
    )

    for (let i = diasTotais; i >= 0; i--) {
        const targetDate = new Date(hoje)
        targetDate.setUTCDate(targetDate.getUTCDate() - i)
        const dateKey = formatDateFromDb(targetDate)

        const entry = evolucaoMap.get(dateKey)
        evolucaoPontos.push({
            data: dateKey,
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

    const comUsuario = (usuarioId: number) => {
        const user = usuarioMap.get(usuarioId)
        return { usuarioId, nomeUsuario: user?.nome ?? "Usuário", corUsuario: user?.cor ?? "AMARELO" }
    }

    const atividadesHoje: DashboardData["atividadesHoje"] = [
        ...exerciciosHoje.map((e) => ({
            id: `exercicio-${e.id}`,
            ...comUsuario(e.usuarioId),
            tipo: "exercicio",
            descricao: e.nome,
            destaque: `+${e.pontos}pts`,
            icone: e.tipo === "ACADEMIA" ? "fitness_center" : "directions_run",
            data: e.data,
        })),
        ...refeicoesHoje.map((r) => ({
            id: `refeicao-${r.id}`,
            ...comUsuario(r.usuarioId),
            tipo: "refeicao",
            descricao: r.nome || NOMES_REFEICAO[r.tipo],
            destaque: `${Math.round(r.totalCalorias)} kcal`,
            icone: null, // Refeicao.icone is a Lucide name; the feed uses Material Symbols ("restaurant" fallback)
            data: r.data,
        })),
    ].sort((a, b) => b.data.getTime() - a.data.getTime())

    return {
        usuarios: usuariosData,
        evolucaoPontos,
        caloriasDiarias,
        atividadesHoje,
    }
}