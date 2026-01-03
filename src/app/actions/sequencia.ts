"use server"

import prisma from "@/lib/prisma"

export async function getSequenciaUsuario(usuarioId: number): Promise<number> {
    const sequencia = await prisma.sequencia.findUnique({
        where: { usuarioId },
    })
    return sequencia?.sequenciaAtual ?? 0
}
