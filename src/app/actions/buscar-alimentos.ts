"use server";

import prisma from "@/lib/prisma";
import { normalizarOpenFoodFacts, normalizarFatSecret, AlimentoNormalizado, FatSecretFood } from "@/utils/normalizar-alimento";

// LRU Cache com limite de tamanho
class LRUCache<T> {
    private cache = new Map<string, { data: T; timestamp: number }>();
    private readonly maxSize: number;
    private readonly ttl: number;

    constructor(maxSize = 100, ttlMs = 5 * 60 * 1000) {
        this.maxSize = maxSize;
        this.ttl = ttlMs;
    }

    get(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.data;
    }

    set(key: string, data: T): void {
        if (this.cache.size >= this.maxSize) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }
        this.cache.set(key, { data, timestamp: Date.now() });
    }
}

const apiCache = new LRUCache<AlimentoNormalizado[]>(200);
let fatSecretToken: { token: string; expiresAt: number } | null = null;

// Normaliza string para comparação (remove acentos, lowercase, trim)
function normalizar(texto: string): string {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

// Tokeniza string em palavras
function tokenizar(texto: string): string[] {
    return normalizar(texto)
        .split(/[\s,\-_/()]+/)
        .filter(t => t.length > 1);
}

// Calcula distância de Levenshtein otimizada (early exit)
function levenshtein(a: string, b: string, maxDist = 3): number {
    if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
    
    const matrix: number[][] = [];
    for (let i = 0; i <= a.length; i++) {
        matrix[i] = [i];
        if (i > 0 && matrix[i][0] > maxDist) return maxDist + 1;
    }
    for (let j = 0; j <= b.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
        let rowMin = Infinity;
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
            rowMin = Math.min(rowMin, matrix[i][j]);
        }
        if (rowMin > maxDist) return maxDist + 1;
    }
    return matrix[a.length][b.length];
}

// Score de relevância melhorado (0-100)
function calcularRelevancia(nome: string, query: string): number {
    const nomeNorm = normalizar(nome);
    const queryNorm = normalizar(query);
    const nomeToks = tokenizar(nome);
    const queryToks = tokenizar(query);

    // Match exato
    if (nomeNorm === queryNorm) return 100;

    // Primeira palavra é exatamente a query
    if (nomeToks[0] === queryNorm) return 95;

    // Nome começa com a query
    if (nomeNorm.startsWith(queryNorm)) return 90;

    // Todas as palavras da query estão no nome
    const allQueryWordsMatch = queryToks.every(qt => 
        nomeToks.some(nt => nt === qt || nt.startsWith(qt))
    );
    if (allQueryWordsMatch) {
        // Bonus se o nome for curto (mais específico)
        const lengthBonus = Math.max(0, 15 - (nomeNorm.length - queryNorm.length));
        return 70 + lengthBonus;
    }

    // Query contida no nome
    if (nomeNorm.includes(queryNorm)) {
        const position = nomeNorm.indexOf(queryNorm);
        const positionBonus = Math.max(0, 10 - position); // Bonus se aparecer no início
        const lengthPenalty = Math.min(20, (nomeNorm.length - queryNorm.length) / 2);
        return 50 + positionBonus - lengthPenalty;
    }

    // Fuzzy match - pelo menos uma palavra similar
    let bestFuzzyScore = 0;
    for (const qt of queryToks) {
        for (const nt of nomeToks) {
            if (nt.includes(qt) || qt.includes(nt)) {
                bestFuzzyScore = Math.max(bestFuzzyScore, 35);
            } else {
                const dist = levenshtein(qt, nt, 2);
                if (dist <= 1) bestFuzzyScore = Math.max(bestFuzzyScore, 30);
                else if (dist <= 2) bestFuzzyScore = Math.max(bestFuzzyScore, 20);
            }
        }
    }
    if (bestFuzzyScore > 0) return bestFuzzyScore;

    // Penaliza nomes muito longos/genéricos
    return Math.max(5, 15 - nomeToks.length);
}

// Gera chave de deduplicação
function gerarChaveDedup(nome: string): string {
    const toks = tokenizar(nome)
        .filter(t => !['de', 'da', 'do', 'com', 'sem', 'e', 'ou', 'para'].includes(t))
        .slice(0, 3)
        .sort();
    return toks.join('|');
}

// Fetch com timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
}

