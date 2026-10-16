"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface SessionUser {
  id: string;
  username: string;
}

// Usuario de la sesión para pintar UI (nav, player). Lee la cookie en cliente para
// que el layout no lea cookies y las páginas sigan siendo estáticas/ISR (SPEC 14).
// No sirve para decisiones de seguridad: esas usan getUser() en servidor.
export function useUser(): SessionUser | null {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  // id de la sesión ya resuelta: evita repetir la consulta a profiles en cada navegación.
  const idRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const sync = async (id: string | null) => {
      if (id === idRef.current) return;
      idRef.current = id;
      if (!id) {
        setUser(null);
        return;
      }
      const { data } = await supabase.from("profiles").select("username").eq("id", id).maybeSingle();
      // Otra sesión pudo resolverse mientras tanto.
      if (idRef.current === id) setUser(data ? { id, username: data.username } : null);
    };

    // Las server actions de login/logout fijan cookies y redirigen: la navegación
    // vuelve a ejecutar este efecto y getSession() (lectura local, sin red) las ve.
    void supabase.auth.getSession().then(({ data }) => sync(data.session?.user.id ?? null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Diferido: llamar a Supabase dentro del callback puede bloquear el cliente.
      setTimeout(() => void sync(session?.user.id ?? null), 0);
    });

    return () => subscription.unsubscribe();
  }, [pathname]);

  return user;
}
