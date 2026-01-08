"use server"

import prisma from "@/lib/prisma"
import { TipoRefeicao } from "@/generated/prisma/client"
import { revalidatePath } from "next/cache"

// =========================
// TYPES
// =========================

export interface NovoAlimentoInput {
    nome: string
    calorias: number
    proteinas: number
    carboidratos: number
    gorduras: number
}

export interface ItemRefeicaoInput {
    alimentoId: number
    quantidade: number
    unidade: string
    // Optional fields for new food creation (from API/Photo)
    nome?: string
    calorias?: number
    proteinas?: number
    carboidratos?: number
    gorduras?: number
}

// =========================
// CREATE FOOD
// =========================

export async function criarAlimento(data: NovoAlimentoInput) {
    const alimento = await prisma.alimento.create({
        data: {
            nome: data.nome,
            calorias: data.calorias,
            proteinas: data.proteinas,
            carboidratos: data.carboidratos,
            gorduras: data.gorduras,
        },
    })

    return {
        id: alimento.id,
        nome: alimento.nome,
        calorias: alimento.calorias,
        proteinas: alimento.proteinas,
        carboidratos: alimento.carboidratos,
        gorduras: alimento.gorduras,
    }
}

// =========================
// SAVE MEAL
// =========================

export async function salvarRefeicao(
    usuarioId: number,
    tipo: TipoRefeicao,
    itens: ItemRefeicaoInput[],
    dateKey?: string // Optional: YYYY-MM-DD format, defaults to today
) {
    if (itens.length === 0) {
        throw new Error("Adicione pelo menos um alimento")
    }

    // Pre-process items: Create foods that don't exist (id <= 0)
    const processedItems: ItemRefeicaoInput[] = []

    // Create new foods first
    for (const item of itens) {
        if (item.alimentoId <= 0) {
            // Validate required fields for creation
            if (!item.nome || item.calorias === undefined) {
                throw new Error(`Dados incompletos para criar alimento: ${item.nome || 'Sem nome'}`)
            }

            // Calculate base values (per 100g/ml or unit)
            // If API/Photo returns total values for 'quantidade', we normalize to 100
            // Assuming the input calories/macros are acceptable as "Total for this portion" 
            // OR "Base 100g" depending on how frontend sends it. 
            // From plan: Frontend sends TOTAL values for the portion.
            // Formula: Base100 = (Total / Quantity) * 100

            const fator = item.quantidade > 0 ? (100 / item.quantidade) : 0

            const alimento = await prisma.alimento.create({
                data: {
                    nome: item.nome,
                    calorias: Math.round((item.calorias || 0) * fator),
                    proteinas: Number(((item.proteinas || 0) * fator).toFixed(1)),
                    carboidratos: Number(((item.carboidratos || 0) * fator).toFixed(1)),
                    gorduras: Number(((item.gorduras || 0) * fator).toFixed(1)),
                }
            })

            processedItems.push({
                ...item,
                alimentoId: alimento.id
            })
        } else {
            processedItems.push(item)
        }
    }

    // Fetch food data for calculations
    const alimentoIds = processedItems.map((i) => i.alimentoId)
    const alimentos = await prisma.alimento.findMany({
        where: { id: { in: alimentoIds } },
    })

    const alimentoMap = new Map(alimentos.map((a) => [a.id, a]))

    // Helper to check if unit uses weight-based calculation
    const isWeightUnit = (unit: string) => unit === "g" || unit === "ml"

    // Calculate totals
    let totalCalorias = 0
    let totalProteinas = 0
    let totalCarbos = 0
    let totalGorduras = 0

    const alimentosRefeicao = processedItems.map((item) => {
        const alimento = alimentoMap.get(item.alimentoId)
        if (!alimento) throw new Error(`Alimento ${item.alimentoId} não encontrado`)

        // Calculate based on quantity and unit type
        // For g/ml: 100g = base values, so multiply by (qty / 100)
        // For other units (porção, un, etc): 1 unit = base values (100g worth), so multiply by qty
        const multiplier = isWeightUnit(item.unidade) ? item.quantidade / 100 : item.quantidade
        const calorias = alimento.calorias * multiplier
        const proteinas = alimento.proteinas * multiplier
        const carboidratos = alimento.carboidratos * multiplier
        const gorduras = alimento.gorduras * multiplier

        totalCalorias += calorias
        totalProteinas += proteinas
        totalCarbos += carboidratos
        totalGorduras += gorduras

        return {
            alimentoId: item.alimentoId,
            quantidade: item.quantidade,
            unidade: item.unidade,
            calorias,
            proteinas,
            carboidratos,
            gorduras,
        }
    })

    // Create meal with food items
    // Determine the date for the meal - always use Brazil timezone
    const todayBrazil = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
    const targetDateKey = dateKey || todayBrazil

    // Get current time in Brazil timezone
    const nowBrazilTime = new Date().toLocaleTimeString("en-GB", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    })

    // Create the meal datetime as Brazil timezone (UTC-3)
    // Format: YYYY-MM-DDTHH:mm:ss-03:00
    const mealDateTime = new Date(`${targetDateKey}T${nowBrazilTime}-03:00`)

    const refeicao = await prisma.refeicao.create({
        data: {
            usuarioId,
            tipo,
            data: mealDateTime,
            totalCalorias,
            totalProteinas,
            totalCarbos,
            totalGorduras,
            alimentos: {
                create: alimentosRefeicao,
            },
        },
        include: {
            alimentos: true,
        },
    })

    // Update daily calories using the target date (UTC midnight for @db.Date)
    const hoje = new Date(targetDateKey + "T00:00:00.000Z") // UTC midnight for @db.Date

    // Get user's calorie goal
    const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { metaCalorias: true }
    })

    const metaCaloriasUsuario = usuario?.metaCalorias ?? 2000

    // Now do the upsert for daily calories
    const caloriasDiarias = await prisma.caloriasDiarias.upsert({
        where: {
            usuarioId_data: {
                usuarioId,
                data: hoje,
            },
        },
        create: {
            usuarioId,
            data: hoje,
            metaCalorias: metaCaloriasUsuario,
            caloriasIngeridas: totalCalorias,
            proteinas: totalProteinas,
            carboidratos: totalCarbos,
            gorduras: totalGorduras,
        },
        update: {
            caloriasIngeridas: { increment: totalCalorias },
            proteinas: { increment: totalProteinas },
            carboidratos: { increment: totalCarbos },
            gorduras: { increment: totalGorduras },
        },
    })

    // Check if calorie goal is met (calories > 0 AND <= meta)
    // Get the updated record to check current total
    const updatedCalorias = await prisma.caloriasDiarias.findUnique({
        where: { id: caloriasDiarias.id }
    })

    if (updatedCalorias) {
        const caloriasAtual = updatedCalorias.caloriasIngeridas
        const metaAtual = updatedCalorias.metaCalorias
        const metaAtingida = caloriasAtual > 0 && caloriasAtual <= metaAtual

        // Update metaAtingida flag
        await prisma.caloriasDiarias.update({
            where: { id: caloriasDiarias.id },
            data: { metaAtingida }
        })

        // Handle points for calorie goal
        const PONTOS_META_CALORIAS = 2
        const pontuacaoExistente = await prisma.pontuacaoDiaria.findUnique({
            where: {
                usuarioId_data: { usuarioId, data: hoje }
            }
        })

        if (metaAtingida) {
            // Award points if not already awarded
            if (!pontuacaoExistente || pontuacaoExistente.pontosCalorias === 0) {
                await prisma.pontuacaoDiaria.upsert({
                    where: {
                        usuarioId_data: { usuarioId, data: hoje }
                    },
                    create: {
                        usuarioId,
                        data: hoje,
                        pontosCalorias: PONTOS_META_CALORIAS,
                        pontosTotais: PONTOS_META_CALORIAS,
                    },
                    update: {
                        pontosCalorias: PONTOS_META_CALORIAS,
                        pontosTotais: { increment: PONTOS_META_CALORIAS },
                    }
                })
            }
        } else {
            // Remove calorie points if they were awarded but goal is no longer met
            if (pontuacaoExistente && pontuacaoExistente.pontosCalorias > 0) {
                await prisma.pontuacaoDiaria.update({
                    where: {
                        usuarioId_data: { usuarioId, data: hoje }
                    },
                    data: {
                        pontosCalorias: 0,
                        pontosTotais: { decrement: pontuacaoExistente.pontosCalorias }
                    }
                })
            }
        }
    }

    revalidatePath("/alimentacao")
    revalidatePath("/home")

    return refeicao
}

