"use server"

import prisma from "@/lib/prisma"
import { TipoRefeicao } from "@/generated/prisma/client"

// =========================
// TYPES
// =========================

export interface AlimentoItem {
    id: number
    nome: string
    calorias: number
    quantidade: number
    unidade: string
}

export interface RefeicaoData {
    id: number
    tipo: TipoRefeicao
    horario: string
    totalCalorias: number
    alimentos: AlimentoItem[]
}

export interface MacrosData {
    proteinas: { atual: number; meta: number }
    carboidratos: { atual: number; meta: number }
    gorduras: { atual: number; meta: number }
}

export interface DiaHistorico {
    dia: string
    diaSemana: string
    usuario: number
    rival: number
    isHoje: boolean
    isFuturo: boolean
}

export interface AlimentacaoData {
    caloriasIngeridas: number
    metaCalorias: number
    macros: MacrosData
    refeicoes: RefeicaoData[]
    historicoSemanal: DiaHistorico[]
    rivalNome: string
    rivalCalorias: number
}

// =========================
// HELPERS
// =========================

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

// =========================
// MAIN ACTION
// =========================

export async function getAlimentacaoData(usuarioId: number | null): Promise<AlimentacaoData> {

    if (!usuarioId) {
        // Return default state with all 4 meal types
        const tiposRefeicaoDefault: TipoRefeicao[] = ["CAFE_DA_MANHA", "ALMOCO", "LANCHE", "JANTAR"]
        return {
            caloriasIngeridas: 0,
            metaCalorias: 2000,
            macros: {
                proteinas: { atual: 0, meta: 150 },
                carboidratos: { atual: 0, meta: 250 },
                gorduras: { atual: 0, meta: 65 },
            },
            refeicoes: tiposRefeicaoDefault.map((tipo) => ({
                id: 0,
                tipo,
                horario: "",
                totalCalorias: 0,
                alimentos: [],
            })),
            historicoSemanal: [],
            rivalNome: "Rival",
            rivalCalorias: 0,
        }
    }

    // Use Brazil timezone for date calculations
    const now = new Date()
    const brazilDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
    const hoje = new Date(brazilDate.getFullYear(), brazilDate.getMonth(), brazilDate.getDate())

    // Fetch user data and rival
    const [usuario, usuarios] = await Promise.all([
        prisma.usuario.findUnique({ where: { id: usuarioId } }),
        prisma.usuario.findMany({ take: 2 }),
    ])

    const metaCalorias = usuario?.metaCalorias ?? 2000
    const rival = usuarios.find((u) => u.id !== usuarioId)

    // Fetch today's data
    const inicioHoje = new Date(hoje)
    const fimHoje = new Date(hoje)
    fimHoje.setHours(23, 59, 59, 999)

    const [caloriasDiarias, refeicoes, rivalCalorias] = await Promise.all([
        prisma.caloriasDiarias.findFirst({
            where: { usuarioId, data: inicioHoje },
        }),
        prisma.refeicao.findMany({
            where: {
                usuarioId,
                data: { gte: inicioHoje, lte: fimHoje },
            },
            include: {
                alimentos: {
                    include: { alimento: true },
                },
            },
            orderBy: { data: "asc" },
        }),
        rival
            ? prisma.caloriasDiarias.findFirst({
                where: { usuarioId: rival.id, data: inicioHoje },
            })
            : null,
    ])

    // Process meals
    const refeicoesData: RefeicaoData[] = refeicoes.map((r) => ({
        id: r.id,
        tipo: r.tipo,
        horario: r.data.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
        }),
        totalCalorias: r.totalCalorias,
        alimentos: r.alimentos.map((ar) => ({
            id: ar.id,
            nome: ar.alimento.nome,
            calorias: ar.calorias,
            quantidade: ar.quantidade,
            unidade: ar.unidade,
        })),
    }))

    // Ensure all meal types exist (for display)
    const tiposRefeicao: TipoRefeicao[] = ["CAFE_DA_MANHA", "ALMOCO", "LANCHE", "JANTAR"]
    const refeicoesCompletas = tiposRefeicao.map((tipo) => {
        const existente = refeicoesData.find((r) => r.tipo === tipo)
        return existente || {
            id: 0,
            tipo,
            horario: "",
            totalCalorias: 0,
            alimentos: [],
        }
    })

    // Weekly history
    const historicoSemanal: DiaHistorico[] = []
    for (let i = 6; i >= 0; i--) {
        const dia = new Date(hoje)
        dia.setDate(hoje.getDate() - (3 - i)) // 3 days before to 3 days after

        const isHoje = dia.getTime() === hoje.getTime()
        const isFuturo = dia > hoje

        const [userCal, rivalCal] = await Promise.all([
            prisma.caloriasDiarias.findFirst({
                where: {
                    usuarioId,
                    data: dia,
                },
            }),
            rival
                ? prisma.caloriasDiarias.findFirst({
                    where: { usuarioId: rival.id, data: dia },
                })
                : null,
        ])

        historicoSemanal.push({
            dia: dia.toLocaleDateString("pt-BR", { day: "2-digit" }),
            diaSemana: DIAS_SEMANA[dia.getDay()],
            usuario: userCal
                ? Math.round((userCal.caloriasIngeridas / metaCalorias) * 100)
                : 0,
            rival: rivalCal
                ? Math.round(
                    (rivalCal.caloriasIngeridas / (rival?.metaCalorias ?? 2000)) * 100
                )
                : 0,
            isHoje,
            isFuturo,
        })
    }

    // Macros calculation - use user's configured goals
    const macros: MacrosData = {
        proteinas: {
            atual: caloriasDiarias?.proteinas ?? 0,
            meta: usuario?.metaProteinas ?? 150,
        },
        carboidratos: {
            atual: caloriasDiarias?.carboidratos ?? 0,
            meta: usuario?.metaCarboidratos ?? 250,
        },
        gorduras: {
            atual: caloriasDiarias?.gorduras ?? 0,
            meta: usuario?.metaGorduras ?? 65,
        },
    }

    return {
        caloriasIngeridas: caloriasDiarias?.caloriasIngeridas ?? 0,
        metaCalorias,
        macros,
        refeicoes: refeicoesCompletas,
        historicoSemanal,
        rivalNome: rival?.nome ?? "Rival",
        rivalCalorias: rivalCalorias?.caloriasIngeridas ?? 0,
    }
}

