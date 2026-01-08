"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

const PONTOS_META_CALORIAS = 2

/**
 * Recalcula as calorias diárias e pontos para um usuário em uma data específica
 */
async function recalcularDiario(usuarioId: number, data: Date) {
    // Get the date key (UTC midnight) for the day
    const dateKey = new Date(data.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) + "T00:00:00.000Z")

    // Get start and end of day in Brazil timezone for refeicao query
    const dayStr = data.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
    const inicioDia = new Date(dayStr + "T00:00:00.000-03:00")
    const fimDia = new Date(dayStr + "T23:59:59.999-03:00")

    // Get all meals for this user on this day
    const refeicoesDoDia = await prisma.refeicao.findMany({
        where: {
            usuarioId,
            data: { gte: inicioDia, lte: fimDia }
        }
    })

    // Calculate totals
    const totalCalorias = refeicoesDoDia.reduce((sum, r) => sum + r.totalCalorias, 0)
    const totalProteinas = refeicoesDoDia.reduce((sum, r) => sum + r.totalProteinas, 0)
    const totalCarbos = refeicoesDoDia.reduce((sum, r) => sum + r.totalCarbos, 0)
    const totalGorduras = refeicoesDoDia.reduce((sum, r) => sum + r.totalGorduras, 0)

    // Get user's calorie goal
    const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { metaCalorias: true }
    })
    const metaCalorias = usuario?.metaCalorias ?? 2000

    // Check if goal is met (calories > 0 AND <= meta)
    const metaAtingida = totalCalorias > 0 && totalCalorias <= metaCalorias

    // Update or create CaloriasDiarias
    const caloriasDiarias = await prisma.caloriasDiarias.upsert({
        where: {
            usuarioId_data: { usuarioId, data: dateKey }
        },
        create: {
            usuarioId,
            data: dateKey,
            metaCalorias,
            caloriasIngeridas: totalCalorias,
            proteinas: totalProteinas,
            carboidratos: totalCarbos,
            gorduras: totalGorduras,
            metaAtingida
        },
        update: {
            caloriasIngeridas: totalCalorias,
            proteinas: totalProteinas,
            carboidratos: totalCarbos,
            gorduras: totalGorduras,
            metaAtingida
        }
    })

    // Handle points
    const pontuacaoExistente = await prisma.pontuacaoDiaria.findUnique({
        where: {
            usuarioId_data: { usuarioId, data: dateKey }
        }
    })

    if (metaAtingida) {
        // Award points if not already awarded
        if (!pontuacaoExistente || pontuacaoExistente.pontosCalorias === 0) {
            await prisma.pontuacaoDiaria.upsert({
                where: {
                    usuarioId_data: { usuarioId, data: dateKey }
                },
                create: {
                    usuarioId,
                    data: dateKey,
                    pontosCalorias: PONTOS_META_CALORIAS,
                    pontosTotais: PONTOS_META_CALORIAS
                },
                update: {
                    pontosCalorias: PONTOS_META_CALORIAS,
                    pontosTotais: { increment: PONTOS_META_CALORIAS }
                }
            })
        }
    } else {
        // Remove calorie points if they exist
        if (pontuacaoExistente && pontuacaoExistente.pontosCalorias > 0) {
            await prisma.pontuacaoDiaria.update({
                where: {
                    usuarioId_data: { usuarioId, data: dateKey }
                },
                data: {
                    pontosCalorias: 0,
                    pontosTotais: { decrement: pontuacaoExistente.pontosCalorias }
                }
            })
        }
    }

    return { caloriasDiarias, metaAtingida }
}

/**
 * Exclui uma refeição completa e recalcula as calorias do dia
 */
export async function excluirRefeicao(refeicaoId: number) {
    // Get the meal info before deleting
    const refeicao = await prisma.refeicao.findUnique({
        where: { id: refeicaoId },
        select: { usuarioId: true, data: true }
    })

    if (!refeicao) {
        return { success: false, error: "Refeição não encontrada" }
    }

    // Delete the meal (cascade will delete alimentos)
    await prisma.refeicao.delete({
        where: { id: refeicaoId }
    })

    // Recalculate daily totals
    await recalcularDiario(refeicao.usuarioId, refeicao.data)

    revalidatePath("/alimentacao/historico")
    revalidatePath("/alimentacao")
    revalidatePath("/home")

    return { success: true }
}

/**
 * Exclui um alimento de uma refeição e recalcula os totais
 */
