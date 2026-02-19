"use server"

import { unstable_noStore as noStore } from "next/cache"
import prisma from "@/lib/prisma"

// ==========================
// TIPOS
// ==========================

export interface UsuarioRetrospectiva {
    id: number
    nome: string
    cor: string
    diasNaDieta: number
    diasTreinados: number
    tempoExercicio: number   // minutos totais
    totalSessoes: number     // quantidade de sessões de exercício
    pontosTotais: number
}

export interface RetrospectivaMensal {
    usuarios: UsuarioRetrospectiva[]
    totalDiasNoMes: number
}

// ==========================
// ACTION
// ==========================

export async function getRetrospectivaMensal(
    ano: number,
    mes: number
): Promise<RetrospectivaMensal> {
    noStore()

    const primeiroDia = new Date(Date.UTC(ano, mes - 1, 1))
    const ultimoDia = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999))
    const totalDiasNoMes = new Date(ano, mes, 0).getDate()

    // Buscar todos os usuários
    const usuarios = await prisma.usuario.findMany({
        select: { id: true, nome: true, cor: true, metaCalorias: true },
        orderBy: { id: "asc" },
    })

    // Buscar exercícios do mês
    const exercicios = await prisma.exercicio.findMany({
        where: {
            data: { gte: primeiroDia, lte: ultimoDia },
        },
        select: {
            usuarioId: true,
            data: true,
            duracao: true,
        },
    })

    // Buscar registros de calorias do mês
    const caloriasDiarias = await prisma.caloriasDiarias.findMany({
        where: {
            data: { gte: primeiroDia, lte: ultimoDia },
            registroInvalido: false,
        },
        select: {
            usuarioId: true,
            data: true,
            caloriasIngeridas: true,
            metaCalorias: true,
        },
    })

    // Buscar pontuação do mês
    const pontuacao = await prisma.pontuacaoDiaria.groupBy({
        by: ["usuarioId"],
        where: {
            data: { gte: primeiroDia, lte: ultimoDia },
        },
        _sum: { pontosTotais: true },
    })

    const pontuacaoMap = new Map(
        pontuacao.map((p) => [p.usuarioId, p._sum.pontosTotais ?? 0])
    )

    // Agregar exercícios por usuário
    const exerciciosPorUsuario = new Map<
        number,
        { diasUnicos: Set<string>; duracao: number; total: number }
    >()

    for (const e of exercicios) {
        const dateKey = e.data.toLocaleDateString("en-CA", {
            timeZone: "America/Sao_Paulo",
        })

        if (!exerciciosPorUsuario.has(e.usuarioId)) {
            exerciciosPorUsuario.set(e.usuarioId, {
                diasUnicos: new Set(),
                duracao: 0,
                total: 0,
            })
        }

        const stats = exerciciosPorUsuario.get(e.usuarioId)!
        stats.diasUnicos.add(dateKey)
        stats.duracao += e.duracao
        stats.total += 1
    }

    // Agregar dieta por usuário
    const dietaPorUsuario = new Map<number, number>()

    for (const c of caloriasDiarias) {
        const metaCalorias =
            c.metaCalorias ||
            usuarios.find((u) => u.id === c.usuarioId)?.metaCalorias ||
            2000

        const metaAtingida =
            c.caloriasIngeridas > 0 && c.caloriasIngeridas <= metaCalorias

        if (metaAtingida) {
            dietaPorUsuario.set(
                c.usuarioId,
                (dietaPorUsuario.get(c.usuarioId) ?? 0) + 1
            )
        }
    }

    // Montar resultado
    const resultado: UsuarioRetrospectiva[] = usuarios.map((u) => {
        const exercStats = exerciciosPorUsuario.get(u.id)

        return {
            id: u.id,
            nome: u.nome,
            cor: u.cor,
            diasNaDieta: dietaPorUsuario.get(u.id) ?? 0,
            diasTreinados: exercStats?.diasUnicos.size ?? 0,
            tempoExercicio: exercStats?.duracao ?? 0,
            totalSessoes: exercStats?.total ?? 0,
            pontosTotais: pontuacaoMap.get(u.id) ?? 0,
        }
    })

    return {
        usuarios: resultado,
        totalDiasNoMes,
    }
}
