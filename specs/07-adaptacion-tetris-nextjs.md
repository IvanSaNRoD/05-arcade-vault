# SPEC 07 — Adaptación del juego Tetris a Next.js

> **Status:** Aprobada
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-23
> **Objective:** Portar el prototipo de Tetris (`references/resources/started-games/03-tetris/game.js`) a un motor TypeScript + Client Component que sustituye el juego simulado `caida` (renombrado a `tetris`), con puntuaciones reales en Supabase, introduciendo un registro de motores en `components/player.tsx`.

## Por qué existe esta spec

`components/player.tsx` solo sabe de un juego real (`const isAsteroids = game.id === "asteroids"`, seis puntos de uso). Añadir un segundo motor con otro `if` no escala, así que esta spec introduce `lib/games/registry.ts`. El catálogo ya tiene `caida` (CAÍDA, `cover-tetro`), placeholder temático de Tetris con gameplay simulado; igual que `rocas` → `asteroids` en SPEC 05, se renombra en vez de duplicar. Tetris no tiene vidas: cuenta líneas, lo que obliga a que el HUD admita una etiqueta por juego.

## Scope

**In:**

- `lib/games/registry.ts`: `GameEngineHandle`, `GameEngineState`, `GameEngineEntry` y `GAME_ENGINES` (`asteroids`, `tetris`), cada entrada con `component` y `secondaryLabel` opcional.
- `components/player.tsx`: `isAsteroids` → `hasEngine = game.id in GAME_ENGINES` en los seis puntos; `engineRef` tipado `GameEngineHandle`; render de `GAME_ENGINES[game.id].component`; la ranura Vidas muestra `secondaryLabel` + número cuando la entrada lo define.
- `handleSaveScore` llama a `saveScore` para cualquier juego con motor (asteroids y tetris).
- Motor `lib/games/tetris/engine.ts` (`TetrisEngine`), portado de `game.js` con constantes y valores originales: `COLS = 10`, `ROWS = 20`, `BLOCK = 30`, `COLORS` y `PIECES` de 8 entradas (incluida la "N" tuerca), `LINE_SCORES = [0, 100, 300, 500, 800]`, wall kicks `[0, -1, 1, -2, 2]`, pieza fantasma.
- Controles: `←`/`→` mover, `↑`/`X` rotar, `↓` soft drop, `Espacio` hard drop, `P` pausa/reanuda.
- `components/games/tetris-game.tsx`, copia estructural de `components/games/asteroids-game.tsx`.
- Paso manual en Supabase: `update games set id = 'tetris', title = 'TETRIS' where id = 'caida'`.

**Out of scope (para specs futuras):**

- Tema claro/oscuro y `localStorage` (`tetris-theme`) del prototipo.
- Overlay DOM de PAUSA/GAME OVER y botón "Reiniciar" del prototipo (los sustituyen el overlay y el modal de `player.tsx`).
- Controles táctiles.
- Hold piece, 7-bag, DAS/ARR configurables, T-spins (el prototipo no los tiene).
- Nueva portada (`cover-tetro` se mantiene).
- Redirección desde `/juegos/caida`.
- Sonido.

## Modelo de datos

```ts
// lib/games/tetris/engine.ts
export const W = 800;
export const H = 600;

// "dead" no se usa en Tetris; se mantiene por contrato con player.tsx
export type TetrisPhase = "playing" | "dead" | "gameover" | "paused";

export interface TetrisState {
  score: number;
  lives: number; // = líneas completadas (ver Decisiones)
  level: number; // floor(lines / 10) + 1
  phase: TetrisPhase;
}

export class TetrisEngine {
  constructor(
    canvas: HTMLCanvasElement,
    onStateChange: (state: TetrisState) => void,
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
// components/games/tetris-game.tsx
export interface TetrisGameHandle {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  restart: () => void;
}
```

```ts
// lib/games/registry.ts
export interface GameEngineHandle {
  pause(): void;
  resume(): void;
  forceGameOver(): void;
  restart(): void;
}

export interface GameEngineState {
  score: number;
  lives: number;
  level: number;
  phase: "playing" | "dead" | "gameover" | "paused";
}

export interface GameEngineEntry {
  component: ForwardRefExoticComponent<
    {
      onStateChange: (s: GameEngineState) => void;
    } & RefAttributes<GameEngineHandle>
  >;
  secondaryLabel?: string; // sustituye "Vidas" + corazones por etiqueta + número
}

export const GAME_ENGINES: Record<string, GameEngineEntry> = {
  asteroids: { component: AsteroidsGame },
  tetris: { component: TetrisGame, secondaryLabel: "Líneas" },
};
```

```sql
-- Fila del catálogo (manual). Solo cambian id y title.
-- Sin cambios: short, long, category 'PUZZLE', cover 'cover-tetro', color 'magenta',
-- best_seed 184220, plays_seed '31.8K'.
update games set id = 'tetris', title = 'TETRIS' where id = 'caida';
```

Convenciones:

