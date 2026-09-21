# Arcade Vault porting guide

Reference for the `/spec-game` skill. It describes the contract a new game must satisfy to plug into this platform, as established by `specs/05-adaptacion-asteroids-nextjs.md` and `specs/06-leaderboard-y-tabla-de-juegos.md`.

**This is not text to copy verbatim into a spec.** It is the shape the emitted spec must respect. The living reference implementation is `asteroids`: when this guide and the code disagree, the code wins — read it and say so.

---

## 1. Engine contract — `lib/games/<slug>/engine.ts`

Plain TypeScript. No React, no Next, no imports from the app. This is what makes the engine testable and portable.

```ts
export const W = 800;
export const H = 600;

export type <Game>Phase = "playing" | "dead" | "gameover" | "paused";

export interface <Game>State {
  score: number;
  lives: number;
  level: number;
  phase: <Game>Phase;
}

export class <Game>Engine {
  constructor(canvas: HTMLCanvasElement, onStateChange: (state: <Game>State) => void);
  start(): void;
  pause(): void;
  resume(): void;
  forceGameOver(): void;
  restart(): void;
  destroy(): void;
}
```

The four state field names are fixed. `components/player.tsx` renders them directly as Puntuación / Vidas / Nivel, and `phase` drives the pause overlay and the game-over modal. A game without lives maps its secondary counter onto `lives` (see the HUD question in the skill), it does not rename the field.

Rules inherited from `lib/games/asteroids/engine.ts`, which is the one to read before writing a new one:

- The constructor gets the 2D context, throws if it is null, and fully initializes the game. `start()` only begins the loop.
- `start()` is idempotent — it returns early if the RAF id is already set — and registers `keydown`/`keyup` on `window`.
- Keyboard handlers are **arrow-function class fields**, so `destroy()` can remove the same references it added.
- The handlers call `preventDefault()` on the keys the game consumes that would otherwise scroll the page (arrows, space).
- The loop clamps delta time (`Math.min(dt, 0.05)`) so a backgrounded tab does not teleport entities.
- The loop runs `if (!this.paused) update(dt)`, then always `draw()`, then `emitState()`. Pausing freezes the simulation without cancelling the frame, which keeps the last frame visible under the overlay.
- `emitState()` fires every frame; React dedupes. `phase` is `"paused"` when the pause flag is set, otherwise the internal state.
- **No HUD inside the canvas.** The React HUD owns score, lives and level. A game-over overlay drawn in-canvas is fine.
- No module-level mutable state and no `document.getElementById`. Everything the engine touches arrives through the constructor.

When porting a vanilla prototype, the work is exactly this: turn the file's top-level `let score, lives, …` into instance fields, turn its global listeners into removable class fields, and hand the canvas in instead of querying for it. Keep the original constants and their values.

## 2. Client component — `components/games/<slug>-game.tsx`

Structural copy of `components/games/asteroids-game.tsx` (~75 lines). Read it and mirror it.

- `"use client"`.
- `export interface <Game>GameHandle { pause(): void; resume(): void; forceGameOver(): void; restart(): void }`.
- `forwardRef<Handle, { onStateChange: (s: <Game>State) => void }>`.
- The parent callback is kept in a ref updated by its own effect, so a new callback identity never remounts the engine.
- Engine state lands in local `useState`; a separate effect forwards it to the parent. Forwarding directly from the RAF callback would set parent state during render.
- The mount effect has `[]` deps and cleans up with `engine.destroy()` plus nulling the ref, which makes it safe under React Strict Mode's double invocation in development.
- `useImperativeHandle` forwards the four methods through the engine ref.
- Markup: `<canvas width={W} height={H} style={{ width: "100%", height: "100%", display: "block" }} />` — fixed internal resolution, CSS scaling.

## 3. Player registry — `components/player.tsx`

Today the player branches on a single boolean, `const isAsteroids = game.id === "asteroids"`, and six places hang off it: the simulated `setInterval` guard, `restart`, `handleSaveScore`, the PAUSA button, the FIN button, and the JSX that chooses between the canvas and the simulated `.game-arena`.

That does not scale past one real game. The first spec that adds a second engine replaces it with a registry:

```ts
// lib/games/registry.ts
export interface GameEngineHandle {
  pause(): void;
  resume(): void;
  forceGameOver(): void;
  restart(): void;
}

export const GAME_ENGINES: Record<string, GameComponent> = {
  asteroids: AsteroidsGame,
  // <slug>: <Game>Game,
};
```

`const hasEngine = game.id in GAME_ENGINES` then replaces `isAsteroids` at all six sites, `engineRef` is typed `GameEngineHandle`, and the JSX renders `GAME_ENGINES[game.id]`. Games with no entry keep the simulated arena, unchanged.

Once the registry exists, adding a game is one entry. The session-context grep in `SKILL.md` tells you which case you are in.

## 4. Cover art — `app/globals.css`

