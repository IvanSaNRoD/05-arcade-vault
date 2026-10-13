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
const PTS_GOAL = 50;
const PTS_TIME_PER_S = 10; // bonus por segundo restante al ocupar una boca
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

function roundMs(level: number) {
  return Math.max(MIN_ROUND_MS, BASE_ROUND_MS - (level - 1) * ROUND_MS_STEP);
}

// ── Colisiones y soporte ──────────────────────────────────────────────────────
// La rana ocupa la celda donde está su centro (su col puede ser fraccionaria al ir sobre un tronco).
function covers(e: Entity, frog: Frog) {
  const c = frog.col + 0.5;
  return c >= e.col && c < e.col + e.width;
}

function isRiverRow(row: number) {
  return row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT;
}

function isRoadRow(row: number) {
  return row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT;
}

function checkRoadCollision(frog: Frog, lanes: Lane[]): boolean {
  return lanes.some(
    (lane) =>
      isRoadRow(lane.row) && lane.row === frog.row && lane.entities.some((e) => covers(e, frog)),
  );
}

/** Tronco o tortuga visible bajo la rana; null si está en el agua (o la tortuga se sumergió). */
function getSupport(frog: Frog, lanes: Lane[]): { lane: Lane; entity: Entity } | null {
  const lane = lanes.find((l) => isRiverRow(l.row) && l.row === frog.row);
  const entity = lane?.entities.find((e) => covers(e, frog));
  if (!lane || !entity || entity.submerged) return null;
  return { lane, entity };
}

/** Índice de la boca libre bajo la rana; null si es seto o una boca ya ocupada (muerte). */
function checkGoal(frog: Frog, goals: boolean[]): number | null {
  if (frog.row !== ROW_GOALS) return null;
  const c = frog.col + 0.5;
  const i = GOAL_COLS.findIndex((gc) => c >= gc && c < gc + GOAL_WIDTH);
  if (i === -1 || goals[i]) return null;
  return i;
}

