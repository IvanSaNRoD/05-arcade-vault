# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: online platform to play games and compete for the highest score. UI in Spanish (routes, copy).

Playable games: Asteroids, Tetris, Arkanoid, Snake (ported from vanilla prototypes in `references/resources/started-games/`) and Frogger (SPEC 12, engine from scratch). Catalog source of truth: `references/implemented-games.md`. UI was built from the JSX/HTML templates in `references/resources/templates/`.

## Workflow (Spec Driven Design)

Write a spec before implementing features. Specs live in `specs/NN-slug.md` (01–14; state in each file's `Estado`/`Status` header); out-of-scope issues go to `specs/BACKLOG.md`; manual verification notes in `docs/verificacion/`. Agent drafts live in `specs/game-jam/`, `specs/skins/`, `specs/mobile/`, `specs/performance/`, `specs/security/`.

### Skills

- `/spec` — design a spec. `/spec-impl` — implement it (auto-creates branch `spec-NN-slug`, see `specs/.spec-config.yml`). From [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills), installed in `.agents/skills/` and symlinked into `.claude/skills/` (`skills-lock.json`).
- `/frontend-design` — from `anthropics/skills`. Always use it to design UI.
- `/spec-game <name>` — `/spec` specialized for a new game + leaderboard (follows `.claude/skills/spec-game/porting-guide.md`). Use before porting any game.
- `/spec-impl-game <NN-slug>` — `/spec-impl` flow, then `skin-designer` → `mobile-porter` on the new game.
- `/performance-game <id> [re-auditar]` — `game-performance-booster` → `game-performance-implementation`, sequential.
- `/security-audit [db|app|todo] [re-auditar]` — runs `security-auditor`; audit only, fixes via `/spec-impl`.

Definitions: `.claude/skills/<name>/SKILL.md`.

### Subagents

Definitions in `.claude/agents/<name>.md` (read for details); persistent history in `.claude/agent-memory/<name>/MEMORY.md`. Draft-writing agents never touch code.

- `game-planner` — picks the next game to add (before `/spec-game`).
- `game-jam` — writes 3 draft spec variants (A clásica / B progresión / C twist) for a game in `specs/game-jam/<game-id>/`.
- `skin-designer` — audits games for 3 skins (`clasico`/`neon`/`retro`, dark-bg contrast); drafts `specs/skins/<id>-skins.md`.
- `mobile-porter` — audits games vs SPEC 11 and routes at 375/768 px; drafts `specs/mobile/`.
- `game-performance-booster` — static perf audit of a game vs SPEC 13; drafts `specs/performance/<id>-performance.md`.
- `game-performance-implementation` — implements the pending perf spec on branch `perf-<id>`, runs eslint + tsc, never commits.
- `security-auditor` — audits Supabase (MCP, read-only) + app (auth, secrets, headers/XSS, `npm audit`) vs SPEC 15/16 baseline; writes report + draft spec in `specs/security/` (ledger `STATUS.md`).

`specs/performance/STATUS.md` is the shared ledger of both perf agents (`generado` → `en-curso` → `implementado` | `bloqueado` · `cumple`).

**Auto-chain rule:** whenever a `game-performance-booster` run finishes (any launch method), read `specs/performance/STATUS.md`; if the game's last row is `generado`, immediately launch `game-performance-implementation` with that id (sequentially, no confirmation question). Any other state → just report it.

## Architecture

Routes (`app/`): `/` home, `/juegos` library, `/juegos/[id]` detail + leaderboard, `/juegos/[id]/jugar` player, `/salon` hall of fame, `/acerca-de` about + contact, `/auth` (visual only, no real auth yet).

Games:

- Engine per game in `lib/games/<id>/engine.ts` (+ optional `sprites.ts`, `levels.ts`, `skins.ts`): plain TS class drawing on canvas, no React.
- React bridge in `components/games/<id>-game.tsx`: `forwardRef` exposing `GameEngineHandle` (`pause/resume/forceGameOver/restart`) and reporting `GameEngineState` via `onStateChange`.
- Register in `GAME_ENGINES` (`lib/games/registry.ts`); `components/player.tsx` renders HUD/overlays from it. `secondaryLabel` replaces lives (e.g. Tetris "Líneas", Snake "Longitud"). `touchControls` (`GamepadLayout`) maps the mobile gamepad (`components/touch-controls.tsx`, SPEC 10/11).
- Skins: shared system in `lib/games/skins.ts` (`clasico` default / `neon` / `retro`); per-game palettes in `lib/games/<id>/skins.ts` (Tetris, Asteroids).
- Game metadata comes from Supabase `games` table — a new game also needs its row there and an entry in `references/implemented-games.md`. Static assets in `public/games/<id>/`.

Data (Supabase, tables `games` + `scores`, view `game_stats`):

- `lib/supabase/static.ts` — cookieless client for public reads (required in `generateStaticParams`/build time). `server.ts` (cookies), `client.ts` (browser), `proxy.ts` + root `proxy.ts` (session refresh; Next 16 renamed middleware → proxy).
- `lib/games.ts` — `getGames/getGame`; `best`/`plays` from view `game_stats` (MAX/COUNT of scores, SPEC 14), falling back to `best_seed`/`plays_seed`. Types in `lib/games-types.ts`; `lib/games-fallback.ts` = local catalog when Supabase is down (playable, no score save). `lib/home.ts` — home data.
- `lib/scores.ts` — `getTopScores` (server). `lib/scores-client.ts` — `saveScore` (client insert).
- Pages with data use ISR: `export const revalidate = 60`.
- Supabase MCP configured in `.mcp.json` — **dev project only**. Production lives in a separate org with no MCP/Claude access; prod SQL is in `supabase/prod/` and applied by hand (runbook: `docs/despliegue/supabase-produccion.md`). Schema changes: apply in dev via MCP, then add `supabase/prod/NN-slug.sql`.

Contact: server action `lib/actions/contact.ts` sends email via Resend.

Env vars (`.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `CONTACT_EMAIL`.

## Tooling

- Commands: `npm run dev | build | lint`. No test suite.
- Hook (`.claude/settings.json`): after Write/Edit, runs Prettier on `.tsx/.jsx/.md` and `eslint --fix` on `.tsx/.jsx`.
- CI: `.github/workflows/claude-review.yml` runs Claude code review on PRs (secret `ANTHROPIC_API_KEY`).
- Known issue: `npm run lint` fails on pre-existing errors in `app/page.tsx` (see `specs/BACKLOG.md` #2).

## Stack notes

- Next.js 16.3.5 (App Router, `app/`), React 19.2 — check `node_modules/next/dist/docs/` (`01-app/`) before using Next APIs, per `AGENTS.md`.
- Route prop types are global generated helpers (e.g. `LayoutProps<"/">`, `PageProps<"/...">`), from `.next/types` / `.next/dev/types` — run `dev` or `build` to refresh them after adding routes.
- Tailwind CSS v4, CSS-first config: no `tailwind.config.*`; theme tokens live in `app/globals.css` under `@theme inline`. Loaded via `@tailwindcss/postcss`.
- `@supabase/ssr` + `@supabase/supabase-js`, `resend`.
- Import alias `@/*` → repo root.
