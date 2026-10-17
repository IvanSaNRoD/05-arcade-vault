## Checklist de seguridad básico

- [ ] RLS: Row Level Security habilitado en ambas tablas: `games` y `scores`
- [ ] Minimum password length — mínimo 8 caracteres
- [ ] Leaked password protection — (el warning 4)
- [ ] Max signup rate — limitar signups por IP (anti-bot)
- [ ] Headers de seguridad en Next.js

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

- [ ] **RLS Policy Always True** · `WARN` · `public.scores`
  - Problema: la policy `scores are publicly insertable` (`INSERT`, roles `anon`, `authenticated`) tiene `WITH CHECK (true)` → cualquiera inserta cualquier fila, RLS no filtra nada.
  - Solución: restringir el `WITH CHECK` (p. ej. `auth.uid() = user_id`, solo `authenticated`).
  - Docs: <https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy>
- [ ] **Leaked Password Protection Disabled** · `WARN` · Auth
  - Problema: no se comprueban las contraseñas contra HaveIBeenPwned.org.
  - Solución: activarlo en Auth → Providers → Email → "Prevent use of leaked passwords".
  - Docs: <https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection>
