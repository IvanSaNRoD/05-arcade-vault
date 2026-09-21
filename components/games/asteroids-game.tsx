"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  AsteroidsEngine,
  type AsteroidsState,
} from "@/lib/games/asteroids/engine";

export interface AsteroidsGameHandle {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  restart: () => void;
}

interface AsteroidsGameProps {
  onStateChange: (state: AsteroidsState) => void;
}

export const AsteroidsGame = forwardRef<
  AsteroidsGameHandle,
  AsteroidsGameProps
>(function AsteroidsGame({ onStateChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngine | null>(null);
  const [state, setState] = useState<AsteroidsState | null>(null);
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
    const engine = new AsteroidsEngine(canvas, setState);
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
});
