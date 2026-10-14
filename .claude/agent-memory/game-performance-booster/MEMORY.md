# game-performance-booster memory

## Catálogo aprendido

Seed P01–P08 vive en el agente. Patrones nuevos desde P09.

| ID  | Anti-patrón                             | Señal                                                                                                                                            | Fix                                                                                                           | Origen (juego, fecha)                           |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| P09 | Texto HUD canvas reconstruido por frame | `fillText(` con `String(`, `.padStart(`, `.toString(` o template literal dentro de `drawHud`/`draw`                                              | Cachear la cadena + valor fuente en campos; recalcular solo si el valor cambia                                | frogger, 2026-10-14                             |
| P10 | Bridge con `useState` puente            | `new XEngine(canvas, setState)` + `useEffect(() => { if (state) onStateChangeRef.current(state) }, [state])` en `components/games/<id>-game.tsx` | Pasar `(s) => onStateChangeRef.current(s)` al motor y eliminar el `useState`: 1 commit por evento en vez de 2 | frogger, 2026-10-14 (presente en los 5 bridges) |

## Lecciones

- 2026-05-25 — frogger: los fixes genéricos (P01–P06) dejaron fluidos clasico/retro pero no neon; causa real `shadowBlur` (~65 llamadas/frame) → auditar siempre cada skin por separado (P07).
- 2026-10-14 — frogger: las rutas citadas en SPEC 13 (`FroggerGame.tsx`, `app/games/frogger/play/page.tsx`) no existen; arquitectura real `lib/games/<id>/engine.ts` + `components/games/<id>-game.tsx` + `components/player.tsx`.
- 2026-10-14 — frogger: el motor actual NO tiene skins (sin `setSkin`, 0 `shadowBlur`); el sprite cache neon de SPEC 13 se perdió en el port. P07 = n/a hoy, pero revisar también borradores en `specs/skins/<id>-skins.md`: el de frogger prescribe `shadowBlur` por entidad → riesgo P07 futuro.
- 2026-10-14 — P01: añadir a la señal `for (const ... of [` (array literal como fuente de iteración, ej. ruedas 5 arrays × coche) y `.forEach(` con closure en `draw*`.
- 2026-10-14 — P02: la señal debe cubrir también `gameover` (loop que llama `draw()` cada frame bajo el modal de fin), no solo pausa. Fix: misma bandera `pauseDrawn` para `paused || gameover`.
- 2026-10-14 — P04: buscar también `lanes.some/find` en helpers de colisión llamados cada frame desde `update` (no solo `indexOf` en `draw`). Fix: array indexado por fila.
- 2026-10-14 — falsos positivos: `.includes`/`.findIndex`/`.every` en `buildLanes`/aterrizaje (por evento); `ctx.font` con cadena idéntica por frame (despreciable).
- 2026-10-14 — P06 en player.tsx: setState directo es ok si el motor emite solo con cambio (`emitState` con `lastEmitted`); el fix refs+DOM de SPEC 13 no aplica a la arquitectura actual.

## Historial

| date       | juego   | fallos (IDs)            | spec                                     | status       |
| ---------- | ------- | ----------------------- | ---------------------------------------- | ------------ |
| 2026-05-25 | frogger | P01–P07                 | specs/13-frogger-performance.md          | implementado |
| 2026-10-14 | frogger | P01, P02, P04, P09, P10 | specs/performance/frogger-performance.md | generado     |
