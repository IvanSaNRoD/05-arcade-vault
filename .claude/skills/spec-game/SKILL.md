---
name: spec-game
description: Designs a spec for adding a playable game with a real leaderboard to Arcade Vault, porting a vanilla prototype from references/resources/started-games/ or writing the engine from scratch. Use it before implementing any new game.
disable-model-invocation: true
argument-hint: "game name or prototype folder (e.g. tetris, 04-arkanoid)"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(grep:*)
---

# /spec-game — Guided spec designer for new Arcade Vault games

## Session context

Today's date (use this for the spec header, never guess it):
!`date +%F`

Specs that already exist:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist yet"`

Vanilla prototypes available to port:
!`ls references/resources/started-games/ 2>/dev/null || echo "No prototypes folder"`

Engines already ported (these ids are taken):
!`ls lib/games/ 2>/dev/null || echo "No engines yet"`

Does the multi-engine registry already exist in the player?
!`grep -n "isAsteroids\|GAME_ENGINES" components/player.tsx 2>/dev/null || echo "player.tsx not found"`

---

This skill is `/spec` specialized for one recurring job: adding a playable game with a real leaderboard to Arcade Vault. **You don't write code here.** You produce one spec file in `specs/`, ready for `/spec-impl`.

The game may already exist as a vanilla JS prototype in `references/resources/started-games/`, or it may not exist at all — both are supported.

## Philosophy

SPEC 05 (Asteroids engine port) and SPEC 06 (Supabase `games`/`scores` + real leaderboard) established the architecture for a real game exactly once. This skill exists so that architecture is applied deliberately instead of re-derived from scratch every time.

Two reference documents govern what you write, and you read both before writing anything:

- `.claude/skills/spec/SKILL.md` and `.claude/skills/spec/template.md` — the spec-driven **method** and the **document shape**. `/spec` is the authority there; this skill is its specialization, not a parallel format.
- `porting-guide.md` (sibling of this file) — the Arcade Vault **engine and integration contract**.

## Command flow

Follow the four phases in order. Never skip Phase 2 — the questions are the whole point.

Your replies must be in the same language as the initial prompt. The spec file itself must be in the language of the existing specs in `specs/` (Spanish, at the time of writing).

### Phase 1 — Read the references and locate the source

Mandatory reads, in this order, before asking anything:

1. `.claude/skills/spec/SKILL.md` and `.claude/skills/spec/template.md` — method, section order, valid header states, implementation-plan rules (each step commitable, split anything over 30–50 lines), acceptance-criteria anti-patterns.
2. `porting-guide.md` in this skill's directory — the engine contract, the client component shape, the player registry, the CSS cover pattern, the Supabase row, the verification gate, and a per-prototype fact sheet.
3. `specs/05-*.md` and `specs/06-*.md` — the two implemented precedents, and the conventions (language, wording, heading names) any new spec must match.
4. `CLAUDE.md` and `AGENTS.md` at the repo root.

Then resolve `$ARGUMENTS` against the prototypes listed in the session context, matching loosely (`tetris` → `03-tetris`, `arkanoid` → `04-arkanoid`).

**If there is a match — port mode.** Read the prototype's `index.html`, every `.js` file it loads (mind the load order), and its CSS if it has an external one. Section 8 of `porting-guide.md` already has a fact sheet for the known prototypes; use it to know what to look for, but confirm against the files — the sheet can go stale. Produce a short written summary of: canvas size(s), module-level globals, how score / lives / level (or their equivalents) are tracked, input devices, the game-over path, whether a restart path exists, and any assets.

**If there is no match — from-scratch mode.** Say so explicitly. The gameplay design itself becomes an extra unknown for Phase 2: rules, win/lose conditions, scoring table, controls, and difficulty progression all have to be decided by the user, not invented by you.

**If `$ARGUMENTS` is empty**, list the available prototypes and ask which game to spec, or whether it is a new one.

### Phase 2 — Clarify through questions

Ask in blocks of 3 to 5 questions using `AskUserQuestion`, with 2–4 concrete options each, your recommendation first and labeled. Wait for answers between blocks.

Questions that the prototype files can never answer on their own, and that you must always ask:

