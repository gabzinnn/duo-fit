"use server"

import prisma from "@/lib/prisma"

/**
 * One-time script to fix historical CaloriasDiarias records.
 * Meeting the calorie goal means staying UNDER the limit (diet context).
 * Also awards points for those who met the goal but didn't get credited.
 */
export async function fixHistoricalCaloriasMeta() {
    // Get today's date in Brazil timezone (we should only fix PAST days)
    const now = new Date()
    const brazilDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
    const hoje = new Date(brazilDate.getFullYear(), brazilDate.getMonth(), brazilDate.getDate())

    // Find all records from PAST days where metaAtingida is false
    const recordsToFix = await prisma.caloriasDiarias.findMany({
        where: {
            metaAtingida: false,
            data: {
                lt: hoje // Only past days, not today
            }
        },
        include: {
            usuario: {
                select: { metaCalorias: true }
            }
        }
    })

    let fixedCount = 0
    let pointsAwarded = 0

    for (const record of recordsToFix) {
        // Use the USER's actual metaCalorias (not the record's potentially stale value)
        const meta = record.usuario.metaCalorias

        // Meeting the goal means staying UNDER or AT the limit
        if (record.caloriasIngeridas <= meta) {
            // Fix the metaAtingida flag and correct the metaCalorias value
            await prisma.caloriasDiarias.update({
                where: { id: record.id },
                data: {
                    metaAtingida: true,
                    metaCalorias: meta // Correct the goal to user's actual goal
                }
            })
            fixedCount++

            // Check if points were already awarded for this day
            const existingPoints = await prisma.pontuacaoDiaria.findUnique({
                where: {
                    usuarioId_data: {
                        usuarioId: record.usuarioId,
                        data: record.data,
                    }
                }
            })

            // Only award if no calorie points exist
            if (!existingPoints || existingPoints.pontosCalorias === 0) {
                await prisma.pontuacaoDiaria.upsert({
                    where: {
                        usuarioId_data: {
                            usuarioId: record.usuarioId,
                            data: record.data,
                        }
                    },
                    create: {
                        usuarioId: record.usuarioId,
                        data: record.data,
                        pontosCalorias: 1,
                        pontosTotais: 1,
                    },
                    update: {
                        pontosCalorias: 1,
                        pontosTotais: { increment: 1 },
                    }
                })
                pointsAwarded++
            }
        }
    }

    return {
        recordsChecked: recordsToFix.length,
        recordsFixed: fixedCount,
        pointsAwarded,
    }
}
