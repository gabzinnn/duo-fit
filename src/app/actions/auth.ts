"use server"

import prisma from "@/lib/prisma"
import bcrypt from "bcrypt"
import { CorUsuario } from "@/generated/prisma/client"

export type LoginResult = {
    success: boolean
    error?: string
    user?: {
        id: number
        nome: string
        email: string
        avatar: string | null
        cor: CorUsuario
    }
}

export async function loginAction(
    email: string,
    senha: string
): Promise<LoginResult> {
    try {
        if (!email || !senha) {
            return { success: false, error: "Email e senha são obrigatórios" }
        }

        const usuario = await prisma.usuario.findUnique({
            where: { email },
            select: {
                id: true,
                nome: true,
                email: true,
                senha: true,
                avatar: true,
                cor: true,
            },
        })

        if (!usuario) {
            return { success: false, error: "Usuário não encontrado" }
        }

        const senhaCorreta = await bcrypt.compare(senha, usuario.senha)

        if (!senhaCorreta) {
            return { success: false, error: "Senha incorreta" }
        }

        // Return user without password
        return {
            success: true,
            user: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                avatar: usuario.avatar,
                cor: usuario.cor,
            },
        }
    } catch (error) {
        console.error("Erro no login:", error)
        return { success: false, error: "Erro ao realizar login" }
    }
}

// Get users for selection (without password)
export async function getUsuariosAction() {
    try {
        const usuarios = await prisma.usuario.findMany({
            select: {
                id: true,
                nome: true,
                email: true,
                avatar: true,
                cor: true,
            },
            orderBy: { id: "asc" },
        })

        return { success: true, usuarios }
    } catch (error) {
        console.error("Erro ao buscar usuários:", error)
        return { success: false, usuarios: [] }
    }
}
