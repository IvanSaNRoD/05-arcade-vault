"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  ArkanoidEngine,
  type ArkanoidState,
} from "@/lib/games/arkanoid/engine";

export interface ArkanoidGameHandle {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  restart: () => void;
}

interface ArkanoidGameProps {
  onStateChange: (state: ArkanoidState) => void;
}

export const ArkanoidGame = forwardRef<ArkanoidGameHandle, ArkanoidGameProps>(
  function ArkanoidGame({ onStateChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<ArkanoidEngine | null>(null);
    const [state, setState] = useState<ArkanoidState | null>(null);
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
      const engine = new ArkanoidEngine(canvas, setState);
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
