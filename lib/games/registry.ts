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
  label: string; // leyenda bajo A/B ("FUEGO", …); ignorada en el D-pad
  ariaLabel: string; // "Disparar", "Girar a la izquierda", …
  code: string; // KeyboardEvent.code: "ArrowLeft", "Space", …
  key: string; // KeyboardEvent.key: "ArrowLeft", " ", …
  repeat?: boolean; // auto-repeat mientras se mantiene (solo Tetris ← → ↓)
}

export type GamepadSlot = "up" | "down" | "left" | "right" | "a" | "b";

// null = slot no usado por el juego → atenuado y disabled
export type GamepadLayout = Record<GamepadSlot, TouchButton | null>;

export interface GameEngineEntry {
  component: ForwardRefExoticComponent<
    { onStateChange: (s: GameEngineState) => void } & RefAttributes<GameEngineHandle>
  >;
  // Sustituye "Vidas" + corazones por esta etiqueta + un número (juegos sin vidas).
  secondaryLabel?: string;
  // Gamepad bajo el CRT; sin él, no se muestra.
  touchControls?: GamepadLayout;
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
      up: { ...UP, label: "▲", ariaLabel: "Propulsar" },
      down: null,
      left: { ...LEFT, label: "↺", ariaLabel: "Girar a la izquierda" },
      right: { ...RIGHT, label: "↻", ariaLabel: "Girar a la derecha" },
      a: { ...SPACE, label: "FUEGO", ariaLabel: "Disparar" },
      b: { ...UP, label: "PROPULSAR", ariaLabel: "Propulsar" },
    },
  },
  tetris: {
    component: TetrisGame,
    secondaryLabel: "Líneas",
    touchControls: {
      up: { ...UP, label: "↑", ariaLabel: "Rotar pieza" },
      down: { ...DOWN, label: "↓", ariaLabel: "Bajar", repeat: true },
      left: { ...LEFT, label: "←", ariaLabel: "Mover a la izquierda", repeat: true },
      right: { ...RIGHT, label: "→", ariaLabel: "Mover a la derecha", repeat: true },
      a: { ...UP, label: "ROTAR", ariaLabel: "Rotar pieza" },
      b: { ...SPACE, label: "CAÍDA", ariaLabel: "Caída rápida" },
    },
  },
  // tiene vidas → corazones, sin secondaryLabel
  arkanoid: {
    component: ArkanoidGame,
    touchControls: {
      up: null,
      down: null,
      left: { ...LEFT, label: "←", ariaLabel: "Mover a la izquierda" },
      right: { ...RIGHT, label: "→", ariaLabel: "Mover a la derecha" },
      a: null,
      b: null,
    },
  },
  snake: {
    component: SnakeGame,
    secondaryLabel: "Longitud",
    touchControls: {
      up: { ...UP, label: "↑", ariaLabel: "Arriba" },
      down: { ...DOWN, label: "↓", ariaLabel: "Abajo" },
      left: { ...LEFT, label: "←", ariaLabel: "Izquierda" },
      right: { ...RIGHT, label: "→", ariaLabel: "Derecha" },
      a: null,
      b: null,
    },
  },
};
