"use client"

import { useState, useRef } from "react"
import { analisarFotoRefeicao, type AlimentoAnalisado } from "@/app/actions/analisar-foto"

interface PhotoAnalyzerProps {
  onFoodsDetected: (foods: AlimentoAnalisado[]) => void
}

// Compress image to reduce size before sending to API
async function compressImage(base64: string, maxWidth = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      let { width, height } = img

      // Scale down if larger than maxWidth
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      ctx?.drawImage(img, 0, 0, width, height)

      // Convert to compressed JPEG
      resolve(canvas.toDataURL("image/jpeg", quality))
    }
    img.src = base64
  })
}

export function PhotoAnalyzer({ onFoodsDetected }: PhotoAnalyzerProps) {
  const [analyzing, setAnalyzing] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione uma imagem")
      return
    }

    setAnalyzing(true)
    setError(null)

    // Convert to base64
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const base64 = event.target?.result as string
        
        // Compress image before sending
        const compressedBase64 = await compressImage(base64)
        setPreview(compressedBase64)
        
        const result = await analisarFotoRefeicao(compressedBase64)
        
        if (result.success && result.alimentos.length > 0) {
          onFoodsDetected(result.alimentos)
          setPreview(null)
        } else if (result.alimentos.length === 0) {
          setError("Não foi possível identificar alimentos na foto. Tente tirar outra foto mais próxima.")
        } else {
          setError(result.error || "Erro ao analisar a foto")
        }
      } catch {
        setError("Erro ao processar a imagem")
      } finally {
        setAnalyzing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleCancel = () => {
    setPreview(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <span className="material-symbols-outlined text-white">photo_camera</span>
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Análise por Foto</h3>
          <p className="text-xs text-slate-500">Tire uma foto do prato para identificar os alimentos</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {analyzing ? (
        <div className="w-full h-32 border-2 border-primary/30 rounded-xl 
          flex flex-col items-center justify-center gap-3 bg-primary/5">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-primary animate-spin">
              progress_activity
            </span>
          </div>
          <span className="text-sm font-medium text-primary">Analisando sua refeição...</span>
        </div>
      ) : preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-xl"
          />
          <button
            type="button"
            onClick={handleCancel}
            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white 
              hover:bg-black/70 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl 
            flex flex-col items-center justify-center gap-2
            hover:border-primary hover:bg-primary/5 transition-all cursor-pointer
            text-slate-500 hover:text-primary"
        >
          <span className="material-symbols-outlined text-3xl">add_a_photo</span>
          <span className="text-sm font-medium">Tirar foto ou selecionar</span>
        </button>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">error</span>
          {error}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-3 text-center">
        Powered by Google Gemini AI 🤖
      </p>
    </div>
  )
}
