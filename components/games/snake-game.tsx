"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { SnakeEngine, type SnakeState } from "@/lib/games/snake/engine";

export interface SnakeGameHandle {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  restart: () => void;
}

interface SnakeGameProps {
  onStateChange: (state: SnakeState) => void;
}

export const SnakeGame = forwardRef<SnakeGameHandle, SnakeGameProps>(
  function SnakeGame({ onStateChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<SnakeEngine | null>(null);
    const [state, setState] = useState<SnakeState | null>(null);
    const onStateChangeRef = useRef(onStateChange);

    useEffect(() => {
      onStateChangeRef.current = onStateChange;
    }, [onStateChange]);

    // Reenvía al padre el último estado recibido del motor.
    useEffect(() => {
      if (state) onStateChangeRef.current(state);
    }, [state]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const engine = new SnakeEngine(canvas, setState);
      engineRef.current = engine;
      engine.start();
      return () => {
        engine.destroy();
        engineRef.current = null;
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        pause: () => engineRef.current?.pause(),
        resume: () => engineRef.current?.resume(),
        forceGameOver: () => engineRef.current?.forceGameOver(),
        restart: () => engineRef.current?.restart(),
      }),
      [],
    );

    return (
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    );
  },
);