- Origen del tablero: `BOARD_X = 250` (`(W - COLS * BLOCK) / 2`), `BOARD_Y = 0`.
- Preview "SIGUIENTE" (120×120, bloques de 30) a la derecha del tablero, dentro del mismo canvas.
- `dt` en ms, limitado a 50 ms (`Math.min(dt, 50)`), acumulado contra `dropInterval = max(100, 1000 - (level - 1) * 90)`.
- Colores de fondo y rejilla fijos al tema oscuro del prototipo (`#1a1a25`, `#22222e`); sin `getComputedStyle`.
- Puntuación: líneas `LINE_SCORES[n] * level`, hard drop `+2` por celda, soft drop `+1` por fila.

## Plan de implementación

1. Crear `lib/games/registry.ts` con `GameEngineHandle`, `GameEngineState`, `GameEngineEntry` y `GAME_ENGINES` solo con `asteroids`. En `components/player.tsx`, sustituir `isAsteroids` por `hasEngine` en los seis puntos, tipar `engineRef` como `GameEngineHandle`, renderizar `GAME_ENGINES[game.id].component` y usar `saveScore` en `handleSaveScore` cuando `hasEngine`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores; `/juegos/asteroids/jugar` se comporta igual que antes.
2. En `components/player.tsx`, ranura Vidas: si la entrada del registro tiene `secondaryLabel`, mostrar esa etiqueta y `lives` como número; si no, "Vidas" y corazones como hoy. Verificar: `npx tsc --noEmit`; asteroids sigue mostrando corazones.
3. Crear `lib/games/tetris/engine.ts` con constantes (`W`, `H`, `COLS`, `ROWS`, `BLOCK`, `BOARD_X`, `COLORS`, `PIECES`, `LINE_SCORES`), tipos `TetrisPhase`/`TetrisState` y funciones puras portadas (`createBoard`, `randomPiece`, `collide`, `rotateCW`). Verificar: `npx tsc --noEmit`.
4. En el mismo archivo, clase `TetrisEngine`: los globals del prototipo pasan a campos de instancia (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `lastTime`, `dropAccum`, `dropInterval`, `rafId`). El constructor obtiene el contexto 2D (lanza si es null) e inicializa como `init()`. Métodos `tryRotate`, `merge`, `clearLines`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn` (colisión al aparecer → `gameOver = true`). Verificar: `npx tsc --noEmit`.
5. `draw()`: fondo, rejilla, tablero, fantasma (alpha 0.2), pieza actual y preview SIGUIENTE, en el canvas 800×600 con offset `BOARD_X`. Sin score/líneas/nivel dentro del canvas. Verificar: `npx tsc --noEmit`.
6. Loop e input: `start()` idempotente, registra `keydown` en `window` (handler como arrow class field, `preventDefault` en flechas y Espacio). El loop hace `if (!paused && !gameOver) update(dt)`, luego siempre `draw()` y `emitState()`. `P` alterna `pause()`/`resume()`. Añadir `pause`, `resume`, `forceGameOver`, `restart` (reinicia estado sin re-registrar listeners) y `destroy` (cancela RAF, quita el listener). `emitState` → `{ score, lives: lines, level, phase }`. Verificar: `npx tsc --noEmit`.
7. Crear `components/games/tetris-game.tsx` (`"use client"`, `forwardRef<TetrisGameHandle, { onStateChange }>`), espejo de `asteroids-game.tsx`: callback en ref, estado local reenviado por efecto, montaje con deps `[]` y `destroy()` en el cleanup, `useImperativeHandle` con los cuatro métodos, `<canvas width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`. Verificar: `npx tsc --noEmit` y `npm run lint`.
8. Añadir `tetris: { component: TetrisGame, secondaryLabel: "Líneas" }` a `GAME_ENGINES`. Verificar: `npx tsc --noEmit`.
9. Manual en Supabase (SQL editor, fuera de las herramientas del agente): comprobar que `select count(*) from scores where game_id = 'caida'` devuelve 0 (la FK `scores.game_id` no tiene `on update cascade`); ejecutar el `update` del Modelo de datos. Verificar: `select id, title, cover from games where id = 'tetris'` devuelve `tetris | TETRIS | cover-tetro`.
10. Gate: `npx tsc --noEmit`, `npm run lint` y `npm run build` sin errores.

## Criterios de aceptación

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] `components/player.tsx` no contiene `isAsteroids`.
- [ ] `/juegos` muestra la card "TETRIS" con `cover-tetro` y ya no muestra "CAÍDA".
- [ ] `/juegos/tetris` carga mostrando "Mejor global" y "Partidas".
- [ ] `/juegos/tetris/jugar` renderiza el canvas con el tablero centrado y la preview SIGUIENTE, no el `.game-arena` simulado.
- [ ] `←`/`→` mueven, `↑` y `X` rotan (con wall kick junto a la pared), `↓` baja una fila y `Espacio` deja caer la pieza.
- [ ] Flechas y `Espacio` no hacen scroll de la página mientras se juega.
- [ ] El HUD muestra "Líneas" con número (no corazones) y refleja líneas, puntuación y nivel reales del motor.
- [ ] Limpiar 1/2/3/4 líneas en nivel 1 suma 100/300/500/800 puntos.
- [ ] Al llegar a 10 líneas el HUD pasa a Nivel 02 y la caída se acelera.
- [ ] PAUSA congela la pieza y REANUDAR continúa sin perder estado.
- [ ] `P` pausa y reanuda, y el overlay "EN PAUSA" aparece y desaparece igual que con el botón.
- [ ] FIN abre el modal con la puntuación real.
- [ ] Cuando una pieza nueva no cabe al aparecer, se abre el modal sin pulsar FIN.
- [ ] JUGAR DE NUEVO empieza con tablero vacío, puntuación 0, 0 líneas y nivel 01.
- [ ] GUARDAR PUNTUACIÓN inserta una fila con `game_id = 'tetris'` visible en `/juegos/tetris` y `/salon?juego=tetris`.
- [ ] Si `saveScore` falla, el modal muestra el error y permite reintentar.
- [ ] `/juegos/asteroids/jugar` sigue igual: corazones en Vidas, controles, pausa, fin y guardado.
- [ ] Un juego sin motor (p. ej. `/juegos/serpentina/jugar`) sigue mostrando el `.game-arena` simulado y el toast sin red.
- [ ] SALIR y volver a entrar no duplica input ni deja errores en consola (incluido Strict Mode en `npm run dev`).
- [ ] A 400px de ancho el canvas se escala dentro de `.crt-screen` sin scroll horizontal.

## Decisiones

- **Sí:** registro `lib/games/registry.ts` en vez de un segundo booleano. Con dos motores, `isAsteroids` en seis puntos deja de ser sostenible.
- **Sí:** renombrar `caida` → `tetris` en Supabase. Mismo precedente que `rocas` → `asteroids` (SPEC 05); evita dos juegos tipo Tetris.
- **No:** fila nueva `tetris` junto a `caida`. Duplicaría el juego en la Biblioteca.
- **Sí:** solo cambian `id` y `title`; short, long, category, color y seeds se mantienen. Los textos ya describen el juego ("cada 10 líneas").
- **Sí:** mantener `cover-tetro`. Ya dibuja tetrominós; no se toca `app/globals.css`.
- **Sí:** `lines` viaja en el campo `lives` y el registro aporta `secondaryLabel: "Líneas"`. Respeta el contrato del motor y evita pintar N corazones.
- **No:** emitir `lives = 0` y ocultar las líneas. Se perdería un dato central de Tetris.
- **No:** `lines` en `lives` sin etiqueta propia. El HUD pintaría un corazón por línea.
- **Sí:** canvas 800×600 con tablero centrado y preview dentro. Sin cambios de CSS; un solo canvas.
- **No:** override del `aspect-ratio` de `.crt-screen`. Toca CSS compartido y deja una pantalla muy alta en desktop.
- **Sí:** conservar la pieza "N" tuerca. Regla del porting: constantes y valores originales.
- **Sí:** conservar la tecla `P`. `player.tsx` ya deriva `paused` de `phase`; no requiere código extra.
- **Sí:** persistencia real vía `saveScore` para todo juego con motor. Tetris tiene score real.
- **No:** tema claro/oscuro del prototipo. La plataforma tiene su propio tema; se fijan los colores del tema oscuro.
- **No:** overlay de GAME OVER dentro del canvas. El modal de `player.tsx` cubre ese papel.
- **Sí:** `dt` en ms limitado a 50 ms. Mantiene el acumulador del original y cumple la regla anti-teletransporte del contrato.

## Riesgos

| Riesgo                                                                                            | Mitigación                                                                            |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| El `update` de `games.id` falla si hay filas en `scores` con `game_id = 'caida'` (FK sin cascade) | El paso 9 comprueba el `count` antes; si no es 0, borrar o migrar esas filas primero. |
| `/juegos/caida` queda en 404 tras el rename                                                       | Aceptado; sin redirección (fuera de scope), igual que `/juegos/rocas`.                |
| El autorepeat de teclado del SO varía por usuario (mover, soft drop)                              | Aceptado: mismo comportamiento que el prototipo.                                      |
| `player.tsx` arranca con `lives = 3` y se ve "3" un frame antes del primer `emitState`            | El motor emite en el primer frame; efecto imperceptible.                              |
| `app/page.tsx` muestra solo los 6 primeros juegos y `getGames()` no ordena                        | Riesgo preexistente; tetris puede no salir en la home. No se corrige aquí.            |

## Lo que **no** está en esta spec

- Tema claro/oscuro del prototipo.
- Controles táctiles.
- Hold, 7-bag, T-spins, DAS/ARR configurables.
- Nueva portada para tetris.
- Redirección desde `/juegos/caida`.
- Sonido.
- Motores reales para el resto de juegos simulados.

Cada uno, si llega, va en su propia spec.
