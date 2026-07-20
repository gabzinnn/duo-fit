"use client"

import { useState } from "react"
import { PhotoAnalyzer } from "./PhotoAnalyzer"
import { PromptAnalyzer } from "./PromptAnalyzer"
import type { AlimentoAnalisado } from "@/app/actions/analisar-foto"

interface AiAnalyzerProps {
  onFoodsConfirmed: (foods: AlimentoAnalisado[]) => void
}

type Mode = "texto" | "foto"

export function AiAnalyzer({ onFoodsConfirmed }: AiAnalyzerProps) {
  const [mode, setMode] = useState<Mode>("texto")

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-slate-900">
          <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
          <h3 className="font-bold text-sm">Adicionar com IA</h3>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          {(["texto", "foto"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                mode === m
                  ? "bg-white text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {m === "texto" ? "edit_note" : "photo_camera"}
              </span>
              {m === "texto" ? "Texto" : "Foto"}
            </button>
          ))}
        </div>
      </div>

      {mode === "texto" ? (
        <PromptAnalyzer onFoodsConfirmed={onFoodsConfirmed} />
      ) : (
        <PhotoAnalyzer onFoodsDetected={onFoodsConfirmed} />
      )}

      <p className="text-xs text-slate-400 mt-3 text-center">Powered by Google Gemini AI 🤖</p>
    </div>
  )
}
