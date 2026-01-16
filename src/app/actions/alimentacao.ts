"use server"

import { unstable_noStore as noStore } from "next/cache"
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

export async function getAlimentacaoData(usuarioId: number | null, dateKey?: string): Promise<AlimentacaoData> {
    noStore() // Disable caching to always fetch fresh data

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
    // Get the date to query - use provided dateKey or default to today
    const getTodayBrazil = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
    const todayDateKey = dateKey || getTodayBrazil() // "2026-01-05"

    // Create Date object for the target day as UTC midnight (matches @db.Date storage)
    const hoje = new Date(todayDateKey + "T00:00:00.000Z")

    // Fetch user data and rival
    const [usuario, usuarios] = await Promise.all([
        prisma.usuario.findUnique({ where: { id: usuarioId } }),
        prisma.usuario.findMany({ take: 2 }),
    ])

    const metaCalorias = usuario?.metaCalorias ?? 2000
    const rival = usuarios.find((u) => u.id !== usuarioId)

    // For refeicao queries, we need local date boundaries
    // Since refeicao.data is a full DateTime stored as UTC, and we created the record with new Date(),
    // we need to query based on when the meal was actually added (in UTC)
    // Using todayDateKey (Brazil date) to get the correct day boundaries
    const inicioHoje = new Date(todayDateKey + "T00:00:00.000-03:00") // Start of day in Brazil time
    const fimHoje = new Date(todayDateKey + "T23:59:59.999-03:00") // End of day in Brazil time

    const [caloriasDiarias, refeicoes, rivalCalorias] = await Promise.all([
        prisma.caloriasDiarias.findFirst({
            where: { usuarioId, data: hoje },
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
                where: { usuarioId: rival.id, data: hoje },
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
            timeZone: "America/Sao_Paulo",
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

    // Ensure all meal types exist (for display) - combine multiple meals of the same type
    const tiposRefeicao: TipoRefeicao[] = ["CAFE_DA_MANHA", "ALMOCO", "LANCHE", "JANTAR"]
    const refeicoesCompletas = tiposRefeicao.map((tipo) => {
        const refeicoesTipo = refeicoesData.filter((r) => r.tipo === tipo)

        if (refeicoesTipo.length === 0) {
            return {
                id: 0,
                tipo,
                horario: "",
                totalCalorias: 0,
                alimentos: [],
            }
        }

        // Combine multiple meals of the same type
        const totalCalorias = refeicoesTipo.reduce((sum, r) => sum + r.totalCalorias, 0)
        const alimentos = refeicoesTipo.flatMap((r) => r.alimentos)
        const ultimoHorario = refeicoesTipo[refeicoesTipo.length - 1].horario
        const primeiroId = refeicoesTipo[0].id

        return {
            id: primeiroId,
            tipo,
            horario: ultimoHorario,
            totalCalorias,
            alimentos,
        }
    })

    // Weekly history - 7 days centered on today (3 before, today, 3 after)
    const historicoSemanal: DiaHistorico[] = []

    // Helper to get day of week from Date in Brazil timezone
    const getDiaSemana = (dateKey: string) => {
        // Create date and get Brazil day of week
        const d = new Date(dateKey + "T12:00:00.000Z") // Use noon to avoid timezone shifts
        const brazilDateStr = d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" })
        const dayMap: { [key: string]: string } = {
            "Sun": "Dom", "Mon": "Seg", "Tue": "Ter", "Wed": "Qua", "Thu": "Qui", "Fri": "Sex", "Sat": "Sáb"
        }
        return dayMap[brazilDateStr.substring(0, 3)] || "?"
    }

    for (let i = -3; i <= 3; i++) {
        // Calculate date key
        const targetDate = new Date(hoje)
        targetDate.setUTCDate(hoje.getUTCDate() + i)
        const dateKey = targetDate.toISOString().split("T")[0] // YYYY-MM-DD

        const isHoje = dateKey === todayDateKey
        const isFuturo = dateKey > todayDateKey

        // Query using the date as UTC midnight
        const queryDate = new Date(dateKey + "T00:00:00.000Z")

        const [userCal, rivalCal] = await Promise.all([
            prisma.caloriasDiarias.findFirst({
                where: {
                    usuarioId,
                    data: queryDate,
                },
            }),
            rival
                ? prisma.caloriasDiarias.findFirst({
                    where: { usuarioId: rival.id, data: queryDate },
                })
                : null,
        ])

        historicoSemanal.push({
            dia: String(targetDate.getUTCDate()).padStart(2, "0"),
            diaSemana: getDiaSemana(dateKey),
            // If day is marked as invalid, show 0%
            usuario: userCal && !userCal.registroInvalido
                ? Math.round((userCal.caloriasIngeridas / metaCalorias) * 100)
                : 0,
            rival: rivalCal && !rivalCal.registroInvalido
                ? Math.round(
                    (rivalCal.caloriasIngeridas / (rival?.metaCalorias ?? 2000)) * 100
                )
                : 0,
            isHoje,
            isFuturo,
        })

        // Debug log
        if (userCal) {
            console.log(`[Historico] ${dateKey}: userCal.registroInvalido=${userCal.registroInvalido}, calorias=${userCal.caloriasIngeridas}`)
        }
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

// =========================
// HISTÓRICO DE REFEIÇÕES
// =========================

export interface AlimentoHistorico {
    id: number
    nome: string
    quantidade: number
    unidade: string
    calorias: number
    proteinas: number
    carboidratos: number
    gorduras: number
}

export interface RefeicaoHistorico {
    id: number
    tipo: TipoRefeicao
    data: Date
    totalCalorias: number
    totalProteinas: number
    totalCarbos: number
    totalGorduras: number
    quantidadeAlimentos: number
    alimentos: AlimentoHistorico[]
    usuarioId: number
    nomeUsuario: string
    corUsuario: string
    avatarUsuario: string | null
}

export async function getHistoricoRefeicoes(): Promise<RefeicaoHistorico[]> {
    noStore() // Disable caching to always fetch fresh data

    const refeicoes = await prisma.refeicao.findMany({
        include: {
            usuario: {
                select: {
                    nome: true,
                    cor: true,
                    avatar: true,
                },
            },
            alimentos: {
                include: {
                    alimento: {
                        select: { nome: true }
                    }
                }
            },
        },
        orderBy: { data: "desc" },
    })

    return refeicoes.map((r) => ({
        id: r.id,
        tipo: r.tipo,
        data: r.data,
        totalCalorias: r.totalCalorias,
        totalProteinas: r.totalProteinas,
        totalCarbos: r.totalCarbos,
        totalGorduras: r.totalGorduras,
        quantidadeAlimentos: r.alimentos.length,
        alimentos: r.alimentos.map((a) => ({
            id: a.id,
            nome: a.alimento.nome,
            quantidade: a.quantidade,
            unidade: a.unidade,
            calorias: a.calorias,
            proteinas: a.proteinas,
            carboidratos: a.carboidratos,
            gorduras: a.gorduras,
        })),
        usuarioId: r.usuarioId,
        nomeUsuario: r.usuario.nome,
        corUsuario: r.usuario.cor,
        avatarUsuario: r.usuario.avatar,
    }))
}

// =========================
// MARCAR DIA INVÁLIDO
// =========================

import { revalidatePath } from "next/cache"

const PONTOS_META_ALIMENTACAO = 2 // Pontos por atingir meta de alimentação

export async function marcarDiaInvalido(
    usuarioId: number,
    dateKey: string, // Format: DD/MM/YYYY
    invalido: boolean
) {
    // Parse date from DD/MM/YYYY format
    const [day, month, year] = dateKey.split("/").map(Number)
    const data = new Date(Date.UTC(year, month - 1, day))

    // Find or create CaloriasDiarias record
    const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { metaCalorias: true }
    })

    if (!usuario) throw new Error("Usuário não encontrado")

    // Upsert CaloriasDiarias
    const caloriasDiarias = await prisma.caloriasDiarias.upsert({
        where: {
            usuarioId_data: { usuarioId, data }
        },
        create: {
            usuarioId,
            data,
            metaCalorias: usuario.metaCalorias,
            registroInvalido: invalido,
        },
        update: {
            registroInvalido: invalido,
        }
    })

    // Update points
    const pontuacao = await prisma.pontuacaoDiaria.findUnique({
        where: {
            usuarioId_data: { usuarioId, data }
        }
    })

    if (invalido) {
        // Remove calorie points if they exist
        if (pontuacao && pontuacao.pontosCalorias > 0) {
            await prisma.pontuacaoDiaria.update({
                where: { usuarioId_data: { usuarioId, data } },
                data: {
                    pontosCalorias: 0,
                    pontosTotais: { decrement: pontuacao.pontosCalorias }
                }
            })
        }
    } else {
        // Restore points if meta was achieved and day is valid
        const metaAtingida = caloriasDiarias.caloriasIngeridas <= caloriasDiarias.metaCalorias &&
            caloriasDiarias.caloriasIngeridas > 0

        if (metaAtingida) {
            if (pontuacao) {
                if (pontuacao.pontosCalorias === 0) {
                    await prisma.pontuacaoDiaria.update({
                        where: { usuarioId_data: { usuarioId, data } },
                        data: {
                            pontosCalorias: PONTOS_META_ALIMENTACAO,
                            pontosTotais: { increment: PONTOS_META_ALIMENTACAO }
                        }
                    })
                }
            } else {
                await prisma.pontuacaoDiaria.create({
                    data: {
                        usuarioId,
                        data,
                        pontosCalorias: PONTOS_META_ALIMENTACAO,
                        pontosTotais: PONTOS_META_ALIMENTACAO,
                    }
                })
            }
        }
    }

    revalidatePath("/alimentacao/historico")
    revalidatePath("/alimentacao")

    return { success: true, registroInvalido: invalido }
}

// Get invalid days for a user
export async function getDiasInvalidos(usuarioId: number): Promise<string[]> {
    noStore() // Disable caching to always fetch fresh data

    const dias = await prisma.caloriasDiarias.findMany({
        where: {
            usuarioId,
            registroInvalido: true
        },
        select: { data: true }
    })

    return dias.map(d => d.data.toLocaleDateString("pt-BR", { timeZone: "UTC" }))
}
