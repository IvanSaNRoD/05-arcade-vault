---
name: performance-game
description: Runs the game-performance-booster subagent on a game, then automatically runs game-performance-implementation when a performance spec is pending (status `generado` in specs/performance/STATUS.md). Sequential, never in parallel.
disable-model-invocation: true
argument-hint: <game-id> [re-auditar]
allowed-tools: Read, Agent, Bash(cat:*)
---

# /performance-game — Audit + implement a game's performance spec

Arguments: `$ARGUMENTS` (game id, optionally followed by `re-auditar`).

## Session context

Performance ledger:
!`cat specs/performance/STATUS.md 2>/dev/null || echo "No STATUS.md yet"`

## Instructions

### Phase 1 — Audit

1. Launch the `game-performance-booster` subagent with the prompt `$ARGUMENTS`.
2. Wait for its completion notification. Summarize its result to the user in Spanish (findings table, spec path, or why it skipped).

### Phase 2 — Implement (automatic)

1. Read `specs/performance/STATUS.md` again (the booster may have added a row).
2. Find the **last row** for the game id:
   - `generado` (new or pending from a previous run) → launch the `game-performance-implementation` subagent with the prompt `<game-id>`. Wait for its notification and summarize (steps, touched files, eslint/tsc, final state).
   - Any other state (`en-curso`, `implementado`, `bloqueado`, `cumple`) or no row → stop and report the state. Do not launch the implementer.
3. **Never launch both agents in the same message or in parallel.** If the booster fails, stop.

### Closing

```
✅ Auditoría + implementación terminadas.

Siguientes pasos:
  1. Revisar `git diff` en la rama perf-<id>.
  2. Verificar a mano los criterios de aceptación del spec (DevTools, Profiler, por skin).
  3. Hacer commit (código del juego + spec + STATUS.md).
```

Never commit on the user's behalf.
