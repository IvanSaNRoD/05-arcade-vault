# Despliegue — Supabase producción

> **Alcance:** pasar esquema, catálogo y configuración de Supabase dev (`jphrjjhqkhrjkawpzklj`) a un proyecto de producción nuevo.
> **Regla:** Claude/MCP **no** tiene acceso a producción. Todo lo de prod lo ejecuta una persona a mano.

## 0. Aislamiento (antes de nada)

1. Crear el proyecto de producción en una **organización Supabase distinta** de la de dev. Si ya está en la misma, moverlo: Project Settings → General → Transfer project.
2. supabase.com → Account → Authorized apps (o Organization → OAuth apps) → revocar el acceso del MCP. Al reiniciar Claude Code, reautorizar seleccionando **solo la organización de dev**.
   - Motivo: el token OAuth del MCP da permisos por organización. `project_ref` en `.mcp.json` solo filtra herramientas, no permisos.
3. Ya aplicado en el repo:
   - `.mcp.json`: features `docs,database,debugging,development` (sin `account`, `functions`, `branching`: no puede listar ni crear proyectos).
   - `.claude/settings.json`: `permissions.deny` de las tools de cuenta/proyecto/branching por si se reactivan.
4. `.env.local` sigue apuntando a **dev**. Las claves de prod solo viven en el hosting.

## 1. Esquema y datos (SQL Editor de prod)

Ejecutar en orden, cada archivo completo:

| Archivo                           | Qué hace                                                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `supabase/prod/01-schema.sql`     | Tablas `games`/`scores`/`profiles`, RLS, 5 policies, vista `game_stats`, función `handle_new_user` + trigger. Transacción. |
| `supabase/prod/02-seed-games.sql` | 8 filas de `games` (copia de dev). Sin scores ni usuarios.                                                                 |
| `supabase/prod/03-verify.sql`     | Solo lectura. Comparar con el resultado esperado de abajo.                                                                 |

No se reproduce el historial de migraciones de dev: la migración 1 siembra ids antiguos (`caida`, `bloque-buster`…) que en dev se renombraron a mano. Los scripts reflejan el estado **actual** de dev.

Resultado esperado de `03-verify.sql` en prod (en dev da lo mismo salvo `scores: 4`, `profiles: 3`):

```json
{
  "games": 8,
  "scores": 0,
  "profiles": 0,
  "rls": { "games": true, "profiles": true, "scores": true },
  "policies": [
    "games: games are publicly readable [SELECT]",
    "profiles: profiles_select_all [SELECT]",
    "scores: scores are publicly readable [SELECT]",
    "scores: scores_insert_anon [INSERT]",
    "scores: scores_insert_authenticated [INSERT]"
  ],
  "view_security_invoker": ["security_invoker=true"],
  "trigger": ["on_auth_user_created"],
  "handle_new_user_exec": { "anon": false, "authenticated": false }
}
```

## 2. Authentication (dashboard de prod)

La config de Auth no vive en la base de datos: hay que replicarla a mano (ver `docs/verificacion/15-autenticacion.md` y `16-seguridad.md`).

| Sección                           | Valor                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| URL Configuration → Site URL      | `https://<dominio-prod>`                                                               |
| URL Configuration → Redirect URLs | `https://<dominio-prod>/auth/callback` (sin localhost)                                 |
| Sign In / Providers → Email       | Enabled, **Confirm email** ON                                                          |
| Email → Minimum password length   | `8`                                                                                    |
| Email → Password requirements     | Lowercase, uppercase letters, digits and symbols                                       |
| Rate Limits → sign-ups/sign-ins   | El mismo valor que dev (objetivo SPEC 16: 10 signups/h por IP)                         |
| Leaked password protection        | Solo plan Pro (BACKLOG #10)                                                            |
| SMTP                              | Por defecto de Supabase (~2 correos/h, BACKLOG #6). Revisar antes de abrir al público. |

Callback OAuth de prod: `https://<prod-ref>.supabase.co/auth/v1/callback`

### GitHub

GitHub OAuth Apps solo admiten **un** callback: crear una **OAuth App nueva** para prod.

- Homepage URL: `https://<dominio-prod>`
- Authorization callback URL: callback OAuth de prod.
- Client ID + nuevo Client Secret → Supabase prod → Providers → GitHub.

### Google

Google Cloud → APIs & Services → Credentials. Recomendado: **cliente OAuth nuevo** para prod (separa secretos de dev).

- Authorized JavaScript origins: `https://<dominio-prod>`
- Authorized redirect URIs: callback OAuth de prod.
- OAuth consent screen: publicar en **In production**; en "Testing" solo entran los usuarios de prueba.
- Client ID + Secret → Supabase prod → Providers → Google.

Comprobación: Email, GitHub y Google en "Enabled".

## 3. Variables de entorno (hosting)

| Variable                               | Valor                                                          |
| -------------------------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | `https://<prod-ref>.supabase.co`                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → publishable (`sb_publishable_…`) |
| `RESEND_API_KEY`                       | Clave de Resend (puede ser una nueva solo para prod)           |
| `CONTACT_EMAIL`                        | Correo destino del formulario de contacto                      |

Nunca poner la secret key / `service_role` en el hosting: la app no la usa.

El build hace lecturas en `generateStaticParams` (`lib/supabase/static.ts`): las variables deben existir **antes** del primer build. Tras cambiar datos, ISR (`revalidate = 60`) los refresca en ≤ 60 s.

## 4. Comprobación final

- [ ] `03-verify.sql` coincide con el resultado esperado.
- [ ] Prod → Advisors → Security: solo `auth_leaked_password_protection` (aceptado, plan Free).
- [ ] `/juegos` lista 8 juegos; `/juegos/tetris` carga sin leaderboard (vacío).
- [ ] Partida sin sesión: guarda score anónimo y aparece en el leaderboard.
- [ ] Registro con email: llega el correo, el enlace inicia sesión, se crea fila en `profiles`.
- [ ] Login con GitHub y con Google: se crea `profiles`; score con sesión se guarda con el username.
- [ ] Contraseña de 7 caracteres vía `curl` a `/auth/v1/signup` devuelve `weak_password` (ver `16-seguridad.md`, con URL/key de prod).
- [ ] Recuperar contraseña: el enlace lleva a `/auth/nueva-contrasena` en el dominio de prod (no localhost).

## 5. Cambios futuros de esquema

1. Aplicar en dev con MCP (`apply_migration`) y verificar.
2. Guardar el mismo SQL como `supabase/prod/NN-<slug>.sql`.
3. Ejecutarlo a mano en el SQL Editor de prod.
