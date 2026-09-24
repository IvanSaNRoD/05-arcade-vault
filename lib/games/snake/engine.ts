import { FRUIT_SPRITES, FruitSheet, type FruitName } from "./sprites";

// ── Constantes ────────────────────────────────────────────────────────────────
export const W = 800;
export const H = 600;
export const CELL = 20;
export const COLS = 40; // W / CELL
export const ROWS = 30; // H / CELL
export const BASE_TICK_MS = 150;
export const TICK_STEP_MS = 10;
export const MIN_TICK_MS = 60;
export const FRUITS_PER_LEVEL = 5;
export const INITIAL_LENGTH = 3;

const FRUIT_NAMES = Object.keys(FRUIT_SPRITES) as FruitName[];
const MAX_QUEUED_TURNS = 2;
// Teclas que el navegador desplazaría por defecto (flechas y espacio) y que el juego consume.
const SCROLL_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"]);

// ── Tipos ─────────────────────────────────────────────────────────────────────
// "dead" no se usa en Snake; se mantiene por contrato con player.tsx
export type SnakePhase = "playing" | "dead" | "gameover" | "paused";

export interface SnakeState {
  score: number;
  lives: number; // longitud de la serpiente (HUD: "Longitud")
  level: number;
  phase: SnakePhase;
}

type Dir = { x: -1 | 0 | 1; y: -1 | 0 | 1 };
type Cell = { x: number; y: number }; // coordenadas de grid, no px

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
};

// ── SnakeEngine ───────────────────────────────────────────────────────────────
export class SnakeEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onStateChange: (state: SnakeState) => void;
  private sheet = new FruitSheet();

  private snake: Cell[] = []; // snake[0] = cabeza
  private dir: Dir = { x: 1, y: 0 };
  private dirQueue: Dir[] = [];
  private fruit: Cell = { x: 0, y: 0 };
  private fruitName: FruitName = FRUIT_NAMES[0];
  private fruitsEaten = 0;

  private score = 0;
  private level = 1;
  private state: "playing" | "gameover" = "playing";
  private paused = false;

  private acc = 0; // ms acumulados hacia el próximo tick
  private lastTime: number | null = null;
  private rafId: number | null = null;

  constructor(canvas: HTMLCanvasElement, onStateChange: (state: SnakeState) => void) {
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
    if (!d || this.dirQueue.length >= MAX_QUEUED_TURNS) return;
    // Se valida contra la última dirección encolada: ni repetir ni girar 180°.
    const last = this.dirQueue[this.dirQueue.length - 1] ?? this.dir;
    if ((d.x === last.x && d.y === last.y) || (d.x === -last.x && d.y === -last.y)) return;
    this.dirQueue.push(d);
  };

  private emitState() {
    this.onStateChange({
      score: this.score,
      lives: this.snake.length,
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
      const dt = this.lastTime === null ? 0 : Math.min((ts - this.lastTime) / 1000, 0.05);
      this.lastTime = ts;
      if (!this.paused) this.update(dt);
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

  /** Reinicia una partida nueva (nivel 1, longitud 3, score 0) sin re-registrar listeners. */
  restart() {
    this.reset();
    this.emitState();
  }

  /** Estado inicial: serpiente de INITIAL_LENGTH en el centro mirando a la derecha, nivel 1, score 0. */
  private reset() {
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    this.snake = Array.from({ length: INITIAL_LENGTH }, (_, i) => ({ x: cx - i, y: cy }));
    this.dir = { x: 1, y: 0 };
    this.dirQueue = [];
    this.fruitsEaten = 0;
    this.score = 0;
    this.level = 1;
    this.state = "playing";
    this.paused = false;
    this.acc = 0;
    this.lastTime = null;
    this.spawnFruit();
  }

  private tickMs() {
    return Math.max(MIN_TICK_MS, BASE_TICK_MS - (this.level - 1) * TICK_STEP_MS);
  }

  /** Acumula dt (s) y avanza un paso por cada tickMs transcurrido. */
  private update(dt: number) {
    this.acc += dt * 1000;
    while (this.state === "playing" && this.acc >= this.tickMs()) {
      this.acc -= this.tickMs();
      this.step();
    }
  }

  /** Un paso de la serpiente: giro encolado, movimiento, colisiones y fruta. */
  private step() {
    const turn = this.dirQueue.shift();
    if (turn) this.dir = turn;

    const head = this.snake[0];
    const next = { x: head.x + this.dir.x, y: head.y + this.dir.y };

    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      this.state = "gameover";
      return;
    }

    const eating = next.x === this.fruit.x && next.y === this.fruit.y;
    // Sin comer, la cola se mueve este paso: su celda actual queda libre.
    const body = eating ? this.snake : this.snake.slice(0, -1);
    if (body.some((c) => c.x === next.x && c.y === next.y)) {
      this.state = "gameover";
      return;
    }

    this.snake.unshift(next);
    if (!eating) {
      this.snake.pop();
      return;
    }

    this.score += 10 * this.level;
    this.fruitsEaten++;
    if (this.fruitsEaten % FRUITS_PER_LEVEL === 0) this.level++;
    if (!this.spawnFruit()) this.state = "gameover";
  }

  /** Fondo, fruta y serpiente. Sin HUD ni overlays: los pone player.tsx. */
  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#0a0a18";
    ctx.fillRect(0, 0, W, H);

    ctx.imageSmoothingEnabled = false; // pixel-art nítido al escalar a 20 px
    this.sheet.draw(ctx, this.fruitName, this.fruit.x * CELL, this.fruit.y * CELL, CELL);

    this.snake.forEach((c, i) => {
      ctx.fillStyle = i === 0 ? "#7dffb0" : "#1fd07a";
      ctx.fillRect(c.x * CELL + 1, c.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }

  /** Coloca la fruta en una celda libre aleatoria. Devuelve false si el tablero está lleno. */
  private spawnFruit(): boolean {
    const occupied = new Set(this.snake.map((c) => c.y * COLS + c.x));
    const free: number[] = [];
    for (let i = 0; i < COLS * ROWS; i++) if (!occupied.has(i)) free.push(i);
    if (free.length === 0) return false;
    const idx = free[Math.floor(Math.random() * free.length)];
    this.fruit = { x: idx % COLS, y: Math.floor(idx / COLS) };
    this.fruitName = FRUIT_NAMES[Math.floor(Math.random() * FRUIT_NAMES.length)];
    return true;
  }
}
