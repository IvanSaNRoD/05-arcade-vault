# SPEC 15 — Autenticación de usuarios

> **Estado:** Aprobado
> **Depende de:** SPEC 01, SPEC 04, SPEC 14
> **Fecha:** 2026-10-15
> **Objetivo:** Que un jugador pueda registrarse, iniciar sesión (email+contraseña, Google o GitHub), recuperar su contraseña y cerrar sesión con Supabase Auth, con un username único que aparece en el nav y firma sus puntuaciones.

---

## Por qué existe esta spec

`components/auth-form.tsx` es visual: ambos botones hacen `router.push("/juegos")` y no crean sesión. SPEC 04 dejó la infraestructura lista (`lib/supabase/{client,server,proxy}.ts`, `proxy.ts` refresca la sesión) y aplazó "Auth real" a una spec propia. Esta es esa spec.

---

## Scope

**In:**

- Supabase: tabla `public.profiles` (username único) + trigger `on_auth_user_created` que crea el profile al registrarse (email u OAuth). Aplicado con Supabase MCP `apply_migration`.
- `lib/actions/auth.ts` (server actions): `signIn`, `signUp`, `signOut`, `signInWithProvider`, `requestPasswordReset`, `updatePassword`.
- `app/auth/callback/route.ts`: canjea `?code=` por sesión (OAuth, confirmación de email, recuperación) y redirige a `next`.
- `app/auth/page.tsx`: si hay sesión → `redirect("/juegos")`; muestra `?error=` del callback.
- `components/auth-form.tsx`: conectado a las server actions con `useActionState`; estados de error, carga y "revisa tu correo"; enlace "¿Olvidaste tu contraseña?"; botones GOOGLE/GITHUB funcionales.
- `app/auth/recuperar/page.tsx`: formulario de email → `requestPasswordReset`.
- `app/auth/nueva-contrasena/page.tsx`: formulario nueva contraseña → `updatePassword`. Sin sesión → `redirect("/auth")`.
- `lib/hooks/use-user.ts`: hook cliente `useUser()` → `{ id, username } | null`.
- `components/nav.tsx`: con sesión muestra `username` + botón SALIR (desktop y panel móvil); sin sesión, "Iniciar Sesión" como hoy.
- `components/player.tsx`: con sesión, el nombre de la partida es el `username` (no editable, no se escribe en localStorage).
- Configuración manual (dashboard Supabase + consolas Google/GitHub), documentada en `docs/verificacion/15-autenticacion.md`.
- `specs/BACKLOG.md`: entradas fuera de scope (ver abajo).

**Out of scope (para futuras specs):**

- Columna `scores.user_id` / RLS por usuario en `scores` (las puntuaciones siguen guardando solo `name`).
- SMTP propio (Resend con dominio verificado). Se usa el SMTP por defecto de Supabase.
- Página de perfil / cambiar username / borrar cuenta.
- Rutas protegidas: todo sigue jugable como invitado.
- Parámetro `?next=` para volver a la página de origen tras login.
- Magic link, otros providers OAuth, 2FA.
- Cambios en "CRÉDITOS · 03" del nav.
- Archivo de migración en el repo (`supabase/migrations/`).

---

## Modelo de datos

```sql
-- Migración: profiles_and_new_user_trigger
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique check (username ~ '^[a-z0-9_]{3,16}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles
  for select using (true);
-- Sin policies de insert/update/delete: solo escribe el trigger.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base      text;
  candidate text;
  n         int := 0;
begin
  base := lower(coalesce(
    new.raw_user_meta_data->>'username',   -- registro email (lo pasa signUp)
    new.raw_user_meta_data->>'user_name',  -- GitHub
    split_part(new.email, '@', 1)          -- Google / resto
  ));
  base := left(regexp_replace(base, '[^a-z0-9_]', '', 'g'), 12);
  if length(base) < 3 then
    base := 'jugador';
  end if;

  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := base || n;
  end loop;

  insert into public.profiles (id, username) values (new.id, candidate);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Migración: revoke_handle_new_user_execute
revoke execute on function public.handle_new_user() from public, anon, authenticated;
```

