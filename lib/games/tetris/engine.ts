// Ported from references/resources/started-games/03-tetris/game.js
// Behavior kept identical to the original; only adapted to avoid module-level
// mutable state (board/current/next become TetrisEngine instance fields).

export const W = 800;
export const H = 600;

// ── Constants ─────────────────────────────────────────────────────────────────
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
export const BOARD_X = (W - COLS * BLOCK) / 2; // 250
export const BOARD_Y = 0;

// Preview "SIGUIENTE": caja de 120×120 (bloques de 30) a la derecha del tablero.
const PREVIEW_SIZE = 120;
const PREVIEW_BLOCK = 30;
const PREVIEW_X = BOARD_X + COLS * BLOCK + 60;
const PREVIEW_Y = 60;

// Tema oscuro fijo del prototipo (sin getComputedStyle).
const BG_COLOR = "#1a1a25";
const GRID_COLOR = "#22222e";

export const COLORS = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
];

export const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

export const LINE_SCORES = [0, 100, 300, 500, 800];

// ── Tipos ─────────────────────────────────────────────────────────────────────
export type Board = number[][];

export interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}

// "dead" no se usa en Tetris; se mantiene por contrato con player.tsx
export type TetrisPhase = "playing" | "dead" | "gameover" | "paused";

export interface TetrisState {
  score: number;
  lives: number; // = líneas completadas
  level: number; // floor(lines / 10) + 1
  phase: TetrisPhase;
}

// ── Funciones puras ─────────────────────────────────────────────────────────────
export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

export function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type]!.map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

export function collide(board: Board, shape: number[][], ox: number, oy: number) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

export function rotateCW(shape: number[][]) {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

const WALL_KICKS = [0, -1, 1, -2, 2];

// ── TetrisEngine ──────────────────────────────────────────────────────────────
export class TetrisEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onStateChange: (state: TetrisState) => void;

  private board: Board = createBoard();
  private current: Piece = randomPiece();
  private next: Piece = randomPiece();

  private score = 0;
  private lines = 0;
  private level = 1;
  private paused = false;
  private gameOver = false;

  private lastTime: number | null = null;
  private dropAccum = 0;
  private dropInterval = 1000;
  private rafId: number | null = null;

  constructor(canvas: HTMLCanvasElement, onStateChange: (state: TetrisState) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
    this.ctx = ctx;
    this.onStateChange = onStateChange;
    this.init();
  }

  private init() {
    this.board = createBoard();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.paused = false;
    this.gameOver = false;
    this.dropInterval = 1000;
    this.dropAccum = 0;
    this.lastTime = null;
    this.next = randomPiece();
    this.spawn();
  }

  private tryRotate() {
    const rotated = rotateCW(this.current.shape);
    for (const kick of WALL_KICKS) {
      if (!collide(this.board, rotated, this.current.x + kick, this.current.y)) {
        this.current.shape = rotated;
        this.current.x += kick;
        return;
      }
    }
  }

  private merge() {
    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        if (this.current.shape[r][c])
          this.board[this.current.y + r][this.current.x + c] = this.current.shape[r][c];
  }

  private clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.board[r].every((v) => v !== 0)) {
        this.board.splice(r, 1);
        this.board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      this.lines += cleared;
      this.score += (LINE_SCORES[cleared] || 0) * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
      this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 90);
    }
  }

  private ghostY() {
    let gy = this.current.y;
    while (!collide(this.board, this.current.shape, this.current.x, gy + 1)) gy++;
    return gy;
  }

  private hardDrop() {
    const gy = this.ghostY();
    this.score += (gy - this.current.y) * 2;
    this.current.y = gy;
    this.lockPiece();
  }

  private softDrop() {
    if (!collide(this.board, this.current.shape, this.current.x, this.current.y + 1)) {
      this.current.y++;
      this.score += 1;
    } else {
      this.lockPiece();
    }
  }

  private lockPiece() {
    this.merge();
    this.clearLines();
    this.spawn();
  }

  private spawn() {
    this.current = this.next;
    this.next = randomPiece();
    if (collide(this.board, this.current.shape, this.current.x, this.current.y)) {
      this.gameOver = true;
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  private drawBlock(px: number, py: number, colorIndex: number, size: number, alpha = 1) {
    if (!colorIndex) return;
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS[colorIndex] as string;
    ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(px + 1, py + 1, size - 2, 4);
    ctx.globalAlpha = 1;
  }

  private drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X + c * BLOCK, BOARD_Y);
      ctx.lineTo(BOARD_X + c * BLOCK, BOARD_Y + ROWS * BLOCK);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X, BOARD_Y + r * BLOCK);
      ctx.lineTo(BOARD_X + COLS * BLOCK, BOARD_Y + r * BLOCK);
      ctx.stroke();
    }
  }

  private drawPreview() {
    const ctx = this.ctx;
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(PREVIEW_X, PREVIEW_Y, PREVIEW_SIZE, PREVIEW_SIZE);
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "14px monospace";
    ctx.textAlign = "left";
    ctx.fillText("SIGUIENTE", PREVIEW_X, PREVIEW_Y - 12);

    const shape = this.next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        this.drawBlock(
          PREVIEW_X + (offX + c) * PREVIEW_BLOCK,
          PREVIEW_Y + (offY + r) * PREVIEW_BLOCK,
          shape[r][c],
          PREVIEW_BLOCK,
        );
  }

  // Nota: a diferencia del original, no dibuja HUD (score/líneas/nivel) dentro del
  // canvas — ese rol lo cumple el HUD de React en components/player.tsx.
  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);
    this.drawGrid();

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        this.drawBlock(BOARD_X + c * BLOCK, BOARD_Y + r * BLOCK, this.board[r][c], BLOCK);

    const gy = this.ghostY();
    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        if (this.current.shape[r][c])
          this.drawBlock(
            BOARD_X + (this.current.x + c) * BLOCK,
            BOARD_Y + (gy + r) * BLOCK,
            this.current.shape[r][c],
            BLOCK,
            0.2,
          );

    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        if (this.current.shape[r][c])
          this.drawBlock(
            BOARD_X + (this.current.x + c) * BLOCK,
            BOARD_Y + (this.current.y + r) * BLOCK,
            this.current.shape[r][c],
            BLOCK,
          );

    this.drawPreview();
  }
}
