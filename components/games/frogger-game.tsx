"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  CANVAS_H,
  CANVAS_W,
  FroggerEngine,
  type FroggerState,
} from "@/lib/games/frogger/engine";

export interface FroggerGameHandle {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  restart: () => void;
}

interface FroggerGameProps {
  onStateChange: (state: FroggerState) => void;
}

export const FroggerGame = forwardRef<FroggerGameHandle, FroggerGameProps>(
  function FroggerGame({ onStateChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<FroggerEngine | null>(null);
    const [state, setState] = useState<FroggerState | null>(null);
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
      const engine = new FroggerEngine(canvas, setState);
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

    // 640×560 dentro de la pantalla CRT 4:3: "contain" evita deformar la cuadrícula.
    return (
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "contain",
        }}
      />
    );
  },
);
