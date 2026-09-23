# SPEC 08 — Adaptación del juego Arkanoid a Next.js

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-09-23
> **Objective:** Portar el prototipo de Arkanoid (`references/resources/started-games/04-arkanoid/`) a un motor TypeScript + Client Component que sustituye el juego simulado `bloque-buster` (renombrado a `arkanoid`), con spritesheet, sonidos y puntuaciones reales en Supabase, añadiendo una entrada al registro de motores.

## Por qué existe esta spec

El catálogo ya tiene `bloque-buster` (BLOQUE BUSTER, `cover-bricks`, ARCADE, cyan), placeholder temático de breakout con gameplay simulado; igual que `rocas` → `asteroids` (SPEC 05) y `caida` → `tetris` (SPEC 07), se renombra en vez de duplicar. El registro `lib/games/registry.ts` ya existe (SPEC 07), así que añadir Arkanoid es una entrada más. Arkanoid es el primer juego portado que usa assets: un spritesheet PNG y dos MP3, más una animación de explosión por frames; ambos se copian a `public/games/arkanoid/`. Arkanoid sí tiene vidas (3), así que mapea directo a la ranura "Vidas" con corazones, sin `secondaryLabel`.

## Scope

**In:**

- Copiar assets a `public/games/arkanoid/`: `spritesheet.png` (desde `assets/spritesheet-breakout.png`), `ball-bounce.mp3` y `break-sound.mp3` (desde `assets/sounds/`).
- `lib/games/arkanoid/sprites.ts`: constantes `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION` (150 ms) portadas de `assets/spritesheet.js`, y una clase `Spritesheet` que carga `/games/arkanoid/spritesheet.png` y expone `drawSprite(ctx, name, x, y, w, h)` y `drawFrame(ctx, frame, x, y, w, h)`. Sin estado mutable a nivel de módulo (el prototipo usaba `ssImg`/`ssLoaded` globales): la instancia la posee el motor.
- `lib/games/arkanoid/levels.ts`: `LEVELS` (5 niveles con `speed` y `blocks[]`) portado de `levels.js` sin cambios de valores.
- Motor `lib/games/arkanoid/engine.ts` (`ArkanoidEngine`), portado de `game.js` con constantes y valores originales: `PADDLE_SPEED = 400`, `BLOCK_COLS = 10`, `BLOCK_ROWS = 6`, `BLOCK_W = 64`, `BLOCK_H = 24`, `BLOCK_COLORS`, `BLOCKS_ORIGIN_X`, `BLOCKS_ORIGIN_Y = 80`, `BASE_BALL_VX = 200`, `BASE_BALL_VY = -300`, `paddle` (`w = 81`, `h = 14`), `ball` (16×16), `W = 800`, `H = 600`.
- Estado emitido por callback: `{ score, lives, level, phase }` con `phase: 'playing' | 'dead' | 'gameover' | 'paused'`. Puntuación +10 por bloque; vidas empiezan en 3 y bajan cuando la bola cae bajo el canvas; nivel 1–5 avanza al limpiar todos los bloques.
- Estado `win` del prototipo (limpiar el nivel 5): mapea a `phase = 'gameover'` con el score final, abriendo el mismo modal de fin de partida (`dead` no se usa en Arkanoid; se mantiene por contrato).
- Controles: ratón (`mousemove` sobre el canvas) **y** teclado (`←`/`→`) mueven la paleta; `P`/`Escape` pausa/reanuda.
- Sonido: `ball-bounce.mp3` en rebotes (paredes y paleta) y `break-sound.mp3` al romper un bloque, reproducidos con `cloneNode().play()` para solapar, como el original.
- Explosiones: al romper un bloque se anima su explosión con `EXPLOSION_FRAMES[color]` (4 frames, 150 ms) dibujada en el canvas.
- `ArkanoidEngine` expone `start()`, `pause()`, `resume()`, `forceGameOver()`, `restart()` y `destroy()`. `restart()` se **inventa** (el prototipo solo reiniciaba recargando la página): reinicia a nivel 1, 3 vidas y score 0.
- `components/games/arkanoid-game.tsx` (`"use client"`, `forwardRef<ArkanoidGameHandle, { onStateChange }>`), copia estructural de `components/games/asteroids-game.tsx`.
- `lib/games/registry.ts`: añadir `arkanoid: { component: ArkanoidGame }` (sin `secondaryLabel`: tiene vidas → corazones).
- Paso en Supabase vía MCP de Supabase: `update games set id = 'arkanoid', title = 'ARKANOID' where id = 'bloque-buster'`. Si el MCP no está conectado al llegar a este paso, el agente se detiene y pide al usuario que lo active antes de continuar.