// OpenFoodFacts
async function buscarOpenFoodFacts(query: string): Promise<AlimentoNormalizado[]> {
    const cacheKey = `off:${normalizar(query)}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetchWithTimeout(
            `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&cc=br&lc=pt`,
            { headers: { 'User-Agent': 'DuoFit/1.0' } },
            3000
        );

        if (!response.ok) return [];
        
        const data = await response.json();
        const results: AlimentoNormalizado[] = (data.products ?? [])
            .map(normalizarOpenFoodFacts)
            .filter((x: AlimentoNormalizado | null): x is AlimentoNormalizado => x !== null);

        apiCache.set(cacheKey, results);
        return results;
    } catch {
        return [];
    }
}

// FatSecret Token
async function getFatSecretToken(): Promise<string | null> {
    const clientId = process.env.FATSECRET_CLIENT_ID;
    const clientSecret = process.env.FATSECRET_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

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

        if (!response.ok) return null;

        const data = await response.json();
        fatSecretToken = {
            token: data.access_token,
            expiresAt: Date.now() + (data.expires_in - 60) * 1000,
        };
        return fatSecretToken.token;
    } catch {
        return null;
    }
}

// FatSecret
async function buscarFatSecret(query: string): Promise<AlimentoNormalizado[]> {
    const cacheKey = `fs:${normalizar(query)}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    const token = await getFatSecretToken();
    if (!token) return [];

    try {
        const response = await fetchWithTimeout(
            `https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(query)}&format=json&max_results=20&region=BR&language=pt`,
            { headers: { 'Authorization': `Bearer ${token}` } },
            3500
        );

        if (!response.ok) return [];

        const data = await response.json();
        const foods: FatSecretFood[] = data.foods?.food ?? [];
        const foodsArray = Array.isArray(foods) ? foods : [foods];

        const results: AlimentoNormalizado[] = foodsArray
            .map(normalizarFatSecret)
            .filter((x): x is AlimentoNormalizado => x !== null);

        apiCache.set(cacheKey, results);
        return results;
    } catch {
        return [];
    }
}

// Busca local no banco
async function buscarLocal(query: string): Promise<AlimentoNormalizado[]> {
    try {
        const alimentos = await prisma.$queryRaw<Array<{
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
            ORDER BY 
                CASE WHEN unaccent(lower(nome)) = unaccent(lower(${query})) THEN 0
                     WHEN unaccent(lower(nome)) LIKE unaccent(lower(${query})) || '%' THEN 1
                     ELSE 2 END,
                length(nome)
            LIMIT 15
        `;

        return alimentos.map(a => ({
            origem: "LOCAL" as const,
            id: Number(a.id),
            nome: a.nome,
            calorias: a.calorias,
            proteinas: a.proteinas,
            carboidratos: a.carboidratos,
            gorduras: a.gorduras,
        }));
    } catch {
        return [];
    }
}

export async function buscarAlimentos(query: string): Promise<AlimentoNormalizado[]> {
    const q = query?.trim();
    if (!q || q.length < 2) return [];

    // Busca paralela em todas as fontes
    const [locais, offResults, fsResults] = await Promise.all([
        buscarLocal(q),
        buscarOpenFoodFacts(q),
        buscarFatSecret(q),
    ]);

    // Early return se tivermos match exato local
    const queryNorm = normalizar(q);
    const matchExato = locais.find(a => normalizar(a.nome) === queryNorm);
    if (matchExato && locais.length >= 5) {
        // Já temos bons resultados locais
        return locais.slice(0, 15);
    }

    // Merge com deduplicação inteligente
    const mapa = new Map<string, AlimentoNormalizado & { score: number }>();

    const addToMap = (items: AlimentoNormalizado[], prioridade: number) => {
        for (const item of items) {
            const chave = gerarChaveDedup(item.nome);
            const score = calcularRelevancia(item.nome, q) + prioridade;
            
            const existing = mapa.get(chave);
            if (!existing || existing.score < score) {
                mapa.set(chave, { ...item, score });
            }
        }
    };

    // Prioridade: LOCAL > FATSECRET > OPEN_FOOD_FACTS
    addToMap(locais, 20);
    addToMap(fsResults, 5);
    addToMap(offResults, 0);

    // Ordena por score
    const resultados = Array.from(mapa.values())
        .sort((a, b) => b.score - a.score)
        .map(({ score, ...rest }) => rest);

    return resultados.slice(0, 15);
}