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

    // Fetch food data for calculations
    const alimentoIds = itens.map((i) => i.alimentoId)
    const alimentos = await prisma.alimento.findMany({
        where: { id: { in: alimentoIds } },
    })

    const alimentoMap = new Map(alimentos.map((a) => [a.id, a]))

    // Calculate totals
    let totalCalorias = 0
    let totalProteinas = 0
    let totalCarbos = 0
    let totalGorduras = 0

    const alimentosRefeicao = itens.map((item) => {
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
            metaCalorias: 2000, // Will be overwritten with user's goal
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

    revalidatePath("/alimentacao")

    return refeicao
}