- `left(..., 12)`: deja 4 caracteres para el sufijo numérico sin pasar de 16.
- `revoke execute`: sin ello `get_advisors` avisa de que `anon`/`authenticated` pueden llamar la función `security definer` por `/rest/v1/rpc`. El trigger sigue disparando: Postgres no comprueba `EXECUTE` al disparar triggers.
- `security definer` + `search_path = ''`: el trigger escribe en `public.profiles` saltando RLS; nombres totalmente cualificados.
- Usuarios ya existentes en `auth.users` (si los hay) no tienen profile; ver Riesgos.

```ts
// lib/actions/auth.ts
export type AuthState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "check-email"; email: string };

// lib/hooks/use-user.ts
export interface SessionUser {
  id: string;
  username: string;
}
```

Reglas de validación (server actions):

| Campo      | Regla                                              | Mensaje                                               |
| ---------- | -------------------------------------------------- | ----------------------------------------------------- |
| username   | `^[a-z0-9_]{3,16}$` tras `trim().toLowerCase()`    | "Usuario: 3–16 caracteres, solo letras, números y _." |
| username   | no existe en `profiles`                            | "Ese usuario ya está en uso."                         |
| email      | `EMAIL_REGEX` (mismo que `lib/actions/contact.ts`) | "El formato del correo no es válido."                 |
| contraseña | ≥ 8 caracteres                                     | "La contraseña debe tener al menos 8 caracteres."     |

Errores de Supabase traducidos (por `error.code`): `invalid_credentials` → "Correo o contraseña incorrectos.", `email_not_confirmed` → "Confirma tu correo antes de entrar.", `user_already_exists` → "Ya existe una cuenta con ese correo.", `over_email_send_rate_limit` → "Demasiados correos enviados. Prueba en un rato.", resto → "Algo falló. Intenta de nuevo."

---

## Plan de implementación

1. **Configuración manual (usuario).** Documentar en `docs/verificacion/15-autenticacion.md` y ejecutar:
   - Supabase → Auth → URL Configuration: Site URL `http://localhost:3000` (y la de producción); Redirect URLs `http://localhost:3000/auth/callback` y `<prod>/auth/callback`.
   - Supabase → Auth → Providers: Email con "Confirm email" activado.
   - GitHub → Settings → Developer settings → OAuth App; callback `https://jphrjjhqkhrjkawpzklj.supabase.co/auth/v1/callback`. Client ID/secret → provider GitHub en Supabase.
   - Google Cloud → Credentials → OAuth client (Web); mismo callback. Client ID/secret → provider Google en Supabase.
     Verificar: los 3 providers aparecen "Enabled" en el dashboard.
2. **Migración.** Aplicar el SQL de arriba con `apply_migration` (`profiles_and_new_user_trigger`). Verificar con `execute_sql`: `select * from profiles` responde (vacía o con filas); `get_advisors` sin avisos nuevos de seguridad sobre `profiles`/`handle_new_user`.
3. **Callback.** `app/auth/callback/route.ts` (`GET`): lee `code` y `next` (solo rutas que empiecen por `/`, default `/juegos`), `exchangeCodeForSession(code)` con `lib/supabase/server.ts`; éxito → `redirect(next)`; fallo → `redirect("/auth?error=enlace")`. Consultar `node_modules/next/dist/docs/01-app/` (route handlers) antes. Verificar: `/auth/callback` sin `code` redirige a `/auth?error=enlace`.
4. **Server actions.** `lib/actions/auth.ts` con las 6 acciones. `emailRedirectTo`/`redirectTo` construidos con el `origin` de `headers()`:
   - `signUp(prev, formData)`: valida, comprueba username libre en `profiles`, `auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: origin + "/auth/callback" } })` → `{ status: "check-email" }`.
   - `signIn`: `signInWithPassword` → `redirect("/juegos")`.
   - `signInWithProvider(provider)`: `signInWithOAuth({ provider, options: { redirectTo: origin + "/auth/callback" } })` → `redirect(data.url)`.
   - `requestPasswordReset`: `resetPasswordForEmail(email, { redirectTo: origin + "/auth/callback?next=/auth/nueva-contrasena" })` → siempre `check-email` (no revela si el email existe).
   - `updatePassword`: valida ≥8, `auth.updateUser({ password })` → `redirect("/juegos")`.
   - `signOut`: `auth.signOut()` → `redirect("/")`.
     Verificar: `npx tsc --noEmit`.
