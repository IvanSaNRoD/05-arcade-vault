import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { AsteroidsGame } from "@/components/games/asteroids-game";
import { ArkanoidGame } from "@/components/games/arkanoid-game";
import { SnakeGame } from "@/components/games/snake-game";
import { TetrisGame } from "@/components/games/tetris-game";
import type { SkinId } from "@/lib/games/skins";

export interface GameEngineHandle {
  pause(): void;
  resume(): void;
  forceGameOver(): void;
  restart(): void;
  setSkin?(id: SkinId): void; // opcional hasta que cada juego tenga su spec
}

export interface GameEngineState {
  score: number;
  lives: number;
  level: number;
  phase: "playing" | "dead" | "gameover" | "paused";
}

export interface TouchButton {
  label: string; // texto visible: "←", "FUEGO", …
  ariaLabel: string; // "Girar a la izquierda", "Disparar", …
  code: string; // KeyboardEvent.code: "ArrowLeft", "Space", …
  key: string; // KeyboardEvent.key: "ArrowLeft", " ", …
  repeat?: boolean; // auto-repeat mientras se mantiene (solo Tetris ← → ↓)
}

export interface TouchControlsLayout {
  variant: "row" | "dpad"; // "dpad" = cruz 3×3 en el grupo izquierdo (Snake)
  left: TouchButton[]; // en "dpad", orden fijo: up, left, right, down
  right: TouchButton[];
}

export interface GameEngineEntry {
  component: ForwardRefExoticComponent<
    { onStateChange: (s: GameEngineState) => void } & RefAttributes<GameEngineHandle>
  >;
  // Sustituye "Vidas" + corazones por esta etiqueta + un número (juegos sin vidas).
  secondaryLabel?: string;
  // Botones táctiles bajo el CRT; sin él, no se muestran controles.
  touchControls?: TouchControlsLayout;
}

export const GAME_ENGINES: Record<string, GameEngineEntry> = {
  asteroids: { component: AsteroidsGame },
  tetris: { component: TetrisGame, secondaryLabel: "Líneas" },
  arkanoid: { component: ArkanoidGame }, // tiene vidas → corazones, sin secondaryLabel
  snake: { component: SnakeGame, secondaryLabel: "Longitud" },
};
