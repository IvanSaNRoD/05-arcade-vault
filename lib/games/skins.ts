export type SkinId = "clasico" | "neon" | "retro";
export const SKIN_IDS: readonly SkinId[] = ["clasico", "neon", "retro"];
export const DEFAULT_SKIN: SkinId = "clasico";
export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};
export const SKIN_STORAGE_KEY = "arcade-vault:skin";

/** Base común: cada juego la extiende con sus roles. */
export interface SkinPalette {
  id: SkinId;
  background: string; // fondo del canvas
  glow: number; // shadowBlur de elementos; 0 = sin glow
}

export function isSkinId(v: unknown): v is SkinId {
  return typeof v === "string" && (SKIN_IDS as readonly string[]).includes(v);
}

export function readStoredSkin(): SkinId {
  if (typeof window === "undefined") return DEFAULT_SKIN;
  try {
    const v = window.localStorage.getItem(SKIN_STORAGE_KEY);
    return isSkinId(v) ? v : DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}

export function writeStoredSkin(id: SkinId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SKIN_STORAGE_KEY, id);
  } catch {
    // localStorage bloqueado: la skin solo vive en el motor
  }
  window.dispatchEvent(new Event(SKIN_STORAGE_KEY));
}

export function subscribeSkin(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === SKIN_STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(SKIN_STORAGE_KEY, cb);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SKIN_STORAGE_KEY, cb);
  };
}
