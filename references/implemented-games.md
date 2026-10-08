# Implemented Games

Source of truth for the **playable games** in Arcade Vault (games with a real TS
engine wired into the player). **Consult this file instead of querying the
Supabase `games` table** when you need the catalog of implemented games.

Keep it in sync with the `games` table: every new playable game added through
`/spec-game` → `/spec-impl` must also be appended here (the generated spec
includes a step for it).

> The `games` table also contains 4 simulated placeholder rows from the SPEC 06
> seed that are **not** playable yet and are out of scope for this file:
> `gloton`, `invasores`, `ranaria`, `duelo-pixel`.

## Catalog (playable)

| id          | title     | category | color   | cover          | best_seed | plays_seed | secondaryLabel     | spec    |
| ----------- | --------- | -------- | ------- | -------------- | --------- | ---------- | ------------------ | ------- |
| `asteroids` | ASTEROIDS | SHOOTER  | yellow  | `cover-rocas`  | 41200     | 15.6K      | — (lives / hearts) | SPEC 05 |
| `tetris`    | TETRIS    | PUZZLE   | magenta | `cover-tetro`  | 184220    | 31.8K      | Líneas             | SPEC 07 |
| `arkanoid`  | ARKANOID  | ARCADE   | cyan    | `cover-bricks` | 28450     | 12.4K      | — (lives / hearts) | SPEC 08 |
| `snake`     | SNAKE     | ARCADE   | green   | `cover-snake`  | 7820      | 9.1K       | Longitud           | SPEC 09 |

- `secondaryLabel` comes from `GAME_ENGINES` in `lib/games/registry.ts`; `—`
  means the game uses lives/hearts (no override).
- `best_seed` / `plays_seed` are the display fallbacks shown until real `scores`
  rows exist (live `best`/`plays` = `MAX`/`COUNT` of `scores`, see `lib/games.ts`).

## Per-game details

### asteroids — ASTEROIDS

- **Category:** SHOOTER · **color:** yellow · **cover:** `cover-rocas`
- **short:** Pulveriza asteroides en gravedad cero.
- **long:** Tu nave triangular flota en vacío absoluto. Dispara y rota para
  dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el
  horizonte.
- **Engine:** `lib/games/asteroids/engine.ts`
- **React bridge:** `components/games/asteroids-game.tsx`
- **Registry:** `asteroids: { component: AsteroidsGame }` (lives/hearts HUD)
- **Spec:** `specs/05-adaptacion-asteroids-nextjs.md` (renamed from seed id
  `rocas` / title `ROCAS`)

### tetris — TETRIS

- **Category:** PUZZLE · **color:** magenta · **cover:** `cover-tetro`
- **short:** Encaja las piezas antes de que el techo te aplaste.
- **long:** Piezas geométricas descienden desde la oscuridad. Rótalas,
  encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad
  cada 10 líneas.
- **Engine:** `lib/games/tetris/engine.ts`
- **React bridge:** `components/games/tetris-game.tsx`
- **Registry:** `tetris: { component: TetrisGame, secondaryLabel: "Líneas" }`
- **Spec:** `specs/07-adaptacion-tetris-nextjs.md` (renamed from seed id `caida`
  / title `CAÍDA`)

### arkanoid — ARKANOID

- **Category:** ARCADE · **color:** cyan · **cover:** `cover-bricks`
- **short:** Rebota la pelota y destruye muros de neón.
- **long:** Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar
  muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones
  imposibles. ¿Hasta dónde llegará tu racha?
- **Engine:** `lib/games/arkanoid/engine.ts` (+ `levels.ts`, `sprites.ts`)
- **React bridge:** `components/games/arkanoid-game.tsx`
- **Registry:** `arkanoid: { component: ArkanoidGame }` (lives/hearts HUD)
- **Spec:** `specs/08-adaptacion-arkanoid-nextjs.md` (renamed from seed id
  `bloque-buster` / title `BLOQUE BUSTER`)

### snake — SNAKE

- **Category:** ARCADE · **color:** green · **cover:** `cover-snake`
- **short:** Crece sin morder tu propia cola.
- **long:** Una serpiente de luz recorre la grilla buscando núcleos magenta.
  Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a
  sí misma.
- **Engine:** `lib/games/snake/engine.ts` (+ `sprites.ts`)
- **React bridge:** `components/games/snake-game.tsx`
- **Registry:** `snake: { component: SnakeGame, secondaryLabel: "Longitud" }`
- **Spec:** `specs/09-adaptacion-snake-nextjs.md` (renamed from seed id
  `serpentina` / title `SERPENTINA`)
