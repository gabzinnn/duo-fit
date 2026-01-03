"use client";

import { useState, useTransition } from "react";
import { buscarAlimentos } from "@/app/actions/buscar-alimentos";

export default function BuscaAlimentos() {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();

  function onBuscar() {
    startTransition(async () => {
      const data = await buscarAlimentos(query);
      setResultados(data);
    });
  }

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Buscar alimento..."
      />

      <button onClick={onBuscar} disabled={isPending}>
        Buscar
      </button>

      <ul>
        {resultados.map((item, index) => (
          <li key={index}>
            {item.nome} — {item.calorias} kcal / 100g
            <small> ({item.origem})</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
