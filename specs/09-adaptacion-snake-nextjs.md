# SPEC 09 — Juego Snake en Next.js

> **Status:** Implementada
> **Depends on:** SPEC 05, SPEC 06, SPEC 08
> **Date:** 2026-09-25
> **Objective:** Crear desde cero un motor TypeScript + Client Component de Snake estilo Nokia que sustituye el juego simulado `serpentina` (renombrado a `snake`), con frutas del spritesheet `fruits.png` y puntuaciones reales en Supabase, añadiendo una entrada al registro de motores.

## Por qué existe esta spec

El catálogo ya tiene `serpentina` (SERPENTINA, `cover-snake`, ARCADE, green), placeholder temático de Snake con gameplay simulado. Igual que `rocas` → `asteroids` (SPEC 05), `caida` → `tetris` (SPEC 07) y `bloque-buster` → `arkanoid` (SPEC 08), se renombra en vez de duplicar. A diferencia de los anteriores, **no existe prototipo vanilla**: las reglas de esta spec las decidió el usuario en la fase de preguntas. El único material de partida son los assets de `references/resources/assets/snake/` (`fruits.png` 3790×442 y `sprites.js` con las coordenadas de la fila pixel-art). Snake no tiene vidas, así que la ranura "Vidas" muestra la longitud de la serpiente vía `secondaryLabel`, como Tetris con "Líneas".

## Scope

**In:**

- Copiar `references/resources/assets/snake/fruits.png` a `public/games/snake/fruits.png`.
- `lib/games/snake/sprites.ts`: constante `FRUIT_SPRITES` (22 recortes `{ x, y, w, h }` de la fila pixel-art, y=136, h=160) portada de `sprites.js` sin cambiar valores, y clase `FruitSheet` que carga `/games/snake/fruits.png` y expone `draw(ctx, name, x, y, size)`. Sin estado mutable a nivel de módulo.
- Motor `lib/games/snake/engine.ts` (`SnakeEngine`) con estas reglas:
  - Canvas 800×600, grid de `COLS = 40` × `ROWS = 30` celdas de `CELL = 20` px.
  - Serpiente inicial de 3 segmentos en el centro, moviéndose a la derecha.
  - Movimiento por ticks: `BASE_TICK_MS = 150`, `-TICK_STEP_MS = 10` por nivel, mínimo `MIN_TICK_MS = 60`.
  - Chocar con la pared o con el propio cuerpo termina la partida (`phase = 'gameover'`).
  - Comer fruta: +1 segmento y `+10 × level` puntos.
  - Nivel sube +1 cada `FRUITS_PER_LEVEL = 5` frutas.
  - Fruta aparece en una celda libre aleatoria, con un sprite aleatorio de `FRUIT_SPRITES`.
  - Si no quedan celdas libres (tablero lleno) → `phase = 'gameover'` con el score final.
- Estado emitido por callback: `{ score, lives, level, phase }`, con `lives = longitud de la serpiente`.
- Controles: flechas y WASD cambian dirección; `P`/`Escape` pausa/reanuda. Cola de giros de máximo 2 entradas; se ignora el giro de 180° respecto a la última dirección encolada. `preventDefault` en flechas y espacio.
- `SnakeEngine` expone `start()`, `pause()`, `resume()`, `forceGameOver()`, `restart()` y `destroy()`. `restart()` vuelve a nivel 1, longitud 3, score 0.
- `components/games/snake-game.tsx` (`"use client"`, `forwardRef<SnakeGameHandle, { onStateChange }>`), copia estructural de `components/games/asteroids-game.tsx`.
- `lib/games/registry.ts`: añadir `snake: { component: SnakeGame, secondaryLabel: "Longitud" }`.
- Paso en Supabase vía MCP de Supabase: `update games set id = 'snake', title = 'SNAKE' where id = 'serpentina'`. Si el MCP no está conectado al llegar a este paso, el agente se detiene y pide al usuario que lo active.

**Out of scope (para specs futuras):**

- Nueva portada: `cover-snake` se mantiene; no se toca `app/globals.css`.
- Cambios en `components/player.tsx`.
- Sonido (no hay assets de audio).
- Sprites para la serpiente (el spritesheet solo tiene frutas): se dibuja con rectángulos.
- Filas vectorial y realista de `fruits.png`.
- Puntuación distinta por tipo de fruta.
- Obstáculos, mapas por nivel o modo wraparound.
- Controles táctiles.
- Redirección desde `/juegos/serpentina`.

