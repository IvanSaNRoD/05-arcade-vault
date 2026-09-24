import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { AsteroidsGame } from "@/components/games/asteroids-game";
import { ArkanoidGame } from "@/components/games/arkanoid-game";
import { SnakeGame } from "@/components/games/snake-game";
import { TetrisGame } from "@/components/games/tetris-game";

export interface GameEngineHandle {
  pause(): void;
  resume(): void;
  forceGameOver(): void;
  restart(): void;
}

export interface GameEngineState {
  score: number;
  lives: number;
  level: number;
  phase: "playing" | "dead" | "gameover" | "paused";
}

export interface GameEngineEntry {
  component: ForwardRefExoticComponent<
    { onStateChange: (s: GameEngineState) => void } & RefAttributes<GameEngineHandle>
  >;
  // Sustituye "Vidas" + corazones por esta etiqueta + un número (juegos sin vidas).
  secondaryLabel?: string;
}

export const GAME_ENGINES: Record<string, GameEngineEntry> = {
  asteroids: { component: AsteroidsGame },
  tetris: { component: TetrisGame, secondaryLabel: "Líneas" },
  arkanoid: { component: ArkanoidGame }, // tiene vidas → corazones, sin secondaryLabel
  snake: { component: SnakeGame, secondaryLabel: "Longitud" },
};
