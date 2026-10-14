# game-performance-booster memory

## Catálogo aprendido

Seed P01–P08 vive en el agente. Patrones nuevos desde P09.

| ID  | Anti-patrón | Señal | Fix | Origen (juego, fecha) |
| --- | ----------- | ----- | --- | --------------------- |

## Lecciones

- 2026-05-25 — frogger: los fixes genéricos (P01–P06) dejaron fluidos clasico/retro pero no neon; causa real `shadowBlur` (~65 llamadas/frame) → auditar siempre cada skin por separado (P07).
- 2026-10-14 — frogger: las rutas citadas en SPEC 13 (`FroggerGame.tsx`, `app/games/frogger/play/page.tsx`) no existen; arquitectura real `lib/games/<id>/engine.ts` + `components/games/<id>-game.tsx` + `components/player.tsx`.

## Historial

| date       | juego   | fallos (IDs) | spec                            | status       |
| ---------- | ------- | ------------ | ------------------------------- | ------------ |
| 2026-05-25 | frogger | P01–P07      | specs/13-frogger-performance.md | implementado |
