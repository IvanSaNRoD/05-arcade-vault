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

const LEFT = { code: "ArrowLeft", key: "ArrowLeft" };
const RIGHT = { code: "ArrowRight", key: "ArrowRight" };
const UP = { code: "ArrowUp", key: "ArrowUp" };
const DOWN = { code: "ArrowDown", key: "ArrowDown" };
const SPACE = { code: "Space", key: " " };

export const GAME_ENGINES: Record<string, GameEngineEntry> = {
  asteroids: {
    component: AsteroidsGame,
    touchControls: {
      variant: "row",
      left: [
        { ...LEFT, label: "↺", ariaLabel: "Girar a la izquierda" },
        { ...RIGHT, label: "↻", ariaLabel: "Girar a la derecha" },
      ],
      right: [
        { ...UP, label: "▲", ariaLabel: "Propulsar" },
        { ...SPACE, label: "FUEGO", ariaLabel: "Disparar" },
      ],
    },
  },
  tetris: {
    component: TetrisGame,
    secondaryLabel: "Líneas",
    touchControls: {
      variant: "row",
      left: [
        { ...LEFT, label: "←", ariaLabel: "Mover a la izquierda", repeat: true },
        { ...RIGHT, label: "→", ariaLabel: "Mover a la derecha", repeat: true },
        { ...DOWN, label: "↓", ariaLabel: "Bajar", repeat: true },
      ],
      right: [
        { ...UP, label: "ROTAR", ariaLabel: "Rotar pieza" },
        { ...SPACE, label: "CAÍDA", ariaLabel: "Caída rápida" },
      ],
    },
  },
  // tiene vidas → corazones, sin secondaryLabel
  arkanoid: {
    component: ArkanoidGame,
    touchControls: {
      variant: "row",
      left: [
        { ...LEFT, label: "←", ariaLabel: "Mover a la izquierda" },
        { ...RIGHT, label: "→", ariaLabel: "Mover a la derecha" },
      ],
      right: [],
    },
  },
  snake: {
    component: SnakeGame,
    secondaryLabel: "Longitud",
    touchControls: {
      variant: "dpad", // orden fijo: up, left, right, down
      left: [
        { ...UP, label: "↑", ariaLabel: "Arriba" },
        { ...LEFT, label: "←", ariaLabel: "Izquierda" },
        { ...RIGHT, label: "→", ariaLabel: "Derecha" },
        { ...DOWN, label: "↓", ariaLabel: "Abajo" },
      ],
      right: [],
    },
  },
};
