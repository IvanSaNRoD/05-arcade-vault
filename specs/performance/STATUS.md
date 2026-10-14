# Estado de specs de rendimiento

Ledger compartido entre `game-performance-booster` (escribe `generado` / `cumple`) y `game-performance-implementation` (escribe `en-curso` / `implementado` / `bloqueado`). Una fila por ejecución; la **última fila de cada juego** es su estado actual. Solo se añaden filas o se actualiza el `estado`/`rama`/`notas` de la última; nunca se borran.

Estados: `generado` → `en-curso` → `implementado` | `bloqueado` · `cumple` (sin spec).

| fecha      | juego   | spec                                     | estado       | rama                        | notas                                          |
| ---------- | ------- | ---------------------------------------- | ------------ | --------------------------- | ---------------------------------------------- |
| 2026-05-25 | frogger | specs/13-frogger-performance.md          | implementado | spec-13-frogger-performance | PR #22                                         |
| 2026-10-14 | frogger | specs/performance/frogger-performance.md | implementado | perf-frogger                | Pasos 1-6 hechos; verificación manual pendiente |