5. **Formulario.** `components/auth-form.tsx`: tabs actuales; cada tab un `<form action>` con `useActionState`; campo Usuario solo en "CREAR CUENTA"; login pide Correo + Contraseña; botón deshabilitado y texto "CONECTANDO…" mientras `pending`; error bajo el botón; `check-email` sustituye el formulario por "REVISA TU CORREO · <email>". Enlace "¿Olvidaste tu contraseña?" → `/auth/recuperar`. GOOGLE/GITHUB → `signInWithProvider`. "JUGAR COMO INVITADO" sin cambios. Usar `/frontend-design` para los estados nuevos. `app/auth/page.tsx`: con sesión (`getUser()`) → `redirect("/juegos")`; pasa `searchParams.error` al form ("El enlace no es válido o ha caducado. Ábrelo en el mismo navegador donde lo pediste."). Verificar: registro real → email recibido → enlace → sesión iniciada en `/juegos`.
6. **Recuperación.** `app/auth/recuperar/page.tsx` y `app/auth/nueva-contrasena/page.tsx`, misma tarjeta `auth-card`. Verificar: flujo completo cambia la contraseña y el login con la nueva funciona.
7. **`useUser()`.** `lib/hooks/use-user.ts`: cliente (`lib/supabase/client.ts`); lee `auth.getSession()` al montar y en cada cambio de `usePathname()` (lectura local de cookie, sin red), se suscribe a `onAuthStateChange`; cuando cambia el `user.id`, consulta `profiles.username`. Devuelve `null` sin sesión. Verificar: tras login, el hook devuelve el username sin recargar.
8. **Nav.** `components/nav.tsx`: con `useUser()` → `username` + `<form action={signOut}>` con botón "SALIR" en lugar de "Iniciar Sesión" (desktop y panel móvil). Verificar a 375 px y desktop.
9. **Player.** `components/player.tsx`: si `useUser()` devuelve usuario, `name = username`, input de nombre oculto/readonly, no escribe `av_player_name`. Invitado: comportamiento actual. Verificar: guardar puntuación logueado → fila en `scores` con `name = username`.
10. **BACKLOG.** Añadir: SMTP propio con Resend; `scores.user_id` + RLS; página de perfil (cambiar username, borrar cuenta); `?next=` tras login.

---

## Criterios de aceptación

- [ ] `profiles` existe con RLS activa, `username` unique + check `^[a-z0-9_]{3,16}$`; `get_advisors` sin avisos de seguridad nuevos.
- [ ] Registro email: crea fila en `auth.users` y en `profiles` con el username elegido; muestra "REVISA TU CORREO"; sin confirmar, el login devuelve "Confirma tu correo antes de entrar."
- [ ] El enlace de confirmación inicia sesión y aterriza en `/juegos`.
- [ ] Registro con username ya usado → "Ese usuario ya está en uso." sin crear cuenta.
- [ ] Login con contraseña incorrecta → "Correo o contraseña incorrectos."
- [ ] Login con GitHub y con Google crean sesión y un profile con username autogenerado válido (sufijo numérico si choca).
- [ ] Recuperar contraseña: email recibido → `/auth/nueva-contrasena` → nueva contraseña funciona; la antigua no.
- [ ] `/auth/nueva-contrasena` sin sesión redirige a `/auth`.
- [ ] Con sesión, `/auth` redirige a `/juegos`.
- [ ] Nav (desktop y móvil 375 px) muestra username + SALIR con sesión; SALIR cierra sesión, lleva a `/` y el nav vuelve a "Iniciar Sesión" sin recargar.
- [ ] Logueado, guardar puntuación inserta `scores.name = username`; invitado sigue igual (nombre libre / "INVITADO").
- [ ] `npm run build`: `/`, `/juegos` siguen con `Revalidate 1m` y `/juegos/[id]` como SSG/ISR (el layout no lee cookies).
- [ ] `npx tsc --noEmit` sin errores; `npx eslint` sobre los archivos tocados sin errores nuevos.
- [ ] `docs/verificacion/15-autenticacion.md` y entradas nuevas en `specs/BACKLOG.md` existen.

