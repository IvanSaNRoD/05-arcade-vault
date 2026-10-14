# SPEC NN — Re-auditoría de rendimiento de Frogger (residuales post SPEC 13)

> **Estado:** Implementado (pendiente verificación manual)
> **Depende de:** specs/12-frogger-core.md, specs/13-frogger-performance.md
> **Fecha:** 2026-10-14
> **Objetivo:** Eliminar las allocaciones por frame, los redraws en game over y las búsquedas O(n) por frame que quedaron en `FroggerEngine` tras SPEC 13, más el render intermedio del bridge.

---

## Por qué existe este spec

SPEC 13 se implementó sobre una arquitectura que ya no existe (`FroggerGame.tsx`, `play/page.tsx`).
El motor actual (`lib/games/frogger/engine.ts`) conserva los fixes principales (`pauseDrawn`, `clock % TURTLE_CYCLE_MS`, `emitState` solo con cambios, `memo`, `destroy`).
La re-auditoría estática encontró residuales que SPEC 13 no cubría o cubrió a medias.

Resultado de la auditoría (única ruta de dibujo: Frogger no tiene skins, sin `setSkin` ni `shadowBlur`):

| Patrón                           | Resultado         | Severidad | Ubicación                                                                                    | Llamadas/frame                      |
| -------------------------------- | ----------------- | --------- | -------------------------------------------------------------------------------------------- | ----------------------------------- |
| P01 allocs por frame (ruedas)    | falla             | alta      | `lib/games/frogger/engine.ts:500-505`                                                        | 5 arrays × 9 coches = 45            |
| P01 allocs por frame (rana)      | falla             | media     | `lib/games/frogger/engine.ts:576`, `:589`                                                    | 2 × (1 rana + ≤4 bocas) ≤ 10        |
| P01 closure `forEach`            | falla             | media     | `lib/games/frogger/engine.ts:473`                                                            | 1                                   |
| P01 closures `some`/`find`       | falla             | media     | `lib/games/frogger/engine.ts:160-163`, `:168-169`                                            | ~13                                 |
| P02 redraw congelado             | falla (game over) | media     | `lib/games/frogger/engine.ts:264-268`                                                        | 1 draw completo/frame bajo el modal |
| P03 timers                       | ok                | —         | `engine.ts:342` (`clock %`), `:349-350` (wrap `col`)                                         | —                                   |
| P04 lookup O(n)                  | falla             | media     | `engine.ts:159-172`, llamado en `:384`, `:387`                                               | 11 carriles escaneados × 2          |
| P05 bridge re-renders            | ok                | —         | `components/games/frogger-game.tsx:31` (`memo`), `components/player.tsx:113` (`useCallback`) | —                                   |
| P06 setState a ritmo de juego    | ok                | —         | `engine.ts:233-247` (emite solo con cambio)                                                  | —                                   |
| P07 `shadowBlur`                 | n/a               | —         | 0 ocurrencias en `lib/games/frogger/`                                                        | 0                                   |
| P08 leaks                        | ok                | —         | `engine.ts:276-282`, `frogger-game.tsx:56-59`                                                | —                                   |
| P09 texto HUD por frame          | falla             | media     | `engine.ts:612`, `:614`                                                                      | 2 strings                           |
| P10 bridge con `useState` puente | falla             | baja      | `frogger-game.tsx:38`, `:46-48`, `:53`                                                       | por evento                          |

Falsos positivos descartados: `t.divers?.includes(i)` (`engine.ts:131`, solo en `buildLanes`), `GOAL_COLS.findIndex` (`:178`, solo al aterrizar en fila 0), `goals.every` (`:418`, por evento), `ctx.font` (`:608`, misma cadena cada frame, coste despreciable).

---

## Scope

**In:**

- `lib/games/frogger/engine.ts`
  - [P01] Ruedas de coche sin array literal: un único path con 4 subpaths `moveTo` + `arc` y un solo `fill()` por coche.
  - [P01] `drawFrogShape`: bucles `for (let sx = -1; sx <= 1; sx += 2)` en lugar de `for (const sx of [-1, 1])`.
  - [P01] `drawGoals`: `for` indexado en lugar de `GOAL_COLS.forEach(...)`.
  - [P02] Game over congelado igual que la pausa: un frame y luego no se dibuja hasta `restart()`.
  - [P04] Índice `laneByRow` construido junto con `lanes`; `checkRoadCollision` y `getSupport` consultan el carril de la fila de la rana en O(1) y recorren sus entidades con `for...of` sin closures.
  - [P09] Cadenas del HUD (`00000`, `NIVEL N`) cacheadas y recalculadas solo cuando cambia `score` o `level`.
- `components/games/frogger-game.tsx`
  - [P10] Eliminar `useState` + efecto reenviador: el motor llama directamente a `onStateChangeRef.current`.

**Out:**

