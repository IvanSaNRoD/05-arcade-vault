import type { SkinId, SkinPalette } from "@/lib/games/skins";

export interface AsteroidsPalette extends SkinPalette {
  ship: string;
  thruster: string;
  asteroid: string;
  bullet: string;
  powerUp: string; // rombo
  powerUpText: string; // "3x"
  particle: string;
  overlayTitle: string; // "GAME OVER"
  overlaySub: string; // "PUNTAJE: … — ESPACIO PARA REINICIAR"
  lineWidth: number; // nave y asteroides
}

export const ASTEROIDS_SKINS: Record<SkinId, AsteroidsPalette> = {
  clasico: {
    id: "clasico",
    background: "#000",
    glow: 0,
    ship: "#fff",
    thruster: "rgba(255, 130, 0, 0.85)",
    asteroid: "#fff",
    bullet: "#fff",
    powerUp: "#0ff",
    powerUpText: "#0ff",
    particle: "#fff",
    overlayTitle: "#fff",
    overlaySub: "rgba(255,255,255,0.65)",
    lineWidth: 1.5,
  },
  neon: {
    id: "neon",
    background: "#0a0a0f",
    glow: 12,
    ship: "#00f5ff",
    thruster: "#f5ff00",
    asteroid: "#ff006e",
    bullet: "#f5ff00",
    powerUp: "#00ff88",
    powerUpText: "#00ff88",
    particle: "#e6e9ff",
    overlayTitle: "#e6e9ff",
    overlaySub: "#8a8fb5",
    lineWidth: 2,
  },
  retro: {
    id: "retro",
    background: "#000000",
    glow: 0,
    ship: "#55ffff",
    thruster: "#ff5555",
    asteroid: "#ff55ff",
    bullet: "#ffffff",
    powerUp: "#ffff55",
    powerUpText: "#ffff55",
    particle: "#aaaaaa",
    overlayTitle: "#ffffff",
    overlaySub: "#aaaaaa",
    lineWidth: 2,
  },
};
