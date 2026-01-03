"use server";

import prisma from "@/lib/prisma";
import { normalizarOpenFoodFacts, AlimentoNormalizado } from "@/utils/normalizar-alimento";

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

export async function buscarAlimentos(query: string): Promise<AlimentoNormalizado[]> {
    if (!query || query.length < 2) return [];

    // ==========================
    // 1. BUSCA LOCAL (PRISMA)
    // ==========================

    const alimentosLocais = await prisma.alimento.findMany({
        where: {
            nome: {
                contains: query,
                mode: "insensitive"
            }
        },
        take: 10
    });

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
    // 2. BUSCA OPEN FOOD FACTS
    // ==========================

    // Busca com prioridade para Brasil e produtos mais simples
    const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
            query
        )}&search_simple=1&action=process&json=1&page_size=30&cc=br&lc=pt`,
        {
            cache: "no-store"
        }
    );

    const data = await response.json();

    const externosNormalizados: AlimentoNormalizado[] =
        data.products
            ?.map(normalizarOpenFoodFacts)
            .filter(Boolean) ?? [];

    // ==========================
    // 3. MERGE + DEDUP + ORDENAR POR RELEVÂNCIA
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
