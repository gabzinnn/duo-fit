"use server"

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
}

export async function getExercicios(): Promise<ExercicioData[]> {
    const exercicios = await prisma.exercicio.findMany({
        include: {
            usuario: {
                select: {
                    nome: true,
                    cor: true,
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
    }))
}

export async function createExercicio(data: {
    usuarioId: number
    tipo: TipoExercicio
    nome: string
    descricao?: string
    duracao: number
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

    const exercicio = await prisma.exercicio.create({
        data: {
            usuarioId: data.usuarioId,
            tipo: data.tipo,
            nome: data.nome,
            descricao: data.descricao,
            duracao: data.duracao,
            pontos,
            data: new Date(),
        },
    })

    // Update daily points
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

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

    return exercicio
}
