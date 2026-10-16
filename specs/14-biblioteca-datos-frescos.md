# SPEC 14 — Biblioteca y home con datos frescos

> **Estado:** Aprobado
> **Depende de:** SPEC 06
> **Fecha:** 2026-10-14
> **Objetivo:** Que `/juegos` y `/` muestren récord y partidas actualizados cada 60 s, leyendo un agregado por juego de Supabase en vez de descargar todas las partidas.

---

## Por qué existe esta spec

Se investigó lentitud en `/juegos`. Medición con `npm run build` + `next start`:

| Ruta                | Tipo en build | TTFB        |
| ------------------- | ------------- | ----------- |
| `/juegos`           | ○ estática    | 0,02–0,03 s |
| `/juegos/asteroids` | ● SSG         | 0,03 s      |
| `/salon`            | ƒ dinámica    | 0,60 s      |

Conclusión: la lentitud percibida en `npm run dev` es compilación de la ruta, no un problema de producción. Pero la medición destapó dos problemas reales:

1. `app/juegos/page.tsx` y `app/page.tsx` no exportan `revalidate`. Next las prerenderiza una vez en el build. `best`/`plays` quedan congelados hasta el siguiente deploy.
2. `getGames()` y `getGame()` (`lib/games.ts`) descargan **todas** las filas de `scores` y calculan MAX/COUNT en JS. Coste lineal con el nº de partidas. Hoy solo corre en build. Con el punto 1 arreglado correrá cada 60 s.

---

## Scope

**In:**

- Supabase: vista `game_stats` con MAX/COUNT por `game_id`, aplicada con Supabase MCP `apply_migration`.
- `lib/games.ts`:
  - `getGames()` lee `game_stats` en vez de `scores`.
  - `getGame()` lee la fila de `game_stats` del juego en vez de sus `scores`.
  - Misma regla de fallback de SPEC 06: sin partidas reales → `best_seed`/`plays_seed`.
- `app/juegos/page.tsx` y `app/page.tsx`: `export const revalidate = 60`.
- `specs/BACKLOG.md`: nueva entrada para `/salon` (dinámica, 0,6 s).

**Out of scope (para futuras specs):**

- Optimizar `/salon` (va a BACKLOG).
- Revalidación on-demand al guardar puntuación (`revalidatePath`). Requiere mover `saveScore` a server action.
- `loading.tsx` en `/juegos`: la página es estática/ISR, no hay espera que cubrir.
- Velocidad de compilación en `npm run dev`.
- Cambios visuales o de copy.
- Archivo de migración en el repo (`supabase/migrations/`).

---

## Modelo de datos

```sql
-- Migración: game_stats
create view public.game_stats
with (security_invoker = true) as
select
  game_id,
  max(score)::int  as best,
  count(*)::int    as plays
from public.scores
group by game_id;
```

- `security_invoker = true`: la vista aplica la RLS de `scores` del usuario que consulta (anon). Sin ella, la vista correría con permisos del creador.
- `::int`: `count(*)` es `bigint`. Se castea para que PostgREST devuelva `number` sin ambigüedad.
- Juegos sin partidas no aparecen en la vista → se aplica el fallback a seed.

```ts
// lib/games.ts — tipo interno
interface GameStatsRow {
  game_id: string;
  best: number;
  plays: number;
}
```

`LiveStats`, `toGame()` y el tipo público `Game` no cambian.

---

## Plan de implementación

