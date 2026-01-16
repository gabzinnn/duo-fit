export type AlimentoNormalizado = {
    origem: "LOCAL" | "OPEN_FOOD_FACTS" | "FATSECRET";
    id?: number;
    externalId?: string;
    nome: string;
    calorias: number;
    proteinas: number;
    carboidratos: number;
    gorduras: number;
};

// OpenFoodFacts API normalizer
export function normalizarOpenFoodFacts(produto: any): AlimentoNormalizado | null {
    const nutriments = produto.nutriments;

    if (!nutriments?.["energy-kcal_100g"]) return null;

    return {
        origem: "OPEN_FOOD_FACTS",
        externalId: produto.id || produto._id,
        nome: produto.product_name ?? "Alimento sem nome",
        calorias: Math.round(nutriments["energy-kcal_100g"] ?? 0),
        proteinas: Math.round((nutriments["proteins_100g"] ?? 0) * 10) / 10,
        carboidratos: Math.round((nutriments["carbohydrates_100g"] ?? 0) * 10) / 10,
        gorduras: Math.round((nutriments["fat_100g"] ?? 0) * 10) / 10
    };
}

// FatSecret API food item
export interface FatSecretFood {
    food_id: string;
    food_name: string;
    food_type: string;
    food_url: string;
    servings?: {
        serving: FatSecretServing | FatSecretServing[];
    };
}

export interface FatSecretServing {
    serving_id: string;
    serving_description: string;
    metric_serving_amount?: string;
    metric_serving_unit?: string;
    calories?: string;
    protein?: string;
    carbohydrate?: string;
    fat?: string;
}

export function normalizarFatSecret(food: FatSecretFood): AlimentoNormalizado | null {
    if (!food.servings?.serving) return null;

    // serving can be an array or single object
    const servings = Array.isArray(food.servings.serving)
        ? food.servings.serving
        : [food.servings.serving];

    // Look for a serving that's per 100g, or use first one and normalize
    let bestServing = servings.find(s =>
        s.metric_serving_unit === 'g' && s.metric_serving_amount === '100'
    );

    if (!bestServing) {
        // Try to find any gram-based serving
        bestServing = servings.find(s => s.metric_serving_unit === 'g');
    }

    if (!bestServing) {
        // Use first serving as fallback
        bestServing = servings[0];
    }

    if (!bestServing?.calories) return null;

    // Normalize to per 100g if we have metric data
    let factor = 1;
    const metricAmount = parseFloat(bestServing.metric_serving_amount || '100');
    if (bestServing.metric_serving_unit === 'g' && metricAmount > 0) {
        factor = 100 / metricAmount;
    }

    return {
        origem: "FATSECRET",
        externalId: food.food_id,
        nome: food.food_name,
        calorias: Math.round(parseFloat(bestServing.calories || '0') * factor),
        proteinas: Math.round(parseFloat(bestServing.protein || '0') * factor * 10) / 10,
        carboidratos: Math.round(parseFloat(bestServing.carbohydrate || '0') * factor * 10) / 10,
        gorduras: Math.round(parseFloat(bestServing.fat || '0') * factor * 10) / 10,
    };
}