**Out of scope (para specs futuras):**

- Nueva portada: `cover-bricks` se mantiene (ya dibuja muros de bloques); no se toca `app/globals.css`.
- Cambios en `components/player.tsx`: Arkanoid tiene vidas, la ranura "Vidas" con corazones ya funciona; el registro y el HUD existentes lo cubren sin editar `player.tsx`.
- Botones de "saltar al nivel" dibujados en el canvas durante la pausa y su handler de `click`: se eliminan (la pausa la controla el overlay de `player.tsx`).
- Overlays de `GAME OVER` / `¡Completaste el juego!` / `PAUSA` dentro del canvas: los sustituyen el overlay y el modal de `player.tsx`.
- Controles táctiles.
- Menú de selección de nivel o continuar desde un nivel concreto (más allá del avance secuencial 1→5).
- Redirección desde `/juegos/bloque-buster`.
- Power-ups, multi-bola u otros elementos que el prototipo no tiene.

## Modelo de datos

```ts
// lib/games/arkanoid/engine.ts
export const W = 800;
export const H = 600;

// "dead" no se usa en Arkanoid; se mantiene por contrato con player.tsx
export type ArkanoidPhase = "playing" | "dead" | "gameover" | "paused";

export interface ArkanoidState {
  score: number;
  lives: number;
  level: number; // 1..5
  phase: ArkanoidPhase;
}

export class ArkanoidEngine {
  constructor(
    canvas: HTMLCanvasElement,
    onStateChange: (state: ArkanoidState) => void,
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
// components/games/arkanoid-game.tsx
export interface ArkanoidGameHandle {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  restart: () => void;
}
```

```ts
// lib/games/registry.ts — entrada nueva
export const GAME_ENGINES: Record<string, GameEngineEntry> = {
  asteroids: { component: AsteroidsGame },
  tetris: { component: TetrisGame, secondaryLabel: "Líneas" },
  arkanoid: { component: ArkanoidGame }, // tiene vidas → corazones, sin secondaryLabel
};
```

```sql
-- Fila del catálogo (vía MCP de Supabase). Solo cambian id y title.
-- Sin cambios: short, long, category 'ARCADE', cover 'cover-bricks', color 'cyan',
-- best_seed 28450, plays_seed '12.4K'.
update games set id = 'arkanoid', title = 'ARKANOID' where id = 'bloque-buster';
```

Convenciones:

- Coordenadas del canvas: origen arriba-izquierda; velocidades en px/s (el prototipo integra con `dt` en segundos).
- `BLOCKS_ORIGIN_X = (800 - BLOCK_COLS * BLOCK_W) / 2`; `BLOCKS_ORIGIN_Y = 80`.
- La paleta `w = 81` aunque el sprite mida 162 px: `drawSprite` lo escala, como en el original.
- `phase = 'paused'` congela la simulación sin cancelar el frame (última imagen visible bajo el overlay), igual que asteroids/tetris.
- Assets servidos desde `public/`: la URL en runtime es `/games/arkanoid/spritesheet.png`, `/games/arkanoid/ball-bounce.mp3`, `/games/arkanoid/break-sound.mp3`.

## Plan de implementación

