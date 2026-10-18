---
name: security-audit
description: Runs the security-auditor subagent over the Supabase database (read-only) and/or the Next.js app, producing a report and, if needed, a draft fix spec in specs/security/. Audit only; fixes go through /spec-impl after human review.
disable-model-invocation: true
argument-hint: [db|app|todo] [re-auditar]
allowed-tools: Read, Agent, Bash(cat:*)
---

# /security-audit — Security audit of DB + app

Arguments: `$ARGUMENTS` (scope `db` | `app` | `todo`, default `todo`; optionally `re-auditar`).

## Session context

Security ledger:
!`cat specs/security/STATUS.md 2>/dev/null || echo "No STATUS.md yet"`

## Instructions

1. Launch the `security-auditor` subagent with the prompt `$ARGUMENTS` (use `todo` if empty).
2. Wait for its completion notification. Summarize its result to the user in Spanish: scope, findings table (ID | resultado | severidad | evidencia), report path, draft spec path or why none.
3. Do **not** launch any implementation agent and do not apply fixes. Security fixes always go through human review.

### Closing

```
✅ Auditoría de seguridad terminada.

Siguientes pasos:
  1. Leer el informe en specs/security/AUDIT-<fecha>.md.
  2. Si hay borrador de spec: revisarlo, cambiar el estado a "Aprobado" y lanzar /spec-impl.
  3. Hacer commit (informe + spec + STATUS.md + memoria del agente).
```

Never commit on the user's behalf.
