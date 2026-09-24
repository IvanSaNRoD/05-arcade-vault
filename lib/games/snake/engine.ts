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
