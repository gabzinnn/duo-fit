"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"
import { useRouter } from "next/navigation"

interface Usuario {
    id: number
    nome: string
    avatar: string | null
}

interface AuthContextType {
    usuario: Usuario | null
    isLoading: boolean
    isAuthenticated: boolean
    login: (usuario: Usuario) => void
    logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_KEY = "@DuoFit:usuario"

interface AuthProviderProps {
    children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [usuario, setUsuario] = useState<Usuario | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    // Carrega o Usuario do localStorage ao iniciar
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            try {
                setUsuario(JSON.parse(stored))
            } catch {
                localStorage.removeItem(STORAGE_KEY)
            }
        }
        setIsLoading(false)
    }, [])

    const login = useCallback((usuario: Usuario) => {
        setUsuario(usuario)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(usuario))
    }, [])

    const logout = useCallback(() => {
        setUsuario(null)
        localStorage.removeItem(STORAGE_KEY)
        router.push("/")
    }, [router])

    return (
        <AuthContext.Provider
            value={{
                usuario,
                isLoading,
                isAuthenticated: !!usuario,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth deve ser usado dentro de um AuthProvider")
    }
    return context
}