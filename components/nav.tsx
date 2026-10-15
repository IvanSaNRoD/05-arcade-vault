"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/actions/auth";
import { useUser } from "@/lib/hooks/use-user";
import { createClient } from "@/lib/supabase/client";

// signOut (server) borra las cookies y redirige a "/". Si ya estábamos en "/" la ruta
// no cambia y useUser() no se enteraría: el signOut local emite SIGNED_OUT.
async function logout() {
  try {
    await signOut();
  } finally {
    await createClient().auth.signOut({ scope: "local" });
  }
}

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const user = useUser();

  const isHome = pathname === "/";
  const isLibrary = pathname.startsWith("/juegos");
  const isAbout = pathname === "/acerca-de";
  const isHall = pathname.startsWith("/salon");
  const isAuth = pathname.startsWith("/auth");
  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark" />
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isHome ? "active" : ""}>
            Inicio
          </Link>
          <Link href="/juegos" className={isLibrary ? "active" : ""}>
            Biblioteca
          </Link>
          <Link href="/acerca-de" className={isAbout ? "active" : ""}>
            Acerca de
          </Link>
          <Link href="/salon" className={isHall ? "active" : ""}>
            Salón de la Fama
          </Link>
        </div>
        <div className="spacer" />
        <div className="coin-counter">
          <span className="coin" />
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <div className="auth-btn flex items-center gap-3">
            <span className="pixel neon-cyan text-[10px]">{user.username}</span>
            <form action={logout}>
              <button className="btn ghost" type="submit">
                Salir
              </button>
            </form>
          </div>
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        {/* "≡" is outside Press Start 2P subsets; next/font's metric fallback renders it wider than the template's system-ui. */}
        <button
          className="btn ghost hamburger font-[system-ui]"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      />
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan mb-4 text-[11px]">MENÚ</div>
        <Link href="/" className={isHome ? "active" : ""} onClick={close}>
          Inicio
        </Link>
        <Link
          href="/juegos"
          className={isLibrary ? "active" : ""}
          onClick={close}
        >
          Biblioteca
        </Link>
        <Link
          href="/acerca-de"
          className={isAbout ? "active" : ""}
          onClick={close}
        >
          Acerca de
        </Link>
        <Link href="/salon" className={isHall ? "active" : ""} onClick={close}>
          Salón de la Fama
        </Link>
        {user ? (
          <form
            action={logout}
            className="mt-2 flex items-center justify-between gap-3 px-3"
          >
            <span className="pixel neon-cyan text-[11px]">{user.username}</span>
            <button className="btn ghost" type="submit" onClick={close}>
              Salir
            </button>
          </form>
        ) : (
          <Link href="/auth" className={isAuth ? "active" : ""} onClick={close}>
            Iniciar Sesión
          </Link>
        )}
        <div className="flex-1" />
        <div className="pixel text-[9px] tracking-[0.16em] text-ink-faint">
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