1. **Migración.** Aplicar el SQL de arriba con Supabase MCP `apply_migration` (nombre `game_stats_view`). Verificar: `execute_sql` → `select * from game_stats;` devuelve 1 fila por juego con partidas, y `best`/`plays` coinciden con `select game_id, max(score), count(*) from scores group by game_id;`.
2. **`getGames()`.** Sustituir `supabase.from("scores").select("game_id, score")` por `supabase.from("game_stats").select("game_id, best, plays")`. Construir `statsByGame` como `Map` directo desde las filas (sin acumular en bucle). Verificar: `/juegos` en dev muestra los mismos récords/partidas que antes.
3. **`getGame()`.** Sustituir la consulta de `scores` por `supabase.from("game_stats").select("best, plays").eq("game_id", id).maybeSingle()`. Sin fila → `toGame(row)` sin stats (fallback a seed). Verificar: `/juegos/asteroids` muestra los mismos valores que antes.
4. **ISR.** Añadir `export const revalidate = 60;` en `app/juegos/page.tsx` y `app/page.tsx`. Verificar: `npm run build` marca `/` y `/juegos` con revalidate 1m.
5. **BACKLOG.** Añadir entrada en `specs/BACKLOG.md`: "`/salon` es dinámica (ƒ), TTFB 0,6 s en `next start` — analizar por qué (`searchParams` `?juego=`) y si puede ser ISR".

---

## Criterios de aceptación

- [x] `select * from game_stats` en Supabase devuelve `game_id`, `best`, `plays` con los mismos valores que el agregado manual sobre `scores`.
- [x] `lib/games.ts` no contiene `from("scores")`.
- [x] Salida de `npm run build`: `/` y `/juegos` con `Revalidate 1m`.
- [x] Con `next start`: insertar una partida nueva y, pasados ≥60 s y una recarga extra, `/juegos` muestra el `plays` incrementado.
- [x] Un juego sin partidas reales sigue mostrando `best_seed`/`plays_seed`.
- [x] DevTools/servidor: la respuesta de `game_stats` tiene como máximo 1 fila por juego.
- [x] `/juegos/[id]`, `/juegos/[id]/jugar` y `/salon` muestran los mismos récords que antes del cambio.
- [x] `npx tsc --noEmit` sin errores; `npx eslint lib/games.ts app/juegos/page.tsx` sin errores nuevos.
- [x] `specs/BACKLOG.md` tiene la entrada de `/salon`.

---

## Decisiones

- **Sí:** vista `game_stats`. Se consulta como una tabla, cero código de servidor extra, respeta RLS con `security_invoker`.
- **No:** función RPC. Más código y permisos de ejecución para un agregado sin parámetros.
- **No:** agregados de PostgREST (`score.max()`). Requieren activar `db_aggregates_enabled` en el proyecto.
- **Sí:** `revalidate = 60`. Mismo valor que `/juegos/[id]`, `jugar` y `salon`.
- **No:** `revalidatePath` al guardar. `saveScore` es cliente (`lib/scores-client.ts`); exigiría server action.
- **Sí:** SQL aplicado por MCP y documentado aquí. Mismo método que SPEC 06; el repo no tiene `supabase/migrations/`.
- **No:** optimizar `/salon` aquí. Causa distinta (ruta dinámica); va a BACKLOG.
- **No:** atacar la lentitud de `npm run dev`. Medido: es compilación, no afecta a producción.

---

## Riesgos

| Riesgo                                                       | Mitigación                                                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| La vista no es legible por `anon` (grants o RLS)             | Paso 1 verifica con `execute_sql`; si falla, `grant select on public.game_stats to anon, authenticated;`. |
| Supabase caído durante una revalidación                      | `getGames()` ya cae a `FALLBACK_GAMES` si falla `games`; Next sirve la versión cacheada anterior.         |
| Datos hasta 60 s desfasados tras una partida                 | Aceptado: mismo comportamiento que el resto de páginas con datos.                                         |
| Supabase advisor marca la vista como `security_definer_view` | `security_invoker = true` lo evita; revisar `get_advisors` tras el paso 1.                                |

---

## Lo que **no** está en esta spec

- Optimización de `/salon`.
- Revalidación on-demand al guardar puntuación.
- `loading.tsx` y mejoras de dev.
- Cambios visuales.

Cada una, si llega, va en su propia spec.
