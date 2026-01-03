export type AlimentoNormalizado = {
    origem: "LOCAL" | "OPEN_FOOD_FACTS";
    id?: number;
    externalId?: string;
    nome: string;
    calorias: number;
    proteinas: number;
    carboidratos: number;
    gorduras: number;
};

export function normalizarOpenFoodFacts(produto: any): AlimentoNormalizado | null {
    const nutriments = produto.nutriments;

    if (!nutriments?.["energy-kcal_100g"]) return null;

    return {
        origem: "OPEN_FOOD_FACTS",
        externalId: produto.id || produto._id,
        nome: produto.product_name ?? "Alimento sem nome",
        calorias: nutriments["energy-kcal_100g"] ?? 0,
        proteinas: nutriments["proteins_100g"] ?? 0,
        carboidratos: nutriments["carbohydrates_100g"] ?? 0,
        gorduras: nutriments["fat_100g"] ?? 0
    };
}
