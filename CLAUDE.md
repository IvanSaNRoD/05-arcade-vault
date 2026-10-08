# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: online platform to play games and compete for the highest score. UI in Spanish (routes, copy).

Playable games: Asteroids, Tetris, Arkanoid, Snake — ported from vanilla prototypes in `references/resources/started-games/`. UI was built from the JSX/HTML templates in `references/resources/templates/`.

## Workflow (Spec Driven Design)

Write a spec before implementing features. Specs live in `specs/NN-slug.md` (01–09 done); out-of-scope issues go to `specs/BACKLOG.md`; manual verification notes in `docs/verificacion/`.

- `/spec` — design a spec. `/spec-impl` — implement it (auto-creates branch `spec-NN-slug`, see `specs/.spec-config.yml`). From [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills), installed in `.agents/skills/` and symlinked into `.claude/skills/` (`skills-lock.json`).
- `/spec-game <name>` — project skill (`.claude/skills/spec-game/`), `/spec` specialized for adding a new game + leaderboard. Follows `porting-guide.md`. Use it before porting any game.
- `/frontend-design` — always use it to design UI.

## Architecture

Routes (`app/`): `/` home, `/juegos` library, `/juegos/[id]` detail + leaderboard, `/juegos/[id]/jugar` player, `/salon` hall of fame, `/acerca-de` about + contact, `/auth` (visual only, no real auth yet).

Games:

- Engine per game in `lib/games/<id>/engine.ts` (+ `sprites.ts`, `levels.ts`): plain TS class drawing on canvas, no React.
- React bridge in `components/games/<id>-game.tsx`: `forwardRef` exposing `GameEngineHandle` (`pause/resume/forceGameOver/restart`) and reporting `GameEngineState` via `onStateChange`.
- Register in `GAME_ENGINES` (`lib/games/registry.ts`); `components/player.tsx` renders HUD/overlays from it. `secondaryLabel` replaces lives (e.g. Tetris "Líneas", Snake "Longitud").
- Game metadata comes from Supabase `games` table — a new game also needs its row there. Static assets in `public/games/<id>/`.

Data (Supabase, tables `games` + `scores`):

- `lib/supabase/static.ts` — cookieless client for public reads (required in `generateStaticParams`/build time). `server.ts` (cookies), `client.ts` (browser), `proxy.ts` + root `proxy.ts` (session refresh; Next 16 renamed middleware → proxy).
- `lib/games.ts` — `getGames/getGame`; `best`/`plays` = real MAX/COUNT of scores, falling back to `best_seed`/`plays_seed`. `lib/scores.ts` — `getTopScores` (server). `lib/scores-client.ts` — `saveScore` (client insert).
- Pages with data use ISR: `export const revalidate = 60`.
- Supabase MCP configured in `.mcp.json`.

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
