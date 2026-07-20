import type { AlimentoAnalisado } from "@/app/actions/analisar-foto"

// Strip markdown fences and parse the { alimentos: [...] } payload Gemini returns
export function parseAlimentosResponse(text: string): AlimentoAnalisado[] {
    let jsonText = text.trim()
    if (jsonText.startsWith("```json")) jsonText = jsonText.slice(7)
    if (jsonText.startsWith("```")) jsonText = jsonText.slice(3)
    if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3)
    const parsed = JSON.parse(jsonText.trim())
    return parsed.alimentos || []
}