1. Copiar assets a `public/games/arkanoid/`: `spritesheet.png` (renombrado desde `spritesheet-breakout.png`), `ball-bounce.mp3`, `break-sound.mp3`. Verificar: los tres archivos existen y `npm run dev` sirve `/games/arkanoid/spritesheet.png` con 200.
2. Crear `lib/games/arkanoid/sprites.ts`: `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION` y la clase `Spritesheet` (carga la imagen en el constructor, flag `loaded`, métodos `drawSprite`/`drawFrame` que retornan temprano si no está cargada). Sin globales de módulo. Verificar: `npx tsc --noEmit` sin errores nuevos.
3. Crear `lib/games/arkanoid/levels.ts` con `LEVELS` portado de `levels.js` (5 niveles, `speed` + `blocks[]`). Verificar: `npx tsc --noEmit` sin errores nuevos.
4. Crear `lib/games/arkanoid/engine.ts` (parte 1): constantes, tipos `ArkanoidPhase`/`ArkanoidState`, y clase `ArkanoidEngine` con campos de instancia (`paddle`, `ball`, `blocks`, `explosions`, `lives`, `score`, `level`, `state`, `paused`, `sheet`, `rafId`, `keys`) y constructor que obtiene el contexto 2D (lanza si es null), instancia `Spritesheet` y carga el nivel 1 (`initPaddle`/`loadLevel(1)`). Verificar: `npx tsc --noEmit` sin errores nuevos.
5. `engine.ts` (parte 2): `update(dt)` portado — movimiento de paleta por teclado, movimiento de bola, rebotes de pared/paleta (con sonido), colisión de bloques (+10, explosión, sonido), avance de nivel al limpiar, `win` → `state = 'gameover'`, pérdida de vida al caer la bola, y filtrado de explosiones por `EXPLOSION_DURATION`. Verificar: `npx tsc --noEmit` sin errores nuevos.
6. `engine.ts` (parte 3): `draw()` — fondo negro, bloques vivos, explosiones (frame según `elapsed`), paleta y bola vía `Spritesheet`. Sin HUD ni overlays dentro del canvas. Verificar: `npx tsc --noEmit` sin errores nuevos.
7. `engine.ts` (parte 4): loop e input. `start()` idempotente; `keydown`/`keyup` en `window` y `mousemove` en el canvas, todos como arrow class fields (`preventDefault` en `←`/`→`); `P`/`Escape` alternan pausa. El loop hace `if (!paused) update(dt)`, luego siempre `draw()` y `emitState()`. Añadir `pause`, `resume`, `forceGameOver` (`state = 'gameover'`), `restart` (nivel 1, 3 vidas, score 0) y `destroy` (cancela RAF, quita los tres listeners). `emitState` → `{ score, lives, level, phase }`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
8. Crear `components/games/arkanoid-game.tsx` (`"use client"`, `forwardRef<ArkanoidGameHandle, { onStateChange }>`), espejo de `asteroids-game.tsx`: callback en ref, estado local reenviado por efecto, montaje con deps `[]` y `destroy()` en el cleanup, `useImperativeHandle` con los cuatro métodos, `<canvas width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
9. Añadir `arkanoid: { component: ArkanoidGame }` a `GAME_ENGINES` en `lib/games/registry.ts` (sin `secondaryLabel`). Verificar: `npx tsc --noEmit` sin errores.
10. Supabase vía MCP de Supabase: el agente ejecuta el SQL con las herramientas del MCP. **Precondición:** si el MCP de Supabase no está conectado/disponible al llegar aquí, el agente **se detiene y pide al usuario que lo active**, sin continuar ni caer a un paso manual. Con el MCP conectado: comprobar que `select count(*) from scores where game_id = 'bloque-buster'` devuelve 0 (la FK `scores.game_id` no tiene `on update cascade`); ejecutar el `update` del Modelo de datos. Verificar: `select id, title, cover from games where id = 'arkanoid'` devuelve `arkanoid | ARKANOID | cover-bricks`.
11. Gate: `npx tsc --noEmit`, `npm run lint` y `npm run build` sin errores.

## Criterios de aceptación

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/juegos` muestra la card "ARKANOID" con `cover-bricks` y ya no muestra "BLOQUE BUSTER".
- [ ] `/juegos/arkanoid` carga mostrando "Mejor global" y "Partidas".
- [ ] `/juegos/arkanoid/jugar` renderiza el canvas con paleta, bola y muro de bloques (spritesheet), no el `.game-arena` simulado.
- [ ] El ratón sobre el canvas mueve la paleta, y `←`/`→` también.
- [ ] Romper un bloque suma exactamente 10 puntos al HUD real y lanza su animación de explosión.
- [ ] El HUD muestra "Vidas" con corazones y refleja puntuación, vidas y nivel reales del motor.
- [ ] Al caer la bola bajo el canvas se pierde una vida; con 0 vidas se abre el modal de fin de partida sin pulsar FIN.
- [ ] Limpiar todos los bloques avanza al siguiente nivel; limpiar el nivel 5 abre el modal con el score final.
- [ ] Suenan `ball-bounce` en los rebotes y `break-sound` al romper un bloque.
- [ ] `←`/`→` no hacen scroll de la página mientras se juega.
- [ ] PAUSA congela el juego y REANUDAR continúa sin perder estado; `P`/`Escape` hacen lo mismo y el overlay "EN PAUSA" aparece/desaparece.
- [ ] FIN abre el modal con la puntuación real.
- [ ] JUGAR DE NUEVO empieza en nivel 1, 3 vidas y score 0.
- [ ] GUARDAR PUNTUACIÓN inserta una fila con `game_id = 'arkanoid'` visible en `/juegos/arkanoid` y `/salon?juego=arkanoid`; si falla, el modal muestra el error y permite reintentar.
- [ ] `/juegos/asteroids/jugar` y `/juegos/tetris/jugar` siguen funcionando igual.
- [ ] Un juego sin motor (p. ej. `/juegos/serpentina/jugar`) sigue mostrando el `.game-arena` simulado y el toast sin red.
- [ ] SALIR y volver a entrar no duplica input (teclado ni ratón) ni deja errores en consola (incluido Strict Mode en `npm run dev`).
- [ ] A 400px de ancho el canvas se escala dentro de `.crt-screen` sin scroll horizontal, y el ratón sigue moviendo la paleta correctamente (coordenadas escaladas).

