import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente sin cookies para lecturas públicas server-side (games, scores) que no
// dependen de sesión: única forma de leer datos dentro de generateStaticParams,
// que corre en build time sin contexto de request (lib/supabase/server.ts usa
// cookies() y falla ahí).
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    // Sin timeout, un Supabase que no contesta deja la página colgada; con él,
    // la query falla y lib/games.ts cae al catálogo local.
    {
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(5000) }),
      },
    },
  );
}
