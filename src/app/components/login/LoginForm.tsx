"use client"

import { useState, useTransition, FormEvent, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input, Button } from "../ui"
import { UserCard } from "./UserCard"
import { loginAction } from "../../actions/auth"
import type { CorUsuario } from "@/generated/prisma/client"
import { useAuth } from "@/context/AuthContext"

interface Usuario {
  id: number
  nome: string
  email: string
  avatar: string | null
  cor: CorUsuario
}

interface LoginFormProps {
  usuarios: Usuario[]
}

export function LoginForm({ usuarios }: LoginFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(
    usuarios[0] ?? null
  )
  const [senha, setSenha] = useState("")
  const [error, setError] = useState("")
  const { usuario, login } = useAuth()

  useEffect(() => {
    if (usuario) {
      router.push("/home")
    }
  }, [usuario])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    if (!selectedUser) {
      setError("Selecione um usuário")
      return
    }

    if (!senha.trim()) {
      setError("Digite sua senha")
      return
    }

    startTransition(async () => {
      const result = await loginAction(selectedUser.email, senha)
      
      if (result.success) {
        login({
          id: selectedUser.id,
          nome: selectedUser.nome,
          avatar: selectedUser.avatar,
        })
        router.push("/home")
      } else {
        setError(result.error ?? "Erro ao fazer login")
      }
    })
  }

  const hasUsers = usuarios.length > 0

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Title */}
      <p className="text-center text-[#101519] font-medium">
        Quem vai treinar hoje?
      </p>

      {/* User Selection */}
      {hasUsers ? (
        <div className="flex justify-center gap-4 flex-wrap">
          {usuarios.map((usuario) => (
            <UserCard
              key={usuario.id}
              id={usuario.id}
              nome={usuario.nome}
              avatar={usuario.avatar}
              isSelected={selectedUser?.id === usuario.id}
              onSelect={() => setSelectedUser(usuario)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
          <span className="material-symbols-outlined text-4xl">person_off</span>
          <p>Nenhum usuário cadastrado</p>
        </div>
      )}

      {/* Form Fields */}
      <div className="flex flex-col gap-4">
        <Input
          type="password"
          placeholder="Digite sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          leftIcon={<span className="material-symbols-outlined">lock</span>}
          autoComplete="current-password"
        />

        {/* Error Message */}
        {error && (
          <p className="text-red-500 text-sm text-center animate-pulse">
            {error}
          </p>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          fullWidth
          isLoading={isPending}
          rightIcon={
            <span className="material-symbols-outlined">arrow_forward</span>
          }
        >
          Entrar
        </Button>
      </div>
    </form>
  )
}