// ── FroggerEngine ─────────────────────────────────────────────────────────────
export class FroggerEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onStateChange: (state: FroggerState) => void;

  private lanes: Lane[] = [];
  private frog: Frog = this.newFrog();
  private pendingDir: Direction | null = null;
  private goals: boolean[] = [];
  private bestRow = ROW_START; // fila más alta alcanzada en este trayecto (puntos por avance)

  private score = 0;
  private lives = INITIAL_LIVES;
  private level = 1;
  private timeLeft = BASE_ROUND_MS; // ms
  private clock = 0; // ms de juego transcurridos (ciclo de las tortugas)
  private state: "playing" | "gameover" = "playing";
  private paused = false;

  private lastTime: number | null = null;
  private rafId: number | null = null;

  constructor(canvas: HTMLCanvasElement, onStateChange: (state: FroggerState) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
    this.ctx = ctx;
    this.onStateChange = onStateChange;
    this.reset();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (SCROLL_KEYS.has(e.code)) e.preventDefault();

    if (e.code === "KeyP" || e.code === "Escape") {
      if (this.state === "gameover") return;
      if (this.paused) this.resume();
      else this.pause();
      return;
    }

    if (this.paused || this.state === "gameover") return;
    const d = KEY_DIRS[e.code];
    if (d) this.pendingDir = d;
  };

  private emitState() {
    this.onStateChange({
      score: this.score,
      lives: this.lives,
      level: this.level,
      phase: this.paused ? "paused" : this.state,
    });
  }

  /** Arranca el loop de juego y registra el listener de teclado. Idempotente. */
  start() {
    if (this.rafId !== null) return;
    window.addEventListener("keydown", this.handleKeyDown);
    this.lastTime = null;

    const loop = (ts: number) => {
      const dt = this.lastTime === null ? 0 : Math.min(ts - this.lastTime, MAX_DT_MS);
      this.lastTime = ts;
      if (!this.paused && this.state === "playing") this.update(dt);
      this.draw();
      this.emitState();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /** Cancela el loop y remueve el listener de teclado. Seguro de llamar más de una vez. */
  destroy() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  /** Congela la simulación sin perder el estado; el último frame sigue visible. */
  pause() {
    this.paused = true;
    this.emitState();
  }

  /** Reanuda la simulación desde donde quedó. */
  resume() {
    this.paused = false;
    this.emitState();
  }

  /** Fuerza el fin de la partida con el score actual. */
  forceGameOver() {
    this.state = "gameover";
    this.emitState();
  }

  /** Reinicia una partida nueva (nivel 1, 3 vidas, score 0) sin re-registrar listeners. */
  restart() {
    this.reset();
    this.emitState();
  }

  private reset() {
    this.score = 0;
    this.lives = INITIAL_LIVES;
    this.level = 1;
    this.lanes = buildLanes(this.level);
    this.goals = GOAL_COLS.map(() => false);
    this.clock = 0;
    this.state = "playing";
    this.paused = false;
    this.lastTime = null;
    this.resetFrog();
  }

  private newFrog(): Frog {
    return {
      col: START_COL,
      row: ROW_START,
      animating: false,
      animT: 0,
      targetCol: START_COL,
      targetRow: ROW_START,
    };
  }

  /** Rana a la fila de inicio, columna central, con el temporizador lleno. */
  private resetFrog() {
    this.frog = this.newFrog();
    this.pendingDir = null;
    this.bestRow = ROW_START;
    this.timeLeft = roundMs(this.level);
  }

  private update(dt: number) {
    this.clock += dt;

    // Entidades: avance horizontal en bucle y ciclo de inmersión de las tortugas
    for (const lane of this.lanes) {
      const step = ((lane.speed / CELL) * lane.dir * dt) / 16;
      for (const e of lane.entities) {
        e.col += step;
        if (lane.dir > 0 && e.col >= COLS) e.col -= LANE_SPAN;
        if (lane.dir < 0 && e.col + e.width <= 0) e.col += LANE_SPAN;
        if (e.diveOffset !== undefined) {
          e.submerged = (this.clock + e.diveOffset) % TURTLE_CYCLE_MS >= TURTLE_UP_MS;
        }
      }
    }

    const frog = this.frog;
    if (!frog.animating && this.pendingDir) {
      const { dc, dr } = DIR_DELTA[this.pendingDir];
      this.pendingDir = null;
      const targetCol = frog.col + dc;
      const targetRow = frog.row + dr;
      // No se puede saltar fuera del tablero
      if (targetCol >= 0 && targetCol <= COLS - 1 && targetRow >= 0 && targetRow < ROWS) {
        frog.animating = true;
        frog.animT = 0;
        frog.targetCol = targetCol;
        frog.targetRow = targetRow;
      }
    }

    if (frog.animating) {
      frog.animT += dt;
      if (frog.animT >= JUMP_MS) {
        frog.col = frog.targetCol;
        frog.row = frog.targetRow;
        frog.animating = false;
        if (!this.land()) return;
      }
    }

    if (!frog.animating) {
      // Carretera: un vehículo alcanza a la rana
      if (checkRoadCollision(frog, this.lanes)) return this.killFrog();
      // Río: sin apoyo se ahoga; con apoyo, el tronco/tortuga la arrastra
      if (isRiverRow(frog.row)) {
        const support = getSupport(frog, this.lanes);
        if (!support) return this.killFrog();
        frog.col += ((support.lane.speed / CELL) * support.lane.dir * dt) / 16;
        frog.targetCol = frog.col;
        // Arrastrada fuera del tablero por un borde lateral
        if (frog.col + 0.5 < 0 || frog.col + 0.5 > COLS) return this.killFrog();
      }
    }

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) this.killFrog();
  }

  /**
   * Lógica de la celda destino tras completar un salto: puntos por avance y bocas destino.
   * Devuelve false si la rana murió o se reinició (el resto del frame no aplica).
   */
  private land(): boolean {
    if (this.frog.row < this.bestRow) {
      this.score += PTS_ROW * (this.bestRow - this.frog.row);
      this.bestRow = this.frog.row;
    }
    if (this.frog.row !== ROW_GOALS) return true;

    const goal = checkGoal(this.frog, this.goals);
    if (goal === null) {
      this.killFrog();
      return false;
    }
    this.goals[goal] = true;
    this.score += PTS_GOAL + Math.floor(this.timeLeft / 1000) * PTS_TIME_PER_S;
    if (this.goals.every(Boolean)) this.completeRound();
    else this.resetFrog();
    return false;
  }

  /** Paso 6: ronda completada. De momento solo reinicia la rana. */
  private completeRound() {
    this.resetFrog();
  }

  /** Paso 7: gestión completa de la muerte. De momento solo reinicia la rana. */
  private killFrog() {
    this.resetFrog();
  }

  // ── Dibujo ──────────────────────────────────────────────────────────────────
  draw() {
    const ctx = this.ctx;

    // Fondo por zonas
    ctx.fillStyle = "#000000"; // carretera
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#06123a"; // río
    ctx.fillRect(0, ROW_RIVER_TOP * CELL, CANVAS_W, (ROW_RIVER_BOT - ROW_RIVER_TOP + 1) * CELL);
    ctx.fillStyle = "#0f3d1c"; // filas seguras
    ctx.fillRect(0, ROW_SAFE_MID * CELL, CANVAS_W, CELL);
    ctx.fillRect(0, ROW_START * CELL, CANVAS_W, CELL);
    ctx.fillStyle = "#3fa34d"; // fila de metas
    ctx.fillRect(0, ROW_GOALS * CELL, CANVAS_W, CELL);
    // Marcas discontinuas entre carriles de carretera
    ctx.fillStyle = "#3a3a3a";
    for (let r = ROW_ROAD_TOP + 1; r <= ROW_ROAD_BOT; r++) {
      for (let x = 8; x < CANVAS_W; x += 40) ctx.fillRect(x, r * CELL - 1, 20, 2);
    }

    this.drawGoals();
    for (const lane of this.lanes) {
      for (const e of lane.entities) this.drawEntity(e, lane);
    }
    this.drawFrog();
    this.drawHud();
  }

  private drawGoals() {
    const ctx = this.ctx;
    GOAL_COLS.forEach((col, i) => {
      const x = col * CELL;
      const y = ROW_GOALS * CELL + 22; // la franja superior la ocupa el HUD
      const w = GOAL_WIDTH * CELL;
      const h = CELL - 22;
      ctx.fillStyle = "#0b2e14";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#e6b422";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      if (this.goals[i]) this.drawFrogShape(x + w / 2, y + h / 2, 0.55, false);
    });
  }

  private drawEntity(e: Entity, lane: Lane) {
    const ctx = this.ctx;
    const x = e.col * CELL;
    const y = lane.row * CELL;
    const w = e.width * CELL;

    if (e.type === "car") {
      ctx.fillStyle = CAR_COLORS[lane.row] ?? "#ff4d5e";
      ctx.fillRect(x + 4, y + 10, w - 8, CELL - 20);
      ctx.fillStyle = "#cfe8ff"; // parabrisas hacia el sentido de la marcha
      const wx = lane.dir > 0 ? x + w - 14 : x + 8;
      ctx.fillRect(wx, y + 13, 6, CELL - 26);
      ctx.fillStyle = "#111";
      for (const [cx, cy] of [
        [x + 10, y + 9],
        [x + w - 10, y + 9],
        [x + 10, y + CELL - 9],
        [x + w - 10, y + CELL - 9],
      ]) {
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e.type === "truck") {
      ctx.fillStyle = "#9aa0a6"; // remolque
      ctx.fillRect(x + 2, y + 7, w - 4, CELL - 14);
      ctx.fillStyle = "#ff8c1a"; // cabina, delante según el sentido
      const cx = lane.dir > 0 ? x + w - 16 : x + 2;
      ctx.fillRect(cx, y + 9, 14, CELL - 18);
    } else if (e.type === "log") {
      ctx.fillStyle = "#7a4a1f";
      ctx.fillRect(x + 2, y + 6, w - 4, CELL - 12);
      ctx.strokeStyle = "#4e2e10";
      ctx.lineWidth = 2;
      for (let lx = x + 12; lx < x + w - 8; lx += 16) {
        ctx.beginPath();
        ctx.moveTo(lx, y + 12);
        ctx.lineTo(lx + 8, y + 12);
        ctx.moveTo(lx + 4, y + CELL - 13);
        ctx.lineTo(lx + 12, y + CELL - 13);
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < e.width; i++) {
        const cx = x + i * CELL + CELL / 2;
        const cy = y + CELL / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 15, 0, Math.PI * 2);
        if (e.submerged) {
          ctx.strokeStyle = "rgba(46, 204, 113, 0.45)";
          ctx.lineWidth = 2;
          ctx.stroke();
          continue;
        }
        ctx.fillStyle = "#2ecc71";
        ctx.fill();
        ctx.strokeStyle = "#145a32"; // escamas
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.moveTo(cx - 15, cy);
        ctx.lineTo(cx + 15, cy);
        ctx.moveTo(cx, cy - 15);
        ctx.lineTo(cx, cy + 15);
        ctx.stroke();
      }
    }
  }

  private drawFrog() {
    const f = this.frog;
    const p = f.animating ? Math.min(f.animT / JUMP_MS, 1) : 0;
    const col = f.col + (f.targetCol - f.col) * p;
    const row = f.row + (f.targetRow - f.row) * p;
    this.drawFrogShape(col * CELL + CELL / 2, row * CELL + CELL / 2, 1, f.animating);
  }

  /** Rana centrada en (cx, cy): cuerpo 28×24, ojos y patas (extendidas al saltar). */
  private drawFrogShape(cx: number, cy: number, scale: number, jumping: boolean) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.strokeStyle = "#39ff14";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    const reach = jumping ? 18 : 13;
    ctx.beginPath();
    for (const sx of [-1, 1]) {
      ctx.moveTo(sx * 8, -6);
      ctx.lineTo(sx * reach, -reach + 2);
      ctx.moveTo(sx * 8, 7);
      ctx.lineTo(sx * reach, reach - 2);
    }
    ctx.stroke();

    ctx.fillStyle = "#39ff14";
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    for (const sx of [-1, 1]) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sx * 6, -8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(sx * 6, -9, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** HUD interno en la franja superior de la fila 0: score, nivel, vidas y barra de tiempo. */
  private drawHud() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, CANVAS_W, 22);

    ctx.font = "bold 16px monospace";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText(String(this.score).padStart(5, "0"), 8, 1);
    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${this.level}`, CANVAS_W / 2, 1);

    ctx.fillStyle = "#39ff14";
    for (let i = 0; i < this.lives; i++) {
      ctx.beginPath();
      ctx.arc(CANVAS_W - 14 - i * 18, 9, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Barra de tiempo: verde → amarillo → rojo
    const frac = Math.max(0, this.timeLeft) / roundMs(this.level);
    ctx.fillStyle = frac > 0.5 ? "#39ff14" : frac > 0.25 ? "#ffd23f" : "#ff4d5e";
    ctx.fillRect(0, 18, CANVAS_W * frac, 4);
  }
}
