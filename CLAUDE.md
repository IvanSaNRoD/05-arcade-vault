# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: online platform to play games and compete for the highest score. Currently a fresh `create-next-app` scaffold (only `app/layout.tsx`, `app/page.tsx`, `app/globals.css`) — no domain code yet.

Workflow is Spec Driven Design via `/spec` and `/spec-impl` from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (install: `npx skills@latest add Klerith/fernando-skills`). Write a spec before implementing features.

## Skills
Always use /drontend-design to design UI.

## Stack notes

- Next.js 16.3.5 (App Router, `app/`), React 19.2 — check `node_modules/next/dist/docs/` (`01-app/`) before using Next APIs, per `AGENTS.md`.
- Route prop types are global generated helpers (e.g. `LayoutProps<"/">`, `PageProps<"/...">`), from `.next/types` / `.next/dev/types` — run `dev` or `build` to refresh them after adding routes.
- Tailwind CSS v4, CSS-first config: no `tailwind.config.*`; theme tokens live in `app/globals.css` under `@theme inline` (`--color-background`, `--color-foreground`, Geist font vars). Loaded via `@tailwindcss/postcss`.
- Import alias `@/*` → repo root.