- Los demás juegos. P10 está presente en los 5 bridges (`asteroids`, `tetris`, `arkanoid`, `snake`, `frogger`): cada uno en su propio spec.
- `components/player.tsx`: P05/P06 cumplen; sin cambios.
- Caché offscreen del fondo estático (6 `fillRect` + 64 marcas de carretera): descartado en SPEC 13 y se mantiene descartado.
- Skins de Frogger (`specs/skins/frogger-skins.md`): no se implementan aquí; ver Riesgos.
- Cambios visuales: el render resultante debe ser idéntico píxel a píxel.
- Profiling formal: solo verificación manual en criterios de aceptación.

---

## Modelo de datos

```ts
// engine.ts — módulo
const TAU = Math.PI * 2;

function indexLanesByRow(lanes: Lane[]): (Lane | undefined)[]; // índice = lane.row, longitud ROWS

// engine.ts — FroggerEngine (campos nuevos)
private laneByRow: (Lane | undefined)[] = [];
private hudScoreVal = -1;     // score con el que se generó hudScoreText
private hudScoreText = "";    // String(score).padStart(5, "0")
private hudLevelVal = -1;     // level con el que se generó hudLevelText
private hudLevelText = "";    // `NIVEL ${level}`
```

`pauseDrawn` se reutiliza para pausa y game over (sin campo nuevo).
`frogger-game.tsx` pierde `state` / `setState`; no añade estructuras.

---

## Plan de implementación

1. **[P01] Ruedas sin arrays** (`engine.ts:499-509`). Sustituir el `for (const [cx, cy] of [...])` por un path único:

   ```ts
   ctx.fillStyle = "#111";
   const lx = x + 10,
     rx = x + w - 10,
     ty = y + 9,
     by = y + CELL - 9;
   ctx.beginPath();
   ctx.moveTo(lx + 4, ty);
   ctx.arc(lx, ty, 4, 0, TAU);
   ctx.moveTo(rx + 4, ty);
   ctx.arc(rx, ty, 4, 0, TAU);
   ctx.moveTo(lx + 4, by);
   ctx.arc(lx, by, 4, 0, TAU);
   ctx.moveTo(rx + 4, by);
   ctx.arc(rx, by, 4, 0, TAU);
   ctx.fill();
   ```

   Añadir `const TAU = Math.PI * 2;` a nivel de módulo. Verificar: `npx tsc --noEmit` sin errores; las ruedas se ven iguales en las filas 9, 10 y 12.

2. **[P01] Rana y bocas sin allocs** (`engine.ts:473`, `:576`, `:589`). `drawGoals`: `for (let i = 0; i < GOAL_COLS.length; i++) { const col = GOAL_COLS[i]; ... }`. `drawFrogShape`: los dos `for (const sx of [-1, 1])` pasan a `for (let sx = -1; sx <= 1; sx += 2)`. Verificar: rana y ranas en bocas ocupadas idénticas; `tsc` limpio.

3. **[P09] HUD cacheado** (`engine.ts:612-614`). Al inicio de `drawHud`:

   ```ts
   if (this.score !== this.hudScoreVal) {
     this.hudScoreVal = this.score;
     this.hudScoreText = String(this.score).padStart(5, "0");
   }
   if (this.level !== this.hudLevelVal) {
     this.hudLevelVal = this.level;
     this.hudLevelText = `NIVEL ${this.level}`;
   }
   ```

   `fillText(this.hudScoreText, 8, 1)` y `fillText(this.hudLevelText, CANVAS_W / 2, 1)`. Verificar: el HUD del canvas muestra `00000` / `NIVEL 1` al empezar y se actualiza al avanzar filas y al subir de nivel.

4. **[P02] Game over congelado** (`engine.ts:258-268`). En el loop:

   ```ts
   if (this.paused || this.state === "gameover") {
     if (!this.pauseDrawn) {
       this.draw();
       this.pauseDrawn = true;
     }
   } else {
     this.pauseDrawn = false;
     this.update(dt);
     this.draw();
   }
   ```

   El `if (this.state === "playing")` de `update` desaparece porque la rama `else` ya implica `playing`. Verificar: `console.count('draw')` temporal en `draw()` se detiene tras game over (por muerte y por botón FIN) y se reanuda tras JUGAR DE NUEVO.

5. **[P04] Índice de carril por fila** (`engine.ts:121-172`, `:312`, `:428`). Añadir `indexLanesByRow(lanes)` a nivel de módulo (array de longitud `ROWS`, `out[l.row] = l`). En `reset()` y `completeRound()`, tras `this.lanes = buildLanes(...)`, asignar `this.laneByRow = indexLanesByRow(this.lanes)`. Cambiar las firmas a `checkRoadCollision(frog: Frog, lane: Lane | undefined)` y `getSupport(frog: Frog, lane: Lane | undefined)`, con `for (const e of lane.entities)` en lugar de `some`/`find`. En `update` (`:384`, `:387`) pasar `this.laneByRow[frog.row]`. Mantener las comprobaciones `isRoadRow` / `isRiverRow`. Verificar: atropello en carretera, ahogamiento en agua, arrastre en tronco y muerte en tortuga sumergida se comportan igual que antes.

