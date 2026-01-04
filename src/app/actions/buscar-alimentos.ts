"use server";

import prisma from "@/lib/prisma";
import { normalizarOpenFoodFacts, AlimentoNormalizado } from "@/utils/normalizar-alimento";

// Simple in-memory cache for Open Food Facts results
const apiCache = new Map<string, { data: AlimentoNormalizado[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Calcula score de relevância (maior = mais relevante)
function calcularRelevancia(nome: string, query: string): number {
    const nomeNorm = nome.toLowerCase().trim();
    const queryNorm = query.toLowerCase().trim();

    // Match exato = máxima prioridade
    if (nomeNorm === queryNorm) return 100;

    // Nome começa com a query
    if (nomeNorm.startsWith(queryNorm)) return 80;

    // Primeira palavra é a query (ex: "Banana prata")
    const primeiraPalavra = nomeNorm.split(/\s+/)[0];
    if (primeiraPalavra === queryNorm) return 70;

    // Nome é curto e contém a query (provavelmente é o item puro)
    if (nomeNorm.includes(queryNorm) && nomeNorm.length < queryNorm.length + 15) return 60;

    // Contém a query em algum lugar
    if (nomeNorm.includes(queryNorm)) return 30;

    return 10;
}

// Fetch with timeout
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            cache: "force-cache" // Use HTTP cache
        });
        return response;
    } finally {
        clearTimeout(timeout);
    }
}

export async function buscarAlimentos(query: string): Promise<AlimentoNormalizado[]> {
    if (!query || query.length < 2) return [];

    const queryNorm = query.toLowerCase().trim();

    // ==========================
    // PARALLEL: LOCAL + API
    // ==========================

    // 1. Local search (Prisma) - fast
    const localPromise = prisma.alimento.findMany({
        where: {
            nome: {
                contains: query,
                mode: "insensitive"
            }
        },
        take: 10
    });

    // 2. Open Food Facts API - with cache and timeout
    const apiPromise = (async (): Promise<AlimentoNormalizado[]> => {
        // Check cache first
        const cached = apiCache.get(queryNorm);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }

        try {
            const response = await fetchWithTimeout(
                `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
                    query
                )}&search_simple=1&action=process&json=1&page_size=25&cc=br&lc=pt`,
                3000 // 3 second timeout
            );

            const data = await response.json();
            const results: AlimentoNormalizado[] =
                data.products?.map(normalizarOpenFoodFacts).filter(Boolean) ?? [];

            // Cache results
            apiCache.set(queryNorm, { data: results, timestamp: Date.now() });

            return results;
        } catch {
            // On timeout or error, return cached data if available, otherwise empty
            return cached?.data ?? [];
        }
    })();

    // Wait for both in parallel
    const [alimentosLocais, externosNormalizados] = await Promise.all([
        localPromise,
        apiPromise
    ]);

    // Normalize local results
    const locaisNormalizados: AlimentoNormalizado[] = alimentosLocais.map((alimento) => ({
        origem: "LOCAL",
        id: alimento.id,
        nome: alimento.nome,
        calorias: alimento.calorias,
        proteinas: alimento.proteinas,
        carboidratos: alimento.carboidratos,
        gorduras: alimento.gorduras
    }));

    // ==========================
    // MERGE + DEDUP + SORT
    // ==========================

    const mapa = new Map<string, AlimentoNormalizado>();

    // Locais primeiro (maior prioridade)
    [...locaisNormalizados, ...externosNormalizados].forEach(item => {
        const chave = item.nome.toLowerCase();
        if (!mapa.has(chave)) {
            mapa.set(chave, item);
        }
    });

    // Ordena por relevância
    const resultadosOrdenados = Array.from(mapa.values())
        .sort((a, b) => {
            // Locais sempre primeiro
            if (a.origem === "LOCAL" && b.origem !== "LOCAL") return -1;
            if (b.origem === "LOCAL" && a.origem !== "LOCAL") return 1;

            // Depois por relevância do nome
            return calcularRelevancia(b.nome, query) - calcularRelevancia(a.nome, query);
        });

    return resultadosOrdenados.slice(0, 15);
}

