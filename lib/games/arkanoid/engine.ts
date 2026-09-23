// Ported from references/resources/started-games/04-arkanoid/game.js
// Constants and values kept identical to the original; module-level mutable
// state (canvas, ctx, blocks, keys, sounds...) became instance fields.

import { LEVELS } from "./levels";
import { EXPLOSION_DURATION, Spritesheet } from "./sprites";

export const W = 800;
export const H = 600;

// ── Constants ─────────────────────────────────────────────────────────────────
const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_ROWS = 6;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCK_COLORS = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;

// ── Estado del juego ──────────────────────────────────────────────────────────
// "dead" no se usa en Arkanoid; se mantiene por contrato con components/player.tsx.
// El "win" del prototipo (nivel 5 limpio) se mapea a "gameover".
export type ArkanoidInternalState = "playing" | "dead" | "gameover";
export type ArkanoidPhase = ArkanoidInternalState | "paused";

export interface ArkanoidState {
  score: number;
  lives: number;
  level: number; // 1..5
  phase: ArkanoidPhase;
}

interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Ball {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  alive: boolean;
}

interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  elapsed: number; // ms
}

export class ArkanoidEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onStateChange: (state: ArkanoidState) => void;
  private sheet: Spritesheet;

  private bounceSound = new Audio("/games/arkanoid/ball-bounce.mp3");
  private breakSound = new Audio("/games/arkanoid/break-sound.mp3");

  private paddle: Paddle = { x: 0, y: 560, w: 81, h: 14 };
  private ball: Ball = { x: 0, y: 0, w: 16, h: 16, vx: BASE_BALL_VX, vy: BASE_BALL_VY };
  private blocks: Block[] = [];
  private explosions: Explosion[] = [];

  private score = 0;
  private lives = 3;
  private level = 1;
  private state: ArkanoidInternalState = "playing";
  private paused = false;

  // Input: alimentado por los listeners registrados en start().
  private keys: Record<string, boolean> = { ArrowLeft: false, ArrowRight: false };

  private rafId: number | null = null;
  private lastTime: number | null = null;

  constructor(canvas: HTMLCanvasElement, onStateChange: (state: ArkanoidState) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
    this.ctx = ctx;
    this.onStateChange = onStateChange;
    this.sheet = new Spritesheet();
    this.initPaddle();
    this.loadLevel(1);
  }

  private initPaddle() {
    this.paddle.x = (W - this.paddle.w) / 2;
  }

  private initBall() {
    const speed = LEVELS[this.level - 1].speed;
    this.ball.x = this.paddle.x + (this.paddle.w - this.ball.w) / 2;
    this.ball.y = this.paddle.y - this.ball.h;
    this.ball.vx = BASE_BALL_VX * speed;
    this.ball.vy = BASE_BALL_VY * speed;
  }

  private loadLevel(n: number) {
    this.level = n;
    this.blocks = LEVELS[n - 1].blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    this.explosions = [];
    this.initBall();
  }

  // cloneNode permite solapar sonidos; el catch evita rechazos por la política de autoplay.
  private playSound(sound: HTMLAudioElement) {
    (sound.cloneNode() as HTMLAudioElement).play().catch(() => {});
  }

  private collideAABB(block: Block) {
    const ball = this.ball;
    return (
      ball.x < block.x + block.w &&
      ball.x + ball.w > block.x &&
      ball.y < block.y + block.h &&
      ball.y + ball.h > block.y
    );
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  update(dt: number) {
    if (this.state !== "playing") return;
    const { paddle, ball } = this;

    // Paddle
    if (this.keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (this.keys.ArrowRight) paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

    // Ball movement
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Wall bounces (left, right, top)
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      this.playSound(this.bounceSound);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      this.playSound(this.bounceSound);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      this.playSound(this.bounceSound);
    }

    // Paddle bounce
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      this.playSound(this.bounceSound);
    }

    // Block collisions
    for (const block of this.blocks) {
      if (!block.alive) continue;
      if (this.collideAABB(block)) {
        block.alive = false;
        this.explosions.push({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          color: block.color,
          elapsed: 0,
        });
        this.score += 10;
        ball.vy = -ball.vy;
        this.playSound(this.breakSound);
        if (this.blocks.every((b) => !b.alive)) {
          if (this.level < LEVELS.length) this.loadLevel(this.level + 1);
          else this.state = "gameover"; // "win" del prototipo
        }
        break; // one block per frame
      }
    }

    // Explosions
    for (const exp of this.explosions) exp.elapsed += dt * 1000;
    this.explosions = this.explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    // Ball lost
    if (ball.y > H) {
      this.lives--;
      if (this.lives <= 0) {
        this.lives = 0;
        this.state = "gameover";
      } else {
        this.initBall();
      }
    }
  }
}
