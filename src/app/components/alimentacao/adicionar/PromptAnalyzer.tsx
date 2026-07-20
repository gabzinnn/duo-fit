"use client"

import { useState, useRef } from "react"
import { analisarPromptRefeicao } from "@/app/actions/analisar-prompt"
import type { AlimentoAnalisado } from "@/app/actions/analisar-foto"
import { AiFoodReviewModal } from "./AiFoodReviewModal"

interface PromptAnalyzerProps {
  onFoodsConfirmed: (foods: AlimentoAnalisado[]) => void
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function PromptAnalyzer({ onFoodsConfirmed }: PromptAnalyzerProps) {
  const [texto, setTexto] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState<AlimentoAnalisado[] | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const runAnalysis = async (input: { texto?: string; audioBase64?: string; mimeType?: string }) => {
    setAnalyzing(true)
    setError(null)
    try {
      const result = await analisarPromptRefeicao(input)
      if (result.success && result.alimentos.length > 0) {
        setDetected(result.alimentos)
        setTexto("")
      } else if (result.success) {
        setError("Não consegui identificar alimentos. Tente descrever com mais detalhes.")
      } else {
        setError(result.error || "Erro ao analisar")
      }
    } catch {
      setError("Erro ao processar")
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSubmitText = () => {
    if (!texto.trim() || analyzing) return
    runAnalysis({ texto })
  }

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        const dataURL = await blobToDataURL(blob)
        const mimeType = (recorder.mimeType || "audio/webm").split(";")[0]
        await runAnalysis({ audioBase64: dataURL, mimeType })
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      setError("Não foi possível acessar o microfone")
    }
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
    setRecording(false)
  }

  return (
    <>
      {analyzing ? (
        <div className="w-full h-32 border-2 border-primary/30 rounded-xl
          flex flex-col items-center justify-center gap-3 bg-primary/5">
          <span className="material-symbols-outlined text-2xl text-primary animate-spin">
            progress_activity
          </span>
          <span className="text-sm font-medium text-primary">Analisando sua refeição...</span>
        </div>
      ) : recording ? (
        <button
          type="button"
          onClick={stopRecording}
          className="w-full h-32 border-2 border-red-300 rounded-xl bg-red-50
            flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-red-100 transition-colors"
        >
          <span className="material-symbols-outlined text-3xl text-red-500 animate-pulse">mic</span>
          <span className="text-sm font-medium text-red-600">Gravando... toque para parar</span>
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmitText()
              }
            }}
            placeholder="Ex: 2 ovos mexidos, uma fatia de pão integral e um café com leite"
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-slate-100 text-slate-900 resize-none
              border-none outline-none placeholder:text-slate-400
              focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startRecording}
              className="h-12 w-12 shrink-0 rounded-xl bg-slate-100 text-slate-600
                flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
              aria-label="Gravar áudio"
            >
              <span className="material-symbols-outlined">mic</span>
            </button>
            <button
              type="button"
              onClick={handleSubmitText}
              disabled={!texto.trim()}
              className="flex-1 h-12 rounded-xl bg-primary text-[#101519] font-bold
                flex items-center justify-center gap-2 hover:bg-blue-300 transition-colors cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
              Analisar
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">error</span>
          {error}
        </div>
      )}

      {detected && (
        <AiFoodReviewModal
          foods={detected}
          onClose={() => setDetected(null)}
          onConfirm={(foods) => {
            onFoodsConfirmed(foods)
            setDetected(null)
          }}
        />
      )}
    </>
  )
}
