// Converte quantidade+unidade no multiplicador a aplicar sobre os valores por 100g do alimento
export function calcularMultiplicador(
    quantidade: number,
    unidade: string,
    pesoUnidade?: number | null
): number {
    if (unidade === "g" || unidade === "ml") return quantidade / 100
    if (unidade === "un" && pesoUnidade) return (quantidade * pesoUnidade) / 100
    return quantidade // porção/prato/colher/etc, ou "un" sem peso cadastrado
}
