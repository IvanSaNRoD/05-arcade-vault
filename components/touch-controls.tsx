"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import type { TouchButton, TouchControlsLayout } from "@/lib/games/registry";

export const REPEAT_DELAY_MS = 170;
export const REPEAT_INTERVAL_MS = 50;
export const VIBRATE_MS = 10;

// Orden fijo del D-pad: up, left, right, down (ver TouchControlsLayout).
const DPAD_DIRS = ["up", "left", "right", "down"] as const;

type Timer = ReturnType<typeof setTimeout> | null;
type Held = { btn: TouchButton; timer: Timer };

// Los motores escuchan el teclado en window: Arkanoid lee e.key, el resto e.code.
function dispatchKey(type: "keydown" | "keyup", btn: TouchButton) {
  window.dispatchEvent(
    new KeyboardEvent(type, {
      key: btn.key,
      code: btn.code,
      bubbles: true,
      cancelable: true,
    }),
  );
}

// Un mismo id puede ser el timeout inicial o el interval de repeat.
function clearTimer(timer: Timer) {
  if (timer === null) return;
  clearTimeout(timer);
  clearInterval(timer);
}

export function TouchControls({ layout }: { layout: TouchControlsLayout }) {
  // Teclas pulsadas (por code) → botón + timer de auto-repeat activo.
  const heldRef = useRef(new Map<string, Held>());

  useEffect(() => {
    const held = heldRef.current;
    return () => {
      // Al desmontar (SALIR) no deja teclas "pegadas" en el motor.
      for (const { btn, timer } of held.values()) {
        clearTimer(timer);
        dispatchKey("keyup", btn);
      }
      held.clear();
    };
  }, []);

  const press = (btn: TouchButton, e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const held = heldRef.current;
    if (held.has(btn.code)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.dataset.pressed = "true";
    navigator.vibrate?.(VIBRATE_MS);
    dispatchKey("keydown", btn);

    let timer: Timer = null;
    if (btn.repeat) {
      timer = setTimeout(() => {
        const interval = setInterval(
          () => dispatchKey("keydown", btn),
          REPEAT_INTERVAL_MS,
        );
        held.set(btn.code, { btn, timer: interval });
      }, REPEAT_DELAY_MS);
    }
    held.set(btn.code, { btn, timer });
  };

  const release = (btn: TouchButton, e: PointerEvent<HTMLButtonElement>) => {
    const held = heldRef.current;
    if (!held.has(btn.code)) return;
    clearTimer(held.get(btn.code)?.timer ?? null);
    held.delete(btn.code);
    delete e.currentTarget.dataset.pressed;
    dispatchKey("keyup", btn);
  };

  const renderButton = (btn: TouchButton, dir?: string) => (
    <button
      key={btn.code}
      type="button"
      className="tc-btn"
      data-dir={dir}
      aria-label={btn.ariaLabel}
      onPointerDown={(e) => press(btn, e)}
      onPointerUp={(e) => release(btn, e)}
      onPointerCancel={(e) => release(btn, e)}
      onLostPointerCapture={(e) => release(btn, e)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {btn.label}
    </button>
  );

  return (
    <div className={`touch-controls ${layout.variant}`}>
      <div className="tc-group tc-left">
        {layout.left.map((btn, i) =>
          renderButton(
            btn,
            layout.variant === "dpad" ? DPAD_DIRS[i] : undefined,
          ),
        )}
      </div>
      <div className="tc-group tc-right">
        {layout.right.map((btn) => renderButton(btn))}
      </div>
    </div>
  );
}