export async function excluirAlimentoRefeicao(alimentoRefeicaoId: number) {
    // Get the food item info before deleting
    const alimentoRefeicao = await prisma.alimentoRefeicao.findUnique({
        where: { id: alimentoRefeicaoId },
        include: {
            refeicao: {
                select: { id: true, usuarioId: true, data: true }
            }
        }
    })

    if (!alimentoRefeicao) {
        return { success: false, error: "Item não encontrado" }
    }

    // Delete the food item
    await prisma.alimentoRefeicao.delete({
        where: { id: alimentoRefeicaoId }
    })

    // Update the meal totals
    const remainingItems = await prisma.alimentoRefeicao.findMany({
        where: { refeicaoId: alimentoRefeicao.refeicaoId }
    })

    // If no items left, optionally delete the meal
    if (remainingItems.length === 0) {
        await prisma.refeicao.delete({
            where: { id: alimentoRefeicao.refeicaoId }
        })
    } else {
        // Recalculate meal totals
        const totalCalorias = remainingItems.reduce((sum, i) => sum + i.calorias, 0)
        const totalProteinas = remainingItems.reduce((sum, i) => sum + i.proteinas, 0)
        const totalCarbos = remainingItems.reduce((sum, i) => sum + i.carboidratos, 0)
        const totalGorduras = remainingItems.reduce((sum, i) => sum + i.gorduras, 0)

        await prisma.refeicao.update({
            where: { id: alimentoRefeicao.refeicaoId },
            data: {
                totalCalorias,
                totalProteinas,
                totalCarbos,
                totalGorduras
            }
        })
    }

    // Recalculate daily totals
    await recalcularDiario(alimentoRefeicao.refeicao.usuarioId, alimentoRefeicao.refeicao.data)

    revalidatePath("/alimentacao/historico")
    revalidatePath("/alimentacao")
    revalidatePath("/home")

    return { success: true }
}

/**
 * Edita a quantidade de um alimento e recalcula os totais
 */
export async function editarQuantidadeAlimento(alimentoRefeicaoId: number, novaQuantidade: number) {
    if (novaQuantidade <= 0) {
        return { success: false, error: "Quantidade deve ser maior que zero" }
    }

    // Get the food item with alimento data
    const alimentoRefeicao = await prisma.alimentoRefeicao.findUnique({
        where: { id: alimentoRefeicaoId },
        include: {
            alimento: true,
            refeicao: {
                select: { id: true, usuarioId: true, data: true }
            }
        }
    })

    if (!alimentoRefeicao) {
        return { success: false, error: "Item não encontrado" }
    }

    // Calculate new values based on the base alimento (per 100g)
    const isWeightUnit = alimentoRefeicao.unidade === "g" || alimentoRefeicao.unidade === "ml"
    const multiplier = isWeightUnit ? novaQuantidade / 100 : novaQuantidade

    const novasCalorias = alimentoRefeicao.alimento.calorias * multiplier
    const novasProteinas = alimentoRefeicao.alimento.proteinas * multiplier
    const novosCarbos = alimentoRefeicao.alimento.carboidratos * multiplier
    const novasGorduras = alimentoRefeicao.alimento.gorduras * multiplier

    // Update the food item
    await prisma.alimentoRefeicao.update({
        where: { id: alimentoRefeicaoId },
        data: {
            quantidade: novaQuantidade,
            calorias: novasCalorias,
            proteinas: novasProteinas,
            carboidratos: novosCarbos,
            gorduras: novasGorduras
        }
    })

    // Recalculate meal totals
    const allItems = await prisma.alimentoRefeicao.findMany({
        where: { refeicaoId: alimentoRefeicao.refeicaoId }
    })

    const totalCalorias = allItems.reduce((sum, i) => sum + i.calorias, 0)
    const totalProteinas = allItems.reduce((sum, i) => sum + i.proteinas, 0)
    const totalCarbos = allItems.reduce((sum, i) => sum + i.carboidratos, 0)
    const totalGorduras = allItems.reduce((sum, i) => sum + i.gorduras, 0)

    await prisma.refeicao.update({
        where: { id: alimentoRefeicao.refeicaoId },
        data: {
            totalCalorias,
            totalProteinas,
            totalCarbos,
            totalGorduras
        }
    })

    // Recalculate daily totals
    await recalcularDiario(alimentoRefeicao.refeicao.usuarioId, alimentoRefeicao.refeicao.data)

    revalidatePath("/alimentacao/historico")
    revalidatePath("/alimentacao")
    revalidatePath("/home")

    return { success: true }
}
