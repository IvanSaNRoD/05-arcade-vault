import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Canjea el ?code= de Supabase (OAuth, confirmación de email, recuperación) por
// una sesión en cookies y redirige a `next`.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  // Solo rutas internas: "//host" sería una redirección a otro dominio.
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/juegos";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(target);
  }

  redirect("/auth?error=enlace");
}
