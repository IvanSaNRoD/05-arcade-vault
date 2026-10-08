import type { SkinId, SkinPalette } from "@/lib/games/skins";

export interface TetrisPalette extends SkinPalette {
  grid: string | null; // null = sin grid
  frame: string | null; // borde del tablero; null = sin borde
  pieces: readonly (string | null)[]; // índice 0 = null, 1..8 = I O T S Z J L N
  highlight: string | null; // banda superior de 4 px del bloque
  label: string; // texto "SIGUIENTE"
  previewBorder: string;
}

export const TETRIS_SKINS: Record<SkinId, TetrisPalette> = {
  clasico: {
    id: "clasico",
    background: "#1a1a25",
    glow: 0,
    grid: "#22222e",
    frame: null,
    pieces: [
      null,
      "#4dd0e1", // I
      "#ffd54f", // O
      "#ba68c8", // T
      "#81c784", // S
      "#e57373", // Z
      "#90caf9", // J
      "#ffb74d", // L
      "#9e9e9e", // N (tuerca)
    ],
    highlight: "rgba(255,255,255,0.12)",
    label: "rgba(255,255,255,0.65)",
    previewBorder: "#22222e",
  },
  neon: {
    id: "neon",
    background: "#0a0a0f",
    glow: 10,
    grid: "#4a4f70",
    frame: null,
    pieces: [
      null,
      "#00f5ff", // I
      "#f5ff00", // O
      "#ff006e", // T
      "#00ff88", // S
      "#ff006e", // Z
      "#00f5ff", // J
      "#f5ff00", // L
      "#e6e9ff", // N
    ],
    highlight: null,
    label: "#8a8fb5",
    previewBorder: "#4a4f70",
  },
  retro: {
    id: "retro",
    background: "#000000",
    glow: 0,
    grid: null,
    frame: "#7c7c7c",
    pieces: [
      null,
      "#fcfcfc", // I
      "#fcfcfc", // O
      "#fcfcfc", // T
      "#0058f8", // S
      "#3cbcfc", // Z
      "#0058f8", // J
      "#3cbcfc", // L
      "#fcfcfc", // N
    ],
    highlight: null,
    label: "#fcfcfc",
    previewBorder: "#7c7c7c",
  },
};