1. **Catalog metadata.** `id` slug (it becomes `/juegos/<id>` and the `scores.game_id` value), `title`, `short`, `long`, `category` (`ARCADE` | `PUZZLE` | `SHOOTER` | `VERSUS`), `color` (`cyan` | `magenta` | `yellow` | `green`), and the `best_seed` / `plays_seed` placeholder values shown until real plays exist. The `cover` CSS class is derived as `cover-<slug>` unless the user wants otherwise.
2. **HUD contract.** The player HUD shows Puntuación / Vidas / Nivel. If the game has no lives (Tetris counts `lines` instead), decide: (a) emit the secondary counter in the `lives` field and leave `player.tsx` untouched — recommended; (b) add per-game HUD labels, which means editing the HUD markup. Record the choice in the spec's Decisiones section.
3. **Aspect ratio.** `.crt-screen` is `aspect-ratio: 4 / 3`. If the prototype's canvas is not 4:3 (Tetris is 300×600), decide: (a) draw the play area centered inside an 800×600 canvas — recommended, no CSS change; (b) override the aspect ratio for this game.
4. **Non-keyboard input.** If the prototype uses the mouse (Arkanoid moves the paddle with `mousemove` and hit-tests canvas-drawn buttons on `click`), decide what survives the port and what moves to React UI.
5. **Assets.** Images and audio go to `public/games/<slug>/`. Confirm whether they are ported or cut from scope.
6. **Restart.** If the prototype has no restart path (Arkanoid only restarts by reloading the page), confirm that `restart()` is being invented so "JUGAR DE NUEVO" works.
7. **Score persistence.** Confirm this game writes to `scores` through `saveScore`, unlike the games that still have simulated gameplay.

In from-scratch mode, add a block about the gameplay rules before the ones above.

Stop asking when you can answer, without assuming anything: which files appear or change, what the first and last executable steps are, and how to verify the game is finished.

If an answer opens a much larger feature (touch controls, multiplayer, per-game achievements), say it deserves its own spec and ask whether it stays out of scope.

### Phase 3 — Write the spec

If Phase 2 closed with no gaps, write the whole spec at once and go to Phase 4. Do not ask for section-by-section confirmation — the user already answered. Only fall back to section-by-section when information is genuinely missing.

The **structure** comes from `.claude/skills/spec/template.md`: header blockquote, why the spec exists, Scope In / Out, data model, numbered implementation plan, boolean acceptance criteria, decisions taken and discarded, risks, and the closing "what is not in this spec".

The **technical content** comes from `porting-guide.md`. The implementation plan follows its sections in order:

1. The player registry — only when the session-context grep shows `isAsteroids` is still there; otherwise this shrinks to adding one entry.
2. `lib/games/<slug>/engine.ts` — ported or written, matching the engine contract exactly.
3. `components/games/<slug>-game.tsx`.
4. The `.cover-<slug>` class in `app/globals.css`.
5. The `insert into games (...)` statement, as a manual step.
6. The verification gate.

Every step names real paths and ends with how to verify it. No step invents a file that neither the user confirmed nor `porting-guide.md` prescribes.

### Phase 4 — Save the spec

**Gate, before the `Write` call.** Re-open `.claude/skills/spec/SKILL.md` and `.claude/skills/spec/template.md` now if you have not read them in this session, and check the draft against them: header blockquote with the four fields, both Scope sub-blocks present, data model with real names, every plan step commitable on its own, acceptance criteria boolean and verifiable, decisions with their reason, closing "what is not in this spec". Fix the draft before writing, not after. Do not write the file from memory of what a spec looks like.

1. Take the highest number in the `specs/` listing above and add one, zero-padded (`07-`, `08-`…).
2. Slug: kebab-case, derived from the objective, normally containing the game id.
3. Write `specs/NN-<slug>.md` directly. Do not ask permission for the path — announce it. Only ask if the file already exists.
4. Header: `**Status:**` in the draft state, using the wording the existing specs use (`Borrador`); `**Depends on:** SPEC 05, SPEC 06`; `**Date:**` from the session context, never invented.
5. Confirm to the user: the path, that the spec is a draft until they re-read and approve it, and that `/spec-impl NN-<slug>` is the next step. **Stop there.**

## Hard rules

- **Always read `.claude/skills/spec/SKILL.md` and `.claude/skills/spec/template.md` before writing the spec file.** They are the source of truth for the method and the document shape; this skill only layers game-specific knowledge on top. Where the two disagree on format, `template.md` wins.
- **Never write code and never implement.** The only file you create is the spec.
- **Never call Supabase tools**, not even read-only ones. The `insert into games (...)` statement lives inside the spec as a manual step.
- **Never invent the prototype's behavior.** Every gameplay claim in the spec must come from a file you actually read in Phase 1, or from an answer the user gave in Phase 2.
- **Respect the engine contract verbatim** — method names, state field names, file paths. A game that renames `forceGameOver()` or drops `phase` breaks `components/player.tsx`.
- **Never propose implementing the spec after saving it.** Your job ends at the confirmation message.

## Tone when asking questions

Direct and specific. Do not apologize for asking. Offer concrete options rather than open-ended prompts: "Tetris has no lives — do we show `lines` in the Vidas slot, or add a per-game label?" beats "how do you imagine the HUD?".

## Arguments

`$ARGUMENTS` is the game to spec: a prototype folder name (`03-tetris`), a bare game name (`tetris`, `arkanoid`), or the name of a game that does not exist yet (`pong`). Match it loosely against the prototype listing in the session context; when nothing matches, treat it as from-scratch mode and say so before asking anything.

Invoked with no arguments, list the available prototypes and ask.
