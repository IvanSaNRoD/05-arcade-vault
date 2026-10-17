## Checklist de seguridad básico

Implementado en SPEC 16 (`specs/16-medidas-seguridad-basicas.md`). Notas de verificación en `docs/verificacion/16-seguridad.md`.

- [x] RLS: Row Level Security habilitado en ambas tablas: `games` y `scores`
- [ ] Minimum password length — mínimo 8 caracteres (dashboard; pendiente de verificar con `curl`)
- [x] Password requirements — minúsculas, mayúsculas, dígitos y símbolos (dashboard + `validatePassword`)
- [ ] Leaked password protection — (el warning 4) · **aplazado**: requiere plan Pro (BACKLOG #10)
- [ ] Max signup rate — limitar signups por IP (anti-bot) · objetivo 10/h (dashboard; pendiente de anotar valor real)
- [x] Headers de seguridad en Next.js (`next.config.ts`, + `Permissions-Policy`)
- [x] Protección de rutas de auth en el proxy (`lib/supabase/proxy.ts`)

Ej:

```ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

// En la config de Next.js:
headers: async () => [{ source: "/(.*)", headers: securityHeaders }];
```

## Por el lado de Supabase

Advisors de seguridad (panel de warnings y errores, revisado 2026-10-17):

- [x] **RLS Policy Always True** · `WARN` · `public.scores`
  - Problema: la policy `scores are publicly insertable` (`INSERT`, roles `anon`, `authenticated`) tiene `WITH CHECK (true)` → cualquiera inserta cualquier fila, RLS no filtra nada.
  - Solución: restringir el `WITH CHECK` (p. ej. `auth.uid() = user_id`, solo `authenticated`).
  - Resuelto (SPEC 16): `scores.user_id` + policies `scores_insert_anon` y `scores_insert_authenticated`. Invitado sigue pudiendo guardar.
  - Docs: <https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy>
- [ ] **Leaked Password Protection Disabled** · `WARN` · Auth
  - Problema: no se comprueban las contraseñas contra HaveIBeenPwned.org.
  - Solución: activarlo en Auth → Providers → Email → "Prevent use of leaked passwords".
  - Aplazado: solo plan Pro; el proyecto es Free (BACKLOG #10).
  - Docs: <https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection>
