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

const START_COL = COLS / 2 - 1; // columna central (16 columnas → 7)
const JUMP_MS = 120;
const MAX_DT_MS = 50; // evita saltos enormes tras cambiar de pestaña
const INITIAL_LIVES = 3;
const BASE_ROUND_MS = 15000;
const ROUND_MS_STEP = 1000; // −1 s por nivel…
const MIN_ROUND_MS = 8000; // …hasta un mínimo de 8 s
const PTS_ROW = 10;
// Bocas destino: 5 bocas de 2 columnas, separadas por 1 columna de seto
const GOAL_COLS = [1, 4, 7, 10, 13];
const GOAL_WIDTH = 2;

const KEY_DIRS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};
const DIR_DELTA: Record<Direction, { dc: number; dr: number }> = {
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
};
// Teclas que el navegador desplazaría por defecto y que el juego consume.
const SCROLL_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"]);

const CAR_COLORS: Record<number, string> = { 9: "#ffd23f", 10: "#3fa9ff", 12: "#ff4d5e" };

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
  diveOffset?: number; // ms; solo grupos de tortugas que se sumergen (desfase de su ciclo)
}

interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  targetCol: number;
  targetRow: number;
}

// ── Carriles ──────────────────────────────────────────────────────────────────
// Longitud del bucle horizontal (celdas): las entidades se colocan en [0, LANE_SPAN)
// y al salir por un borde se desplazan ±LANE_SPAN, conservando los huecos entre ellas.
const LANE_SPAN = COLS + 4;
const LEVEL_SPEEDUP = 1.15; // +15 % de velocidad por nivel
const TURTLE_UP_MS = 3000;
const TURTLE_DOWN_MS = 1500;
const TURTLE_CYCLE_MS = TURTLE_UP_MS + TURTLE_DOWN_MS;

interface LaneTemplate {
  row: number;
  speed: number; // px/frame a nivel 1
  dir: 1 | -1;
  type: Entity["type"];
  width: number;
  cols: number[]; // columna inicial de cada entidad
  divers?: number[]; // índices (en cols) de los grupos de tortugas que se sumergen
}

const LANE_TEMPLATES: LaneTemplate[] = [
  // Río (filas 1–6): troncos de 2–4 celdas y tortugas en grupos de 2–3
  { row: 1, speed: 2.5, dir: 1, type: "log", width: 3, cols: [0, 7, 14] },
  { row: 2, speed: 2.0, dir: 1, type: "log", width: 2, cols: [0, 5, 10, 15] },
  { row: 3, speed: 1.5, dir: -1, type: "turtle", width: 2, cols: [0, 4, 8, 12, 16], divers: [2] },
  { row: 4, speed: 3.0, dir: 1, type: "log", width: 4, cols: [0, 7, 14] },
  { row: 5, speed: 1.0, dir: 1, type: "log", width: 3, cols: [0, 7, 14] },
  { row: 6, speed: 1.2, dir: -1, type: "turtle", width: 3, cols: [0, 5, 10, 15], divers: [1] },
  // Carretera (filas 8–12): coches de 1 celda y camiones de 2–3, sentidos alternos
  { row: 8, speed: 1.8, dir: -1, type: "truck", width: 3, cols: [0, 10] },
  { row: 9, speed: 4.0, dir: 1, type: "car", width: 1, cols: [0, 10] },
  { row: 10, speed: 2.5, dir: -1, type: "car", width: 1, cols: [2, 9, 16] },
  { row: 11, speed: 2.0, dir: 1, type: "truck", width: 2, cols: [0, 7, 14] },
  { row: 12, speed: 1.5, dir: -1, type: "car", width: 1, cols: [0, 5, 10, 15] },
];

function buildLanes(level: number): Lane[] {
  const mult = LEVEL_SPEEDUP ** (level - 1);
  return LANE_TEMPLATES.map((t) => ({
    row: t.row,
    speed: t.speed * mult,
    dir: t.dir,
    entities: t.cols.map((col, i) => ({
      col,
      width: t.width,
      type: t.type,
      ...(t.divers?.includes(i) && {
        submerged: false,
        // desfase distinto por grupo para que no se sumerjan a la vez
        diveOffset: (i * TURTLE_CYCLE_MS) / t.cols.length,
      }),
    })),
  }));
}
