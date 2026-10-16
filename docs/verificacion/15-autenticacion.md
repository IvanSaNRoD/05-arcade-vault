# Verificación — SPEC 15 Autenticación de usuarios

> **Spec:** [15-autenticacion-usuarios.md](../../specs/15-autenticacion-usuarios.md)
> **Rama:** `spec-15-autenticacion-usuarios`
> **Alcance:** configuración manual de Supabase Auth y proveedores OAuth (paso 1), y notas de verificación.

## Configuración manual (paso 1)

No se puede hacer con el MCP de Supabase: la config de Auth no vive en la base de datos. Se hace a mano en los dashboards.

Callback de Supabase para los proveedores OAuth: `https://jphrjjhqkhrjkawpzklj.supabase.co/auth/v1/callback`

### Supabase → Authentication → URL Configuration

| Campo         | Valor                                                                 |
| ------------- | --------------------------------------------------------------------- |
| Site URL      | `http://localhost:3000` (cambiar a la URL de producción al desplegar) |
| Redirect URLs | `http://localhost:3000/auth/callback`, `<prod>/auth/callback`         |

Si la URL de retorno no está en Redirect URLs, Supabase redirige a la Site URL y el `code` no llega a `/auth/callback`.

### Supabase → Authentication → Sign In / Providers → Email

- Email: activado.
- Confirm email: activado.

### GitHub → Settings → Developer settings → OAuth Apps → New OAuth App

| Campo                      | Valor                         |
| -------------------------- | ----------------------------- |
| Homepage URL               | `http://localhost:3000`       |
| Authorization callback URL | callback de Supabase (arriba) |

Generar Client Secret → Supabase → Providers → GitHub: activar y pegar Client ID + Secret.

### Google Cloud Console → APIs & Services

- OAuth consent screen: tipo External. En modo "Testing" solo pueden entrar los usuarios de prueba añadidos.
- Credentials → OAuth client ID → Web application:
  - Authorized JavaScript origins: `http://localhost:3000`
  - Authorized redirect URIs: callback de Supabase (arriba)
- Supabase → Providers → Google: activar y pegar Client ID + Secret.

### Comprobación

Supabase → Providers: Email, GitHub y Google en "Enabled".

## Base de datos (paso 2)

Migraciones aplicadas con Supabase MCP `apply_migration`:

- `profiles_and_new_user_trigger`: tabla `profiles`, RLS, policy `profiles_select_all`, función `handle_new_user`, trigger `on_auth_user_created`.
- `revoke_handle_new_user_execute`: quita `EXECUTE` a `public`/`anon`/`authenticated` (aviso de `get_advisors`).

`auth.users` tenía 0 usuarios al migrar: no hubo que crear profiles retroactivos. `get_advisors` (security): 0 avisos.

## Notas

- `origin` de los enlaces de email/OAuth sale de la cabecera `Origin` de la server action; fallback `http://localhost:3000` (`lib/actions/auth.ts`). Tras un proxy que no la reenvíe, los enlaces apuntarían a localhost.
- Los enlaces de email (confirmación, recuperación) usan PKCE: hay que abrirlos en el mismo navegador donde se pidieron. Si no, `/auth?error=enlace`.
- SMTP por defecto de Supabase: ~2 correos/hora (BACKLOG #6).
- Con "Confirm email" activo, registrarse con un correo ya existente no devuelve error: Supabase responde como si fuera bien (anti-enumeración) y la UI muestra "REVISA TU CORREO".

## Resultados

Pendiente de la verificación de criterios de aceptación.