6. **[P10] Bridge sin `useState` puente** (`frogger-game.tsx:38`, `:46-48`, `:53`). Eliminar `const [state, setState]` y el efecto `[state]`. Construir el motor con `new FroggerEngine(canvas, (s) => onStateChangeRef.current(s))`. Quitar `useState` del import. Verificar: el HUD React (puntuación, vidas, nivel, PAUSA/REANUDAR, modal de fin) responde igual; React Profiler muestra 1 commit por evento (antes 2: bridge + Player).

---

## Criterios de aceptación

- [ ] `npx tsc --noEmit` sin errores y `npx eslint lib/games/frogger components/games/frogger-game.tsx` sin errores nuevos.
- [ ] Chrome DevTools > Memory: el heap no muestra dientes de sierra crecientes durante 2 min de juego continuo (único skin actual).
- [ ] DevTools > Performance: 0 frames > 16,7 ms en los primeros 60 s de juego a nivel 1 y a nivel 3.
- [ ] `console.count('draw')` temporal queda congelado en pausa y en game over, y vuelve a contar tras REANUDAR / JUGAR DE NUEVO.
- [ ] `grep -n "of \[" lib/games/frogger/engine.ts` devuelve 0 líneas dentro de `draw*`.
- [ ] `grep -nE "\.(some|find|forEach)\(" lib/games/frogger/engine.ts` no devuelve líneas en `update`, `draw` ni en `checkRoadCollision` / `getSupport`.
- [ ] HUD canvas y HUD React muestran puntuación, vidas y nivel correctos al avanzar, morir, ocupar boca y completar ronda.
- [ ] PAUSA / REANUDAR, teclas P / Escape, FIN y JUGAR DE NUEVO funcionan igual que antes.
- [ ] React Profiler: 0 re-renders de `Player` y de `FroggerGame` mientras la rana está quieta en la fila de inicio; 1 commit por cambio de puntuación.
- [ ] Render visual idéntico (captura antes/después en la misma posición de pausa).

---

## Decisiones tomadas y descartadas

- **Sí:** un path con 4 subpaths para las ruedas. Elimina 45 arrays/frame y reduce 36 `fill()` a 9. (decisión del agente, revisar)
- **Sí:** reutilizar `pauseDrawn` para game over en vez de un flag nuevo. Ambos estados son "pantalla congelada" y `restart()` / `resume()` ya vuelven a la rama de juego. (decisión del agente, revisar)
- **Sí:** `laneByRow` como array indexado por fila, no `Map`. Las filas son enteros 0–13; un array es más simple y O(1). (decisión del agente, revisar)
- **Sí:** cachear las cadenas del HUD canvas en el motor, no mover el HUD del canvas al DOM. Cero cambio visual. (decisión del agente, revisar)
- **Sí:** quitar el `useState` puente del bridge solo en Frogger; el patrón está en los 5 bridges, pero un spec = un juego. (decisión del agente, revisar)
- **No:** caché offscreen del fondo estático. ~70 `fillRect` sólidos por frame son baratos; ya descartado en SPEC 13.
- **No:** sacar `ctx.font` / `textBaseline` a `constructor`. Cadena idéntica cada frame, coste despreciable; y una futura skin podría cambiar la fuente.
- **No:** parar el RAF en game over. Mismo motivo que en SPEC 13: arranque diferido más complejo; saltar `draw()` basta.
- **No:** tocar `components/player.tsx`. `handleEngineState` es estable y el motor emite solo con cambios (P05/P06 ok).

---

## Riesgos identificados

| Riesgo                                                                                                                                                                                         | Mitigación                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `specs/skins/frogger-skins.md` (borrador) prescribe en su paso 3 `shadowBlur = p.glow` por coche, camión, tronco y tortuga en `neon`: reintroduce el jank P07 de SPEC 13 (~60 llamadas/frame). | Al implementar ese spec, hornear el glow en sprites offscreen por tipo/ancho/color y reconstruirlos en `setSkin` (patrón de SPEC 13, post-implementación). Re-auditar Frogger con este agente tras las skins. |
| Game over congelado: si `forceGameOver()` llega en pausa, `pauseDrawn` ya es `true` y no se redibuja.                                                                                          | Correcto: el frame de pausa es idéntico al de game over (el modal React lo tapa). Sin acción.                                                                                                                 |
| `setSkin` futuro con game over congelado no redibujaría.                                                                                                                                       | El spec de skins ya prevé `this.pauseDrawn = false` en `setSkin`; cubre también game over.                                                                                                                    |
| Sin el `useState` puente, `onStateChange` se ejecuta dentro del callback RAF en vez de en un efecto.                                                                                           | Player solo llama setters; React 19 agrupa las actualizaciones fuera de render. Nunca se emite durante render (`emitState` corre en RAF o en handlers).                                                       |
| `laneByRow` desincronizado si se reasigna `lanes` sin reindexar.                                                                                                                               | Solo hay dos asignaciones (`reset`, `completeRound`); ambas reindexan en el mismo paso.                                                                                                                       |

---

## Qué **no** entra en este spec

- Fixes de rendimiento de Asteroids, Tetris, Arkanoid o Snake (incluido su P10).
- Skins de Frogger y su caché de sprites neon.
- Fondo offscreen / dirty-rect.
- Cambios en `components/player.tsx` o en el diseño visual.
