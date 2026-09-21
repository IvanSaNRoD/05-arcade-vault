"use client";

import { useMemo, useState } from "react";
import { GameCard } from "@/components/game-card";
import { CATEGORIES, type Game } from "@/lib/games-types";

type CategoryFilter = (typeof CATEGORIES)[number];

export function Library({ games }: { games: Game[] }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("TODOS");

  const filtered = useMemo(
    () =>
      games.filter(
        (g) =>
          (category === "TODOS" || g.category === category) &&
          g.title.toLowerCase().includes(q.toLowerCase()),
      ),
    [games, q, category],
  );

  return (
    <>
      <div className="av-filters">
        <div className="av-search">
          <span className="ico">⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar un juego por nombre…"
            aria-label="Buscar un juego por nombre"
          />
        </div>
        <div className="av-chips">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={"chip" + (category === c ? " active" : "")}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="av-grid">
        {filtered.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full p-20 text-center text-ink-faint">
            <div className="pixel mb-3 text-[14px] text-magenta">
              NO HAY RESULTADOS
            </div>
            <div>Intenta otra búsqueda o categoría.</div>
          </div>
        )}
      </div>
    </>
  );
}
