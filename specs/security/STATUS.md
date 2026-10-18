# Estado de auditorías de seguridad

Ledger del agente `security-auditor` (lanzado con `/security-audit`). Una fila por ejecución; la **última fila** es el estado actual. Solo se añaden filas; el agente solo cambia una fila `generado` previa a `implementado` cuando una auditoría posterior ve resueltos sus hallazgos. El usuario también puede marcarla `implementado` tras `/spec-impl`.

Estados: `generado` (hay borrador de spec pendiente) → `implementado` · `limpio` (sin spec).

| fecha | alcance | informe | spec | estado | hallazgos |
| ----- | ------- | ------- | ---- | ------ | --------- |
