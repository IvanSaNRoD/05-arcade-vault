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