## Modelo de datos

```ts
// lib/games/snake/engine.ts
export const W = 800;
export const H = 600;
export const CELL = 20;
export const COLS = 40; // W / CELL
export const ROWS = 30; // H / CELL
export const BASE_TICK_MS = 150;
export const TICK_STEP_MS = 10;
export const MIN_TICK_MS = 60;
export const FRUITS_PER_LEVEL = 5;
export const INITIAL_LENGTH = 3;

// "dead" no se usa en Snake; se mantiene por contrato con player.tsx
export type SnakePhase = "playing" | "dead" | "gameover" | "paused";

export interface SnakeState {
  score: number;
  lives: number; // longitud de la serpiente (HUD: "Longitud")
  level: number;
  phase: SnakePhase;
}

type Dir = { x: -1 | 0 | 1; y: -1 | 0 | 1 };
type Cell = { x: number; y: number }; // coordenadas de grid, no px

export class SnakeEngine {
  constructor(
    canvas: HTMLCanvasElement,
    onStateChange: (state: SnakeState) => void,
  );
  start(): void;
  pause(): void;
  resume(): void;
  forceGameOver(): void;
  restart(): void;
  destroy(): void;
}
```

```ts
// lib/games/snake/sprites.ts
export type FruitName =
  "banana" | "orange" | /* …22 claves de sprites.js */ "melon";
export const FRUIT_SPRITES: Record<
  FruitName,
  { x: number; y: number; w: number; h: number }
>;
export class FruitSheet {
  loaded: boolean;
  draw(
    ctx: CanvasRenderingContext2D,
    name: FruitName,
    x: number,
    y: number,
    size: number,
  ): void;
}
```

```ts
// components/games/snake-game.tsx
export interface SnakeGameHandle {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  restart: () => void;
}
```

```ts
// lib/games/registry.ts — entrada nueva
snake: { component: SnakeGame, secondaryLabel: "Longitud" },
```

```sql
-- Fila del catálogo (vía MCP de Supabase). Solo cambian id y title.
-- Sin cambios: short, long, category 'ARCADE', cover 'cover-snake', color 'green', best_seed, plays_seed.
update games set id = 'snake', title = 'SNAKE' where id = 'serpentina';
```

Convenciones:

- Grid: origen arriba-izquierda; `Cell` en unidades de celda; px = `cell * CELL`.
- El tick usa un acumulador en ms: `acc += dt * 1000`; mientras `acc >= tickMs` se avanza un paso. `dt` sigue clampeado a 0.05 s.
- `tickMs = max(MIN_TICK_MS, BASE_TICK_MS - (level - 1) * TICK_STEP_MS)`.
- La fruta se dibuja escalada para caber en la celda manteniendo proporción (sprites de 110–170 × 160 px).
- `phase = 'paused'` congela la simulación sin cancelar el frame, igual que asteroids/tetris/arkanoid.
- Asset servido desde `public/`: URL en runtime `/games/snake/fruits.png`.

## Plan de implementación