Add `.cover-<slug>` inside `@layer components`, next to the existing covers. Follow `.cover-rocas`: a base class with a gradient background, an `::after` with layered `radial-gradient`/`linear-gradient` shapes, and an optional `::before` holding a single glyph.

The class is applied alongside `.cover-bg` (absolute, inset 0) by `components/game-card.tsx`, `components/mini-card.tsx` and the game detail page. It must read at three aspect ratios: 4/3 in the library card, 16/10 in the detail hero, 1/1 in the home mini-card.

Use only the theme tokens (`var(--cyan)`, `var(--magenta)`, `var(--yellow)`, `var(--green)`, `var(--ink)`) plus flat hex values. No images.

## 5. Catalog row — Supabase, applied manually

The catalog lives in the `games` table, not in the repo. The spec carries the statement; nobody runs Supabase tooling from the skill.

```sql
insert into games (id, title, short, long, category, cover, color, best_seed, plays_seed)
values ('<slug>', '<TITLE>', '<short>', '<long>', '<CATEGORY>', 'cover-<slug>', '<color>', <n>, '<n>');
```

`category` is one of `ARCADE` / `PUZZLE` / `SHOOTER` / `VERSUS`; `color` one of `cyan` / `magenta` / `yellow` / `green`. `best_seed` and `plays_seed` are the placeholder values shown until the game has real rows in `scores`; once it does, `lib/games.ts` computes `best` and `plays` live. The table DDL is quoted in `specs/06-leaderboard-y-tabla-de-juegos.md`.

## 6. What does not change

All of this is data-driven off `getGames()` / `getGame(id)` and needs no edit for a new game:

`app/juegos/page.tsx`, `app/juegos/[id]/page.tsx`, `app/juegos/[id]/jugar/page.tsx`, `app/salon/page.tsx`, `components/library.tsx`, `components/game-card.tsx`, `components/mini-card.tsx`, `components/leaderboard.tsx`, `components/hall-of-fame.tsx`, `lib/games.ts`, `lib/scores.ts`, `lib/scores-client.ts`, `lib/supabase/*`.

`generateStaticParams` picks the new id up from the table, `revalidate = 60` keeps `best`/`plays` fresh, and `saveScore(gameId, name, score)` is already generic.

Two things to flag as risks rather than fix: `app/page.tsx` slices the home rail to the first six games, and `getGames()` issues no `.order()`, so row order is unspecified. A ninth game may simply not appear on the home page.

## 7. Verification

The repo has no automated tests — `package.json` only has `dev`, `build`, `start`, `lint`. The gate every spec uses, in order:

```
npx tsc --noEmit
npm run lint
npm run build
```

Then a boolean manual checklist, which the spec's acceptance criteria should mirror:

- `/juegos` lists the new game with its cover.
- `/juegos/<slug>` loads, showing "Mejor global" and "Partidas".
- `/juegos/<slug>/jugar` renders the canvas instead of the simulated arena.
- The controls respond and the HUD tracks the engine's real score / lives / level.
- PAUSA freezes and REANUDAR resumes without losing state; FIN opens the modal with the real score.
- Losing in-game opens the same modal without pressing FIN.
- JUGAR DE NUEVO starts a fresh run.
- GUARDAR PUNTUACIÓN inserts a row visible in `/juegos/<slug>` and `/salon?juego=<slug>`; a failure shows an error and allows a retry.
- SALIR (or any navigation away) stops the RAF loop and removes the key listeners — no console errors, no double input after remounting.
- At 400px wide the canvas scales inside `.crt-screen` with no horizontal scroll.

## 8. Prototype fact sheet

Measured from `references/resources/started-games/`. Confirm against the files before relying on a row; prototypes can change.

| Prototype      | Canvas                              | Lives                 | Input                  | Restart                 | Assets                 | Traps                                                                                                                                                                     |
| -------------- | ----------------------------------- | --------------------- | ---------------------- | ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `02-asteroids` | 800×600                             | 3                     | keyboard               | Space at gameover       | none                   | already ported — this is the reference implementation                                                                                                                     |
| `03-tetris`    | 300×600 plus a 120×120 next-preview | none — counts `lines` | keyboard               | DOM button              | none                   | HUD lives in the DOM sidebar; reads CSS variables at runtime via `getComputedStyle`; delta time in milliseconds against a drop accumulator                                |
| `04-arkanoid`  | 800×600                             | 3                     | mouse **and** keyboard | none — page reload only | PNG spritesheet, 2 MP3 | `levels.js` and `assets/spritesheet.js` load before `game.js` and it matters; async spritesheet load gates boot; HUD and level-select buttons are drawn inside the canvas |

What all three share, and what a port therefore always has to undo: a single canvas grabbed with `document.getElementById` at module top, all game state in module-level `let` globals, keyboard listeners registered on `window`/`document` and never removed, an `update(dt)` / `draw()` split inside a `requestAnimationFrame` loop, a string state machine for the phase, and an `init()` call at the bottom of the file.