## Decisiones

- **Sí:** renombrar `bloque-buster` → `arkanoid` en Supabase. Mismo precedente que `rocas` → `asteroids` (SPEC 05) y `caida` → `tetris` (SPEC 07); evita dos juegos de breakout.
- **No:** fila nueva `arkanoid` junto a `bloque-buster`. Duplicaría el juego en la Biblioteca.
- **Sí:** solo cambian `id` y `title`; short, long, category, cover y color se mantienen. El texto de `bloque-buster` ya describe un breakout.
- **Sí:** mantener `cover-bricks`. Ya dibuja muros de bloques; no se toca `app/globals.css`.
- **Sí:** `win` (nivel 5 limpio) mapea a `phase = 'gameover'`. Respeta el contrato del motor (`playing|dead|gameover|paused`) y reutiliza el modal de fin de partida sin tocar `player.tsx`.
- **No:** añadir una `phase = 'win'` propia. Rompería el contrato del motor y obligaría a editar `player.tsx` y el modal.
- **No:** bucle infinito tras el nivel 5. Divergiría del prototipo, que termina en victoria.
- **Sí:** conservar ratón **y** teclado para la paleta. El original usa ambos; el ratón es el control natural de Arkanoid.
- **Sí:** eliminar los botones de "saltar al nivel" en pausa y su handler de `click`. La pausa la controla el overlay de `player.tsx`; el HUD/overlays dentro del canvas se quitan por el contrato.
- **Sí:** portar spritesheet **y** los dos sonidos a `public/games/arkanoid/`. Elección del usuario; da fidelidad visual y sonora frente a los precedentes silenciosos.
- **Sí:** `Spritesheet` como clase instanciada por el motor, sin globales de módulo. El contrato prohíbe estado mutable a nivel de módulo; el prototipo usaba `ssImg`/`ssLoaded` globales.
- **Sí:** inventar `restart()`. El prototipo solo reiniciaba recargando; "JUGAR DE NUEVO" necesita un reinicio real (nivel 1, 3 vidas, score 0).
- **Sí:** persistencia real vía `saveScore` (todo juego con motor guarda desde SPEC 07). Arkanoid tiene score real.
- **No:** editar `components/player.tsx`. Arkanoid tiene vidas; la ranura de corazones ya existe y el registro ya resuelve el render.
- **No:** controles táctiles. El original no los tiene; merecen su propia spec.

## Riesgos

| Riesgo                                                                                                    | Mitigación                                                                                                        |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| El `update` de `games.id` falla si hay filas en `scores` con `game_id = 'bloque-buster'` (FK sin cascade) | El paso 10 comprueba el `count` antes; si no es 0, borrar o migrar esas filas primero.                            |
| Política de autoplay del navegador: los MP3 no suenan hasta la primera interacción del usuario            | Aceptable; el juego arranca tras navegación y teclas/ratón. Sin bloqueo del gameplay.                             |
| `cloneNode().play()` crea muchos objetos `Audio` en ráfagas de rebotes                                    | Aceptado como en el prototipo; el navegador libera los clones al terminar. Optimizar (pool) queda fuera de scope. |
| La carga async del spritesheet deja el canvas negro los primeros frames                                   | `Spritesheet.drawSprite`/`drawFrame` retornan temprano hasta `loaded`; efecto breve e imperceptible.              |
| Ratón sobre el canvas escalado por CSS descoloca la paleta                                                | Usar `getBoundingClientRect()` + factor de escala, como el prototipo. Verificado en el criterio de 400px.         |
| `/juegos/bloque-buster` queda en 404 tras el rename                                                       | Aceptado; sin redirección (fuera de scope), igual que `/juegos/rocas` y `/juegos/caida`.                          |
| `app/page.tsx` muestra solo los 6 primeros juegos y `getGames()` no ordena                                | Riesgo preexistente; arkanoid puede no salir en la home. No se corrige aquí.                                      |

## Lo que **no** está en esta spec

- Nueva portada para arkanoid (`cover-bricks` se mantiene).
- Cambios en `components/player.tsx`.
- Selección/salto de nivel manual dentro del juego.
- Controles táctiles.
- Redirección desde `/juegos/bloque-buster`.
- Power-ups, multi-bola u otros añadidos ausentes en el prototipo.
- Motores reales para el resto de juegos simulados.

Cada uno, si llega, va en su propia spec.
