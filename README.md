## Arcade Vault

Plataforma para jugar online y competir por la mayor cantidad de puntos.

## Juegos

Motores en TypeScript + Canvas, registrados en `lib/games/registry.ts`:

- **Asteroids** (SPEC 05)
- **Tetris** (SPEC 07)
- **Arkanoid** (SPEC 08)

Puntuaciones reales en Supabase, con leaderboard por juego.

## Rutas

- `/` inicio
- `/juegos` catálogo, `/juegos/[id]` partida
- `/salon` salón de la fama / leaderboard
- `/acerca-de` about y contacto
- `/auth` autenticación

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase (`@supabase/ssr`), Resend (contacto).

## Desarrollo

```bash
cp .env.example .env.local   # completar variables
npm install
npm run dev
```

Otros: `npm run build`, `npm run lint`.

## Usa Spec Driven Design

Basado en `/spec` y `/spec-impl`. Las specs viven en `specs/` (backlog en `specs/BACKLOG.md`).

Buenas prácticas: https://github.com/Klerith/fernando-skills

```bash
npx skills@latest add Klerith/fernando-skills
```