---

## Decisiones

- **Sí:** email+contraseña, Google y GitHub en una sola spec (decisión del usuario; se propuso dividir).
- **Sí:** tabla `profiles` con username único creada por trigger. Unicidad garantizada en DB y consultable; base para ligar `scores` después.
- **No:** username en `user_metadata`. Sin unicidad ni lectura pública.
- **Sí:** username OAuth autogenerado (`user_name` de GitHub / prefijo del email) con sufijo numérico. Sin pantalla de onboarding extra.
- **Sí:** confirmación de email obligatoria (default de Supabase).
- **Sí:** un único `/auth/callback` con `exchangeCodeForSession` (PKCE) para OAuth, confirmación y recuperación. No hay que editar las plantillas de email de Supabase.
- **No:** `/auth/confirm` con `token_hash`/`verifyOtp`. Funciona entre navegadores pero exige cambiar plantillas de email; se acepta la limitación (ver Riesgos).
- **Sí:** server actions en `lib/actions/auth.ts`. Mismo patrón que `lib/actions/contact.ts`; cookies de sesión fijadas en servidor.
- **Sí:** sesión en el nav leída en cliente (`useUser()`). Leer cookies en `app/layout.tsx` volvería dinámicas todas las rutas y rompería el ISR de SPEC 14.
- **Sí:** `getSession()` en cliente solo para pintar UI. Las decisiones de seguridad (redirects de `/auth`, `nueva-contrasena`) usan `getUser()` en servidor.
- **Sí:** recuperar contraseña dentro de esta spec (decisión del usuario).
- **Sí:** SMTP por defecto de Supabase. Cero config; límite bajo aceptado en desarrollo.
- **Sí:** `requestPasswordReset` responde igual exista o no el email. Evita enumerar cuentas.
- **Sí:** contraseña mínima 8 en la server action (Supabase exige 6 por defecto).
- **No:** rutas protegidas ni `?next=`. Invitado sigue pudiendo jugar todo.
- **No:** `scores.user_id`. El player solo usa el username como nombre; ligar puntuaciones va a spec futura.

---

## Riesgos

| Riesgo                                                                                 | Mitigación                                                                                                    |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| SMTP por defecto de Supabase: ~2 emails/h y puede limitar destinatarios                | Error `over_email_send_rate_limit` traducido; SMTP propio a BACKLOG.                                          |
| Enlace de email abierto en otro navegador/dispositivo → PKCE falla                     | Callback redirige a `/auth?error=enlace` con mensaje que lo explica.                                          |
| Usuarios ya existentes en `auth.users` sin profile                                     | Paso 2: `execute_sql` `select count(*) from auth.users`; si >0, insertar sus profiles con el mismo algoritmo. |
| Carrera: dos registros con el mismo username a la vez                                  | El trigger añade sufijo numérico al segundo; aceptado.                                                        |
| Fallo del trigger bloquea el alta (Supabase devuelve "Database error saving new user") | Trigger nunca falla por colisión (bucle de sufijos); verificar con un registro real en paso 5.                |
| Nav muestra "Iniciar Sesión" un instante antes de hidratar                             | Aceptado: coste de mantener las páginas estáticas/ISR.                                                        |
| `origin` de `headers()` ausente tras algunos proxies                                   | Fallback a `http://localhost:3000` en dev; documentar en `docs/verificacion/`.                                |
| OAuth mal configurado (callback URL distinta)                                          | Paso 1 documenta la URL exacta; error de callback → `/auth?error=enlace`.                                     |

---

## Lo que **no** está en esta spec

- `scores.user_id` y RLS por usuario.
- SMTP propio.
- Perfil de usuario (editar username, borrar cuenta).
- Rutas protegidas y `?next=`.
- Magic link, 2FA, otros providers.

Cada una, si llega, va en su propia spec.
