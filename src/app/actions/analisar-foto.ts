"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"

export interface AlimentoAnalisado {
    alimentoId?: number
    nome: string
    quantidade: number
    unidade: string
    calorias: number
    proteinas: number
    carboidratos: number
    gorduras: number
}

export interface AnaliseResult {
    success: boolean
    alimentos: AlimentoAnalisado[]
    error?: string
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function analisarFotoRefeicao(base64Image: string): Promise<AnaliseResult> {
    if (!process.env.GEMINI_API_KEY) {
        return {
            success: false,
            alimentos: [],
            error: "GEMINI_API_KEY não configurada"
        }
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash"
        })

        const prompt = `Você é um nutricionista expert analisando uma foto de refeição.

TAREFA: Identifique TODOS os alimentos visíveis na foto e forneça informações nutricionais precisas.

Para cada alimento, forneça:
- nome: nome do alimento em português brasileiro (seja específico)
- quantidade: quantidade estimada em gramas baseado no tamanho visual
- unidade: sempre "g"
- calorias: calorias TOTAIS para a quantidade especificada
- proteinas: proteínas em gramas para a quantidade
- carboidratos: carboidratos em gramas para a quantidade
- gorduras: gorduras em gramas para a quantidade

REGRAS IMPORTANTES:
1. Use dados nutricionais da TACO (Tabela Brasileira de Composição de Alimentos) ou USDA
2. Os valores devem ser PROPORCIONAIS à quantidade (não por 100g)
3. Seja preciso com os nomes (ex: "batata frita" não "batata")
4. Valores típicos de referência por 100g:
   - Arroz branco cozido: 130 kcal
   - Feijão carioca cozido: 76 kcal
   - Frango grelhado: 165 kcal
   - Batata frita: 312 kcal
   - Carne bovina grelhada: 250 kcal

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

        const imageData = base64Image.replace(/^data:image\/\w+;base64,/, "")
        const mimeType = base64Image.startsWith("data:image/png") ? "image/png" : "image/jpeg"

        const result = await model.generateContent([
            prompt,
            { inlineData: { mimeType, data: imageData } }
        ])

        const response = await result.response
        const text = response.text()

        // Strip possible markdown blocks
        let jsonText = text.trim()
        if (jsonText.startsWith("```json")) jsonText = jsonText.slice(7)
        if (jsonText.startsWith("```")) jsonText = jsonText.slice(3)
        if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3)

        const parsed = JSON.parse(jsonText.trim())
        console.log("Resposta Gemini:", parsed)

        return {
            success: true,
            alimentos: parsed.alimentos || []
        }
    } catch (error) {
        console.error("Erro ao analisar foto:", error)
        return {
            success: false,
            alimentos: [],
            error: error instanceof Error ? error.message : "Erro desconhecido"
        }
    }
}
