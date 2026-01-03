"use server"

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
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

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
    const usuariosData = usuarios.map((u) => {
        const pts = pontosTotais.find((p) => p.usuarioId === u.id)
        const ptsHoje = pontosHoje.find((p) => p.usuarioId === u.id)
        const seq = u.sequencias[0]

        return {
            id: u.id,
            nome: u.nome,
            avatar: u.avatar,
            cor: u.cor,
            pontosTotais: pts?._sum.pontosTotais ?? 0,
            pontosHoje: ptsHoje?.pontosTotais ?? 0,
            sequenciaAtual: seq?.sequenciaAtual ?? 0,
            totalExercicios: u._count.exercicios,
        }
    })

    // Sort by points (leader first)
    usuariosData.sort((a, b) => b.pontosTotais - a.pontosTotais)

    // Build evolution data
    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    const evolucaoPontos: DashboardData["evolucaoPontos"] = []

    for (let i = 0; i < 7; i++) {
        const data = new Date(seteDiasAtras)
        data.setDate(data.getDate() + i)
        const dataStr = diasSemana[data.getDay()]

        const u1 = evolucao.find(
            (e) =>
                e.usuarioId === usuarios[0]?.id &&
                e.data.toDateString() === data.toDateString()
        )
        const u2 = evolucao.find(
            (e) =>
                e.usuarioId === usuarios[1]?.id &&
                e.data.toDateString() === data.toDateString()
        )

        evolucaoPontos.push({
            data: dataStr,
            usuario1: u1?.pontosTotais ?? 0,
            usuario2: u2?.pontosTotais ?? 0,
        })
    }

    const caloriasDiarias = calorias.map((c) => ({
        usuarioId: c.usuarioId,
        nome: c.usuario.nome,
        cor: c.usuario.cor,
        caloriasIngeridas: c.caloriasIngeridas,
        metaCalorias: c.metaCalorias,
    }))

    // If no calories data, use user defaults
    if (caloriasDiarias.length === 0) {
        for (const u of usuarios) {
            caloriasDiarias.push({
                usuarioId: u.id,
                nome: u.nome,
                cor: u.cor,
                caloriasIngeridas: 0,
                metaCalorias: u.metaCalorias,
            })
        }
    }

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
