"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"
import { parseAlimentosResponse } from "@/utils/parse-alimentos"
import type { AnaliseResult } from "./analisar-foto"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

const PROMPT = `Você é um nutricionista expert. O usuário vai descrever (por texto ou fala) uma refeição que comeu.

TAREFA: A partir da descrição, identifique CADA alimento mencionado e forneça informações nutricionais precisas. Se for áudio, transcreva mentalmente e analise.

Para cada alimento, forneça:
- nome: nome do alimento em português brasileiro (seja específico)
- quantidade: quantidade em gramas. Use a quantidade dita pelo usuário; se não for dita, estime uma porção típica
- unidade: sempre "g"
- calorias: calorias TOTAIS para a quantidade especificada
- proteinas: proteínas em gramas para a quantidade
- carboidratos: carboidratos em gramas para a quantidade
- gorduras: gorduras em gramas para a quantidade

REGRAS IMPORTANTES:
1. Use dados nutricionais da TACO (Tabela Brasileira de Composição de Alimentos) ou USDA
2. Os valores devem ser PROPORCIONAIS à quantidade (não por 100g)
3. Seja preciso com os nomes (ex: "batata frita" não "batata")
4. Se o usuário disser unidades (ex: "2 ovos", "1 fatia de pão"), converta para o peso total em gramas
5. Valores típicos de referência por 100g:
   - Arroz branco cozido: 130 kcal
   - Feijão carioca cozido: 76 kcal
   - Frango grelhado: 165 kcal
   - Ovo cozido: 155 kcal
   - Pão de forma integral: 250 kcal

Retorne APENAS JSON válido (sem markdown):
{
  "alimentos": [
    {
      "nome": "string",
      "quantidade": number,
      "unidade": "g",
      "calorias": number,
      "proteinas": number,
      "carboidratos": number,
      "gorduras": number
    }
  ]
}`

export async function analisarPromptRefeicao(input: {
    texto?: string
    audioBase64?: string // dataURL "data:audio/webm;base64,..."
    mimeType?: string // ex: "audio/webm"
}): Promise<AnaliseResult> {
    if (!process.env.GEMINI_API_KEY) {
        return {
            success: false,
            alimentos: [],
            error: "GEMINI_API_KEY não configurada"
        }
    }

    if (!input.texto?.trim() && !input.audioBase64) {
        return {
            success: false,
            alimentos: [],
            error: "Descreva a refeição por texto ou áudio"
        }
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" })

        const parts: (string | { inlineData: { mimeType: string; data: string } })[] = [PROMPT]

        if (input.audioBase64) {
            // ponytail: MediaRecorder no Chrome grava audio/webm;codecs=opus. O Gemini
            // aceita webm/ogg; se recusar, cair para "audio/ogg" (ponto de calibração).
            const data = input.audioBase64.replace(/^data:[^;]+;base64,/, "")
            const mimeType = input.mimeType || "audio/webm"
            parts.push({ inlineData: { mimeType, data } })
        } else {
            parts.push(`Refeição do usuário: ${input.texto!.trim()}`)
        }

        const result = await model.generateContent(parts)
        const response = await result.response
        const text = response.text()

        const alimentos = parseAlimentosResponse(text)
        console.log("Resposta Gemini (prompt):", alimentos)

        return { success: true, alimentos }
    } catch (error) {
        console.error("Erro ao analisar prompt:", error)
        return {
            success: false,
            alimentos: [],
            error: error instanceof Error ? error.message : "Erro desconhecido"
        }
    }
}
