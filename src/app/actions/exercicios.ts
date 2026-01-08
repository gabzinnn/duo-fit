"use server"

import { revalidatePath } from "next/cache"
import { unstable_noStore as noStore } from "next/cache"
import prisma from "@/lib/prisma"
import type { TipoExercicio } from "@/generated/prisma/client"

export interface ExercicioData {
    id: number
    tipo: TipoExercicio
    nome: string
    descricao: string | null
    duracao: number
    pontos: number
    data: Date
    usuarioId: number
    nomeUsuario: string
    corUsuario: string
    avatarUsuario: string | null
}

export async function getExercicios(): Promise<ExercicioData[]> {
    noStore() // Disable caching to always fetch fresh data

    const exercicios = await prisma.exercicio.findMany({
        include: {
            usuario: {
                select: {
                    nome: true,
                    cor: true,
                    avatar: true,
                },
            },
        },
        orderBy: { data: "desc" },
    })

    return exercicios.map((e) => ({
        id: e.id,
        tipo: e.tipo,
        nome: e.nome,
        descricao: e.descricao,
        duracao: e.duracao,
        pontos: e.pontos,
        data: e.data,
        usuarioId: e.usuarioId,
        nomeUsuario: e.usuario.nome,
        corUsuario: e.usuario.cor,
        avatarUsuario: e.usuario.avatar,
    }))
}

export async function createExercicio(data: {
    usuarioId: number
    tipo: TipoExercicio
    nome: string
    descricao?: string
    duracao: number
    dateKey?: string // Optional: YYYY-MM-DD format, defaults to today
}) {
    // Calculate points based on type
    let pontos = 0
    if (data.tipo === "ACADEMIA") {
        pontos = 2
    } else if (data.tipo === "CARDIO") {
        pontos = Math.floor(data.duracao / 30)
    } else {
        pontos = 1
    }

    // Determine the date for the exercise - always use Brazil timezone
    const todayBrazil = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
    const targetDateKey = data.dateKey || todayBrazil

    // Get current time in Brazil timezone
    const nowBrazilTime = new Date().toLocaleTimeString("en-GB", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    })

    // Create the exercise datetime as Brazil timezone (UTC-3)
    // Format: YYYY-MM-DDTHH:mm:ss-03:00
    const exerciseDateTime = new Date(`${targetDateKey}T${nowBrazilTime}-03:00`)

    const exercicio = await prisma.exercicio.create({
        data: {
            usuarioId: data.usuarioId,
            tipo: data.tipo,
            nome: data.nome,
            descricao: data.descricao,
            duracao: data.duracao,
            pontos,
            data: exerciseDateTime,
        },
    })

    // Update daily points using the target date (UTC midnight for @db.Date)
    const hoje = new Date(targetDateKey + "T00:00:00.000Z") // UTC midnight for @db.Date

    await prisma.pontuacaoDiaria.upsert({
        where: {
            usuarioId_data: {
                usuarioId: data.usuarioId,
                data: hoje,
            },
        },
        update: {
            pontosExercicios: { increment: pontos },
            pontosTotais: { increment: pontos },
        },
        create: {
            usuarioId: data.usuarioId,
            data: hoje,
            pontosExercicios: pontos,
            pontosTotais: pontos,
        },
    })

    // Update sequence (streak)
    const sequencia = await prisma.sequencia.findUnique({
        where: { usuarioId: data.usuarioId },
    })

    if (sequencia) {
        const ultimaData = sequencia.ultimaData
        const ultimaDataKey = ultimaData.toISOString().split("T")[0]
        const hojeKey = hoje.toISOString().split("T")[0]

        // Calculate yesterday
        const ontem = new Date(hoje)
        ontem.setDate(ontem.getDate() - 1)
        const ontemKey = ontem.toISOString().split("T")[0]

        if (ultimaDataKey === hojeKey) {
            // Already exercised today, no change
        } else if (ultimaDataKey === ontemKey) {
            // Exercised yesterday, increment streak
            await prisma.sequencia.update({
                where: { usuarioId: data.usuarioId },
                data: {
                    sequenciaAtual: { increment: 1 },
                    maiorSequencia: Math.max(sequencia.maiorSequencia, sequencia.sequenciaAtual + 1),
                    ultimaData: hoje,
                },
            })
        } else {
            // Streak broken, reset to 1
            await prisma.sequencia.update({
                where: { usuarioId: data.usuarioId },
                data: {
                    sequenciaAtual: 1,
                    ultimaData: hoje,
                },
            })
        }
    } else {
        // Create new sequence record
        await prisma.sequencia.create({
            data: {
                usuarioId: data.usuarioId,
                sequenciaAtual: 1,
                maiorSequencia: 1,
                ultimaData: hoje,
            },
        })
    }

    // Revalidate cache for exercises page
    revalidatePath("/exercicios")

    return exercicio
}
