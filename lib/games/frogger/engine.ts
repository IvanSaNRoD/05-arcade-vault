// ── Constantes ────────────────────────────────────────────────────────────────
export const COLS = 16;
export const ROWS = 14;
export const CELL = 40; // px
export const CANVAS_W = COLS * CELL; // 640 — se escala con CSS al contenedor
export const CANVAS_H = ROWS * CELL; // 560

// Zonas (índice de fila, 0 = arriba)
const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID = 7;
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 12;
const ROW_START = 13;

// ── Tipos ─────────────────────────────────────────────────────────────────────
// "dead" no se usa en Frogger; se mantiene por contrato con player.tsx
export type FroggerPhase = "playing" | "dead" | "gameover" | "paused";

export interface FroggerState {
  score: number;
  lives: number;
  level: number;
  phase: FroggerPhase;
}

type Direction = "up" | "down" | "left" | "right";

interface Lane {
  row: number;
  speed: number;
  dir: 1 | -1;
  entities: Entity[];
}

interface Entity {
  col: number;
  width: number;
  type: "car" | "truck" | "log" | "turtle";
  submerged?: boolean;
}

interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  targetCol: number;
  targetRow: number;
}