1. Copiar `fruits.png` a `public/games/snake/fruits.png`. Verificar: `npm run dev` sirve `/games/snake/fruits.png` con 200.
2. Crear `lib/games/snake/sprites.ts`: `FruitName`, `FRUIT_SPRITES` (valores de `sprites.js` sin cambios) y clase `FruitSheet` (carga la imagen en el constructor, flag `loaded`, `draw` retorna temprano si no está cargada). Verificar: `npx tsc --noEmit` sin errores nuevos.
3. Crear `lib/games/snake/engine.ts` (parte 1): constantes, tipos, clase `SnakeEngine` con campos de instancia (`snake: Cell[]`, `dir`, `dirQueue`, `fruit`, `fruitName`, `fruitsEaten`, `score`, `level`, `state`, `paused`, `acc`, `sheet`, `rafId`, `lastTime`), constructor que obtiene el contexto 2D (lanza si es null), instancia `FruitSheet` y llama a `reset()` (serpiente inicial + `spawnFruit()`). Verificar: `npx tsc --noEmit` sin errores nuevos.
4. `engine.ts` (parte 2): `update(dt)` con acumulador de tick y `step()`: consumir un giro de la cola, calcular nueva cabeza, colisión pared/cuerpo → `gameover`, comer fruta (+1 segmento, `+10 × level`, nivel cada 5 frutas, `spawnFruit()`; sin celdas libres → `gameover`). Verificar: `npx tsc --noEmit` sin errores nuevos.
5. `engine.ts` (parte 3): `draw()` — fondo oscuro, fruta vía `FruitSheet`, serpiente con rectángulos verdes (cabeza más clara). Sin HUD ni overlays en el canvas. Verificar: `npx tsc --noEmit` sin errores nuevos.
6. `engine.ts` (parte 4): loop e input. `start()` idempotente; `keydown` en `window` como arrow class field (flechas + WASD encolan dirección, máx. 2, sin giro de 180°; `P`/`Escape` alternan pausa; `preventDefault` en flechas/espacio). Loop: `if (!paused) update(dt)`, siempre `draw()` y `emitState()`. Añadir `pause`, `resume`, `forceGameOver`, `restart` (`reset()`) y `destroy` (cancela RAF, quita listener). Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
7. Crear `components/games/snake-game.tsx`, espejo de `asteroids-game.tsx`: callback en ref, estado local reenviado por efecto, montaje con deps `[]` y `destroy()` en el cleanup, `useImperativeHandle` con los cuatro métodos, `<canvas width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
8. Añadir `snake: { component: SnakeGame, secondaryLabel: "Longitud" }` a `GAME_ENGINES` en `lib/games/registry.ts`. Verificar: `npx tsc --noEmit` sin errores.
9. Supabase vía MCP. **Precondición:** si el MCP no está conectado, el agente se detiene y pide al usuario que lo active. Con MCP: comprobar que `select count(*) from scores where game_id = 'serpentina'` devuelve 0 (FK sin `on update cascade`); ejecutar el `update` del Modelo de datos. Verificar: `select id, title, cover from games where id = 'snake'` devuelve `snake | SNAKE | cover-snake`.
10. Gate: `npx tsc --noEmit`, `npm run lint` y `npm run build` sin errores.

## Criterios de aceptación

- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [x] `/juegos` muestra la card "SNAKE" con `cover-snake` y ya no muestra "SERPENTINA".
- [x] `/juegos/snake` carga mostrando "Mejor global" y "Partidas".
- [x] `/juegos/snake/jugar` renderiza el canvas con la serpiente y una fruta del spritesheet, no el `.game-arena` simulado.
- [x] La serpiente empieza con 3 segmentos y el HUD muestra "Longitud 3".
- [x] Flechas y WASD cambian la dirección; pulsar la dirección opuesta no invierte la serpiente.
- [x] Dos giros rápidos consecutivos (p. ej. `↑` `←`) se aplican ambos en ticks sucesivos.
- [x] Comer una fruta en nivel 1 suma exactamente 10 puntos y la longitud sube en 1.
- [x] Tras 5 frutas el nivel pasa a 2, la serpiente se mueve más rápido y cada fruta suma 20.
- [x] Cada fruta nueva aparece en una celda no ocupada por la serpiente.
- [x] Chocar con la pared abre el modal de fin de partida sin pulsar FIN.
- [x] Chocar con el propio cuerpo abre el modal de fin de partida sin pulsar FIN.
- [x] Flechas y espacio no hacen scroll de la página mientras se juega.
- [x] PAUSA congela el juego y REANUDAR continúa sin perder estado; `P`/`Escape` hacen lo mismo.
- [x] FIN abre el modal con la puntuación real.
- [x] JUGAR DE NUEVO empieza en nivel 1, longitud 3 y score 0.
- [x] GUARDAR PUNTUACIÓN inserta una fila con `game_id = 'snake'` visible en `/juegos/snake` y `/salon?juego=snake`; si falla, el modal muestra el error y permite reintentar.
- [x] `/juegos/asteroids/jugar`, `/juegos/tetris/jugar` y `/juegos/arkanoid/jugar` siguen funcionando igual.
- [x] Un juego sin motor (p. ej. `/juegos/gloton/jugar`) sigue mostrando el `.game-arena` simulado.
- [x] SALIR y volver a entrar no duplica input ni deja errores en consola (incluido Strict Mode en `npm run dev`).
- [x] A 400px de ancho el canvas se escala dentro de `.crt-screen` sin scroll horizontal.

## Decisiones

- **Sí:** renombrar `serpentina` → `snake` en Supabase. Mismo precedente que SPEC 05/07/08; evita dos Snakes en la Biblioteca.
- **No:** fila nueva `snake` junto a `serpentina`. Duplicaría el juego.
- **Sí:** mantener `cover-snake`, color `green`, `ARCADE` y textos. Ya describen un Snake.
- **Sí:** paredes letales, como el Snake clásico de Nokia. Elección del usuario.
- **No:** wraparound ni modo mixto por nivel. Más cercano a Snake II; queda fuera.
- **Sí:** grid 40×30 de celdas de 20 px en 800×600. Es 4:3, encaja en `.crt-screen` sin tocar CSS.
- **Sí:** velocidad por nivel (150 ms, −10 ms/nivel, mín. 60 ms), nivel cada 5 frutas. Da sentido al campo "Nivel" del HUD.
- **Sí:** `+10 × level` por fruta. Premia sobrevivir a alta velocidad.
- **No:** puntos por tipo de fruta. Requiere diseñar una tabla de valores; sin beneficio claro.
- **Sí:** `lives` = longitud con `secondaryLabel: "Longitud"`. Patrón Tetris; no se edita `player.tsx`.
- **No:** 3 vidas con corazones. Se aleja del original.
- **Sí:** tablero lleno → `phase = 'gameover'`. Respeta el contrato del motor sin añadir `'win'`.
- **Sí:** fila pixel-art de `fruits.png` con fruta aleatoria. Coordenadas ya medidas en `sprites.js`; estética coherente con el arcade.
- **Sí:** elegir fruta al azar sin depender de su nombre. Los nombres de `sprites.js` no coinciden visualmente con el orden de la imagen (x=34 no es un plátano); al ser aleatoria, el desfase no afecta al juego.
- **Sí:** serpiente dibujada con rectángulos. El spritesheet no incluye sprites de serpiente.
- **Sí:** cola de giros de máx. 2 y bloqueo del giro de 180°. Evita perder pulsaciones rápidas y el suicidio por doble giro dentro de un tick.
- **Sí:** flechas + WASD, `P`/`Escape` para pausa.
- **Sí:** rename vía MCP de Supabase ejecutado por el agente, como SPEC 08.
- **Sí:** persistencia real vía `saveScore`. Todo juego con motor guarda desde SPEC 07.
- **No:** sonido. No hay assets de audio.
- **No:** controles táctiles. Merecen su propia spec.

## Riesgos

| Riesgo                                                                                                 | Mitigación                                                                                  |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| El `update` de `games.id` falla si hay filas en `scores` con `game_id = 'serpentina'` (FK sin cascade) | El paso 9 comprueba el `count` antes; si no es 0, borrar o migrar esas filas primero.       |
| Pulsaciones más rápidas que el tick se pierden o provocan giro de 180°                                 | Cola de giros (máx. 2) validada contra la última dirección encolada.                        |
| Carga async de `fruits.png` deja la fruta invisible los primeros frames                                | `FruitSheet.draw` retorna temprano hasta `loaded`; efecto breve.                            |
| Sprites de fruta escalados a 20 px pierden detalle                                                     | Aceptado; se dibujan con `imageSmoothingEnabled = false` para mantener el pixel-art nítido. |
| `/juegos/serpentina` queda en 404 tras el rename                                                       | Aceptado; sin redirección, igual que los renames anteriores.                                |
| `app/page.tsx` muestra solo los 6 primeros juegos y `getGames()` no ordena                             | Riesgo preexistente; snake puede no salir en la home. No se corrige aquí.                   |

## Lo que **no** está en esta spec

- Nueva portada para snake (`cover-snake` se mantiene).
- Cambios en `components/player.tsx`.
- Sonido.
- Sprites de serpiente.
- Puntuación por tipo de fruta.
- Obstáculos, mapas o modo wraparound.
- Controles táctiles.
- Redirección desde `/juegos/serpentina`.

Cada uno, si llega, va en su propia spec.
