"use server";

import prisma from "@/lib/prisma";
import { normalizarOpenFoodFacts, normalizarFatSecret, AlimentoNormalizado, FatSecretFood } from "@/utils/normalizar-alimento";

// Simple in-memory cache
const apiCache = new Map<string, { data: AlimentoNormalizado[]; timestamp: number }>();
const tokenCache: { token: string; expiresAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Remove acentos de uma string
function removerAcentos(texto: string): string {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Calcula score de relevância (maior = mais relevante)
function calcularRelevancia(nome: string, query: string): number {
    const nomeNorm = removerAcentos(nome.toLowerCase().trim());
    const queryNorm = removerAcentos(query.toLowerCase().trim());

    if (nomeNorm === queryNorm) return 100;
    if (nomeNorm.startsWith(queryNorm)) return 80;
    const primeiraPalavra = nomeNorm.split(/\s+/)[0];
    if (primeiraPalavra === queryNorm) return 70;
    if (nomeNorm.includes(queryNorm) && nomeNorm.length < queryNorm.length + 15) return 60;
    if (nomeNorm.includes(queryNorm)) return 30;
    return 10;
}

// Fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    } finally {
        clearTimeout(timeout);
    }
}

// OpenFoodFacts API search
async function buscarOpenFoodFacts(query: string): Promise<AlimentoNormalizado[]> {
    const cacheKey = `off:${query.toLowerCase()}`;
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    try {
        const response = await fetchWithTimeout(
            `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
                query
            )}&search_simple=1&action=process&json=1&page_size=15&cc=br&lc=pt`,
            {},
            3000
        );

        const data = await response.json();
        const results: AlimentoNormalizado[] =
            data.products?.map(normalizarOpenFoodFacts).filter(Boolean) ?? [];

        apiCache.set(cacheKey, { data: results, timestamp: Date.now() });
        return results;
    } catch (error) {
        console.error("OpenFoodFacts API error:", error);
        return cached?.data ?? [];
    }
}

// FatSecret OAuth2 token cache
let fatSecretToken: { token: string; expiresAt: number } | null = null;

// Get FatSecret OAuth2 access token
async function getFatSecretToken(): Promise<string | null> {
    const clientId = process.env.FATSECRET_CLIENT_ID;
    const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return null;
    }

    // Check if we have a valid cached token
    if (fatSecretToken && fatSecretToken.expiresAt > Date.now()) {
        return fatSecretToken.token;
    }

    try {
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const response = await fetch('https://oauth.fatsecret.com/connect/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials&scope=premier',
        });

        if (!response.ok) {
            console.error("FatSecret token error:", response.status);
            return null;
        }

        const data = await response.json();

        // Cache token (expires_in is in seconds, subtract 60s for safety)
        fatSecretToken = {
            token: data.access_token,
            expiresAt: Date.now() + (data.expires_in - 60) * 1000,
        };

        return fatSecretToken.token;
    } catch (error) {
        console.error("FatSecret token fetch error:", error);
        return null;
    }
}

// FatSecret API search (fallback)
async function buscarFatSecret(query: string): Promise<AlimentoNormalizado[]> {
    const cacheKey = `fs:${query.toLowerCase()}`;
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    const token = await getFatSecretToken();
    if (!token) {
        return [];
    }

    try {
        const response = await fetchWithTimeout(
            `https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(
                query
            )}&format=json&max_results=15&region=BR&language=pt`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            },
            4000
        );

        if (!response.ok) {
            console.error("FatSecret API error:", response.status);
            return [];
        }

        const data = await response.json();

        // FatSecret returns foods.food array
        const foods: FatSecretFood[] = data.foods?.food ?? [];
        const foodsArray = Array.isArray(foods) ? foods : [foods];

        // For each food, we need to get details with servings
        // Since foods.search doesn't include full serving info, we'll use what's available
        const results: AlimentoNormalizado[] = foodsArray
            .map(food => normalizarFatSecret(food))
            .filter((item): item is AlimentoNormalizado => item !== null);

        apiCache.set(cacheKey, { data: results, timestamp: Date.now() });
        return results;
    } catch (error) {
        console.error("FatSecret API error:", error);
        return cached?.data ?? [];
    }
}

export async function buscarAlimentos(query: string): Promise<AlimentoNormalizado[]> {
    if (!query || query.length < 2) return [];

    // ==========================
    // PARALLEL: LOCAL + OPENFOODFACTS
    // ==========================

    // Usando raw query com unaccent (precisa habilitar a extensão no PostgreSQL)
    const localPromise = prisma.$queryRaw<Array<{
        id: string;
        nome: string;
        calorias: number;
        proteinas: number;
        carboidratos: number;
        gorduras: number;
    }>>`
        SELECT id, nome, calorias, proteinas, carboidratos, gorduras
        FROM "Alimento"
        WHERE unaccent(lower(nome)) LIKE '%' || unaccent(lower(${query})) || '%'
        LIMIT 10
    `;

    const openFoodFactsPromise = buscarOpenFoodFacts(query);

    const [alimentosLocais, openFoodFactsResults] = await Promise.all([
        localPromise,
        openFoodFactsPromise
    ]);

    const locaisNormalizados: AlimentoNormalizado[] = alimentosLocais.map((alimento) => ({
        origem: "LOCAL" as const,
        id: Number(alimento.id),
        nome: alimento.nome,
        calorias: alimento.calorias,
        proteinas: alimento.proteinas,
        carboidratos: alimento.carboidratos,
        gorduras: alimento.gorduras
    }));

    // ==========================
    // MERGE + DEDUP
    // ==========================

    const mapa = new Map<string, AlimentoNormalizado>();

    [...locaisNormalizados, ...openFoodFactsResults].forEach(item => {
        const chave = item.nome.toLowerCase();
        if (!mapa.has(chave)) {
            mapa.set(chave, item);
        }
    });

    // If we have few results, try FatSecret as fallback
    if (mapa.size < 5) {
        const fatSecretResults = await buscarFatSecret(query);
        fatSecretResults.forEach(item => {
            const chave = item.nome.toLowerCase();
            if (!mapa.has(chave)) {
                mapa.set(chave, item);
            }
        });
    }

    // ==========================
    // SORT BY RELEVANCE
    // ==========================

    const resultadosOrdenados = Array.from(mapa.values())
        .sort((a, b) => {
            if (a.origem === "LOCAL" && b.origem !== "LOCAL") return -1;
            if (b.origem === "LOCAL" && a.origem !== "LOCAL") return 1;
            return calcularRelevancia(b.nome, query) - calcularRelevancia(a.nome, query);
        });

    return resultadosOrdenados.slice(0, 15);
}
