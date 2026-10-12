"use client";

import { useEffect, useState, type PointerEvent } from "react";
import type {
  GamepadLayout,
  GamepadSlot,
  TouchButton,
} from "@/lib/games/registry";

export const REPEAT_DELAY_MS = 170;
export const REPEAT_INTERVAL_MS = 50;
export const VIBRATE_MS = 10;

// Triángulos de la referencia (gamepad-assets/gamepad.html).
const ARROW_PATHS = {
  up: "M12 4 L20 16 L4 16 Z",
  right: "M8 4 L20 12 L8 20 Z",
  down: "M4 8 L20 8 L12 20 Z",
  left: "M16 4 L16 20 L4 12 Z",
} as const;

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

export function TouchControls({ layout }: { layout: GamepadLayout }) {
  // Slots pulsados → botón + timer de auto-repeat. Por slot, no por code:
  // asteroids ↑ y B comparten ArrowUp.
  const [held] = useState(() => new Map<GamepadSlot, Held>());
  const [pointerSlots, setPointerSlots] = useState<Set<GamepadSlot>>(new Set());
  const [physicalCodes, setPhysicalCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      // Al desmontar (SALIR) no deja teclas "pegadas" en el motor.
      for (const { btn, timer } of held.values()) {
        clearTimer(timer);
        dispatchKey("keyup", btn);
      }
      held.clear();
    };
  }, [held]);

  // Feedback de teclado físico (y de los eventos sintéticos propios, inocuo).
  useEffect(() => {
    const onDown = (e: KeyboardEvent) =>
      setPhysicalCodes((prev) =>
        prev.has(e.code) ? prev : new Set(prev).add(e.code),
      );
    const onUp = (e: KeyboardEvent) =>
      setPhysicalCodes((prev) => {
        if (!prev.has(e.code)) return prev;
        const next = new Set(prev);
        next.delete(e.code);
        return next;
      });
    const onBlur = () => setPhysicalCodes(new Set());
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const press = (
    slot: GamepadSlot,
    btn: TouchButton,
    e: PointerEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    if (held.has(slot)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setPointerSlots((prev) => new Set(prev).add(slot));
    navigator.vibrate?.(VIBRATE_MS);
    dispatchKey("keydown", btn);

    let timer: Timer = null;
    if (btn.repeat) {
      timer = setTimeout(() => {
        const interval = setInterval(
          () => dispatchKey("keydown", btn),
          REPEAT_INTERVAL_MS,
        );
        held.set(slot, { btn, timer: interval });
      }, REPEAT_DELAY_MS);
    }
    held.set(slot, { btn, timer });
  };

  const release = (slot: GamepadSlot, btn: TouchButton) => {
    if (!held.has(slot)) return;
    clearTimer(held.get(slot)?.timer ?? null);
    held.delete(slot);
    setPointerSlots((prev) => {
      const next = new Set(prev);
      next.delete(slot);
      return next;
    });
    // keyup solo si ningún otro slot pulsado mantiene el mismo code.
    const shared = [...held.values()].some((h) => h.btn.code === btn.code);
    if (!shared) dispatchKey("keyup", btn);
  };

  const buttonProps = (slot: GamepadSlot) => {
    const btn = layout[slot];
    if (!btn) {
      return {
        disabled: true,
        "aria-hidden": true as const,
        className: "is-off",
      };
    }
    const pressed = pointerSlots.has(slot) || physicalCodes.has(btn.code);
    return {
      "aria-label": btn.ariaLabel,
      "data-pressed": pressed ? "true" : undefined,
      onPointerDown: (e: PointerEvent<HTMLButtonElement>) =>
        press(slot, btn, e),
      onPointerUp: () => release(slot, btn),
      onPointerCancel: () => release(slot, btn),
      onLostPointerCapture: () => release(slot, btn),
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    };
  };

  const dpadKey = (dir: keyof typeof ARROW_PATHS) => {
    const props = buttonProps(dir);
    return (
      <button
        key={dir}
        type="button"
        {...props}
        className={`dp dp-${dir}${"className" in props ? ` ${props.className}` : ""}`}
      >
        <svg className="dp-arrow" viewBox="0 0 24 24" aria-hidden="true">
          <path d={ARROW_PATHS[dir]} fill="currentColor" />
        </svg>
      </button>
    );
  };

  const actionKey = (slot: "a" | "b") => {
    const props = buttonProps(slot);
    return (
      <div className="ab-cell">
        <button
          type="button"
          {...props}
          className={`ab ${slot}${"className" in props ? ` ${props.className}` : ""}`}
        >
          <span className="ab-ring" />
          <span className="ab-letter">{slot.toUpperCase()}</span>
        </button>
        {layout[slot] && (
          <span className="ab-legend">{layout[slot].label}</span>
        )}
      </div>
    );
  };

  return (
    <div className="gp" role="group" aria-label="Gamepad">
      <div className="gp-body">
        <div className="gp-col gp-col-left">
          <div className="gp-dpad">
            {dpadKey("up")}
            {dpadKey("right")}
            {dpadKey("down")}
            {dpadKey("left")}
            <div className="dp-hub" aria-hidden="true">
              <span className="dp-hub-gem" />
            </div>
          </div>
        </div>
        <div className="gp-col gp-col-right">
          <div className="gp-actions">
            {actionKey("b")}
            {actionKey("a")}
          </div>
        </div>
      </div>
    </div>
  );
}
