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
    itens: ItemRefeicaoInput[]
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

    // Calculate totals
    let totalCalorias = 0
    let totalProteinas = 0
    let totalCarbos = 0
    let totalGorduras = 0

    const alimentosRefeicao = processedItems.map((item) => {
        const alimento = alimentoMap.get(item.alimentoId)
        if (!alimento) throw new Error(`Alimento ${item.alimentoId} não encontrado`)

        // Calculate based on quantity (assuming base is 100g)
        const fator = item.quantidade / 100
        const calorias = alimento.calorias * fator
        const proteinas = alimento.proteinas * fator
        const carboidratos = alimento.carboidratos * fator
        const gorduras = alimento.gorduras * fator

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
    const refeicao = await prisma.refeicao.create({
        data: {
            usuarioId,
            tipo,
            data: new Date(),
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

    // Update daily calories (use Brazil timezone)
    const now = new Date()
    const brazilDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
    const hoje = new Date(brazilDate.getFullYear(), brazilDate.getMonth(), brazilDate.getDate())

    // Get user's calorie goal
    const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { metaCalorias: true }
    })

    const metaCaloriasUsuario = usuario?.metaCalorias ?? 2000



    // Now do the upsert
    await prisma.caloriasDiarias.upsert({
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

    // Note: metaAtingida is NOT set here because we can only determine 
    // if someone stayed UNDER their calorie goal at the END of the day.
    // This is handled by a separate daily check or when viewing historical data.

    revalidatePath("/alimentacao")

    return refeicao
}
