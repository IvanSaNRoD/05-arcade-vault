# SPEC 04 — Conexión y configuración de Supabase

> **Status:** Aprobada
> **Depends on:** —
> **Date:** 2026-09-19
> **Objective:** Configurar los clientes de Supabase (browser, server, proxy) y las variables de entorno necesarias para habilitar DB y Auth, sin crear, modificar ni escribir tablas en la base de datos.

## Por qué existe esta spec

El proyecto instaló `@supabase/supabase-js` y `@supabase/ssr` para usar Supabase como DB y Auth. Un intento anterior de configuración se hizo directamente en conversación (sin spec) y se borró a propósito para rehacerlo siguiendo el flujo spec-driven. El proyecto de Supabase conectado (`jphrjjhqkhrjkawpzklj`) no tiene tablas en `public` todavía: esta spec cubre únicamente la infraestructura de conexión, dejando el modelo de datos de negocio (juegos, puntuaciones, usuarios) para specs futuras.

## Scope

**In:**

- Confirmar las dependencias `@supabase/ssr` y `@supabase/supabase-js` (ya en `package.json`).
- Variables de entorno en `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (clave publishable moderna, no la legacy `anon` JWT), obtenidas del proyecto Supabase activo.
- `lib/supabase/client.ts` — cliente para Client Components (`createBrowserClient`).
- `lib/supabase/server.ts` — cliente para Server Components / Server Actions (`createServerClient`, `cookies()` async de `next/headers`).
- `lib/supabase/proxy.ts` — `updateSession(request)` que refresca el token de sesión leyendo/escribiendo cookies.
- `proxy.ts` en la raíz del proyecto (Next 16 renombró `middleware.ts` a `proxy.ts`) que invoca `updateSession` en cada request, excluyendo assets estáticos.
- Una verificación read-only de conectividad (`auth.getSession()` o `auth.getUser()`) que confirme que la URL y la clave son correctas, sin leer ni escribir ninguna tabla.

**Out of scope (para specs futuras):**

- Crear, modificar o borrar tablas, esquemas, políticas RLS, funciones o cualquier objeto en la base de datos. Ninguna migración SQL ni uso de `apply_migration` / `execute_sql` de escritura.
- Conectar `components/auth-form.tsx` a `signIn` / `signUp` / `signOut` reales (spec futura de "Auth real").
- Proteger rutas según sesión (redirigir si no hay usuario). `proxy.ts` solo refresca la cookie, no bloquea navegación.
- Modelo de datos de negocio contra Supabase (juegos, puntuaciones, perfiles). `lib/games.ts` y `lib/scores.ts` siguen siendo mock.
- Login social (Google/GitHub) más allá de la config general del cliente.
- Tests automatizados.

## Modelo de datos

Esta spec no introduce modelo de datos: no crea tablas, tipos de dominio ni registros. Solo configura los clientes de conexión (`lib/supabase/*`) y variables de entorno.

## Plan de implementación

1. Confirmar `@supabase/ssr` y `@supabase/supabase-js` en `package.json` (ya instaladas). Verificar: `npm ls @supabase/ssr @supabase/supabase-js` sin errores.
2. Obtener la URL y la clave publishable del proyecto Supabase activo (`mcp__supabase__get_project_url`, `mcp__supabase__get_publishable_keys`) y añadirlas a `.env.local` como `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Verificar: ambas variables existen en `.env.local`; `.env*` sigue en `.gitignore`.
3. Crear `lib/supabase/client.ts` con `createBrowserClient(url, publishableKey)`. Verificar: `npx tsc --noEmit` no añade errores nuevos atribuibles a este archivo.
4. Crear `lib/supabase/server.ts` con `createServerClient`, usando `await cookies()` (API async confirmada en `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`). Verificar: mismo chequeo de tipos.
5. Crear `lib/supabase/proxy.ts` con `updateSession(request)`: `createServerClient` con `getAll`/`setAll` sobre las cookies del `NextRequest`, y una llamada a `supabase.auth.getUser()` para refrescar el token.
6. Crear `proxy.ts` en la raíz exportando `proxy(request)` (no `middleware.ts`, deprecado en Next 16 — confirmado en `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`) que llama a `updateSession`, con `matcher` que excluye `_next/static`, `_next/image`, `favicon.ico` y assets de imagen. Verificar: `npm run dev` arranca sin advertencias de convención deprecada.
7. Verificación de conectividad read-only: desde un punto puntual (Server Component temporal o script), llamar a `(await createClient()).auth.getSession()` y confirmar que resuelve sin error de red/credenciales (sin consultar ninguna tabla). Verificar: la llamada responde `session: null` sin excepción.
8. `npm run lint` sobre `lib/supabase/*` y `proxy.ts`. Verificar: 0 errores/warnings.

## Criterios de aceptación

- [ ] `.env.local` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, y sigue ignorado por git.
- [ ] Existen `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts` y `proxy.ts` en la raíz del proyecto.
- [ ] `npx tsc --noEmit` no reporta errores nuevos atribuibles a estos archivos.
- [ ] `npm run lint` termina sin errores en los archivos nuevos.
- [ ] `npm run dev` arranca y las rutas existentes (`/`, `/juegos`, `/auth`, `/salon`) siguen cargando sin cambios visuales.
- [ ] Una llamada read-only (`auth.getSession()` o `auth.getUser()`) contra el proyecto Supabase configurado responde sin error de conexión/credenciales.
- [ ] `mcp__supabase__list_tables` (o `list_migrations`) muestra el mismo estado que antes de esta spec: sin tablas nuevas ni migraciones aplicadas.
- [ ] `components/auth-form.tsx` sigue sin llamar a Supabase (visual-only, sin cambios).

## Decisiones

- **Sí:** `proxy.ts` en vez de `middleware.ts`. Next 16 deprecó `middleware.ts` y lo renombró a `proxy.ts`; usar el nombre antiguo puede quedar sin ejecutarse.
- **Sí:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (clave publishable moderna) en vez de la legacy `anon` key JWT. Recomendada por Supabase para apps nuevas; rotación independiente de la `anon` key.
- **No:** usar la legacy `anon` key. Sigue funcionando pero Supabase la mantiene solo por compatibilidad.
- **Sí:** `cookies()` async en `lib/supabase/server.ts`. Es la API real de Next 16, no la síncrona de versiones antiguas.
- **Sí:** verificar la conexión con `auth.getSession()` en vez de un query a una tabla. No hay tablas en `public` y esta spec prohíbe crearlas.
- **No:** crear una tabla de prueba para validar la conexión. Contradice el requisito explícito de "conexión y configuración solo, sin escrituras".
- **Sí:** dejar fuera de esta spec la conexión de `components/auth-form.tsx` a Supabase Auth real. Es un cambio funcional de UI que merece su propia spec ("Auth real").
- **No:** proteger rutas por sesión en `proxy.ts`. Solo se refresca el token; bloquear rutas es una decisión de producto pendiente de spec futura.

## Riesgos

| Riesgo                                                                            | Mitigación                                                                                                                   |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Confundir `middleware.ts` con `proxy.ts` y que Next 16 ignore el archivo          | Verificar explícitamente el nombre `proxy.ts` y que `npm run dev` no advierte de convención deprecada.                       |
| Usar por error la clave `service_role` en el cliente browser                      | Solo se usan `NEXT_PUBLIC_SUPABASE_URL` y la clave publishable, obtenidas vía `get_publishable_keys` (nunca `service_role`). |
| Ejecutar sin querer una escritura o migración durante la verificación de conexión | La verificación usa solo `auth.getSession()`/`auth.getUser()`; no se usan `execute_sql` ni `apply_migration`.                |
| `.env.local` termina commiteado por error                                         | Ya está en `.gitignore` (`.env*`); se reconfirma en el paso 2 del plan.                                                      |

## Lo que **no** está en esta spec

- Crear, modificar o borrar tablas, esquemas, RLS o cualquier objeto de base de datos.
- Conectar `auth-form.tsx` a Supabase Auth real.
- Protección de rutas por sesión.
- Modelo de datos de negocio (juegos, puntuaciones, perfiles) contra Supabase.
- Login social funcional.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.