export interface FruitRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Fila pixel-art de fruits.png (y=136, h=160). Valores de sprites.js sin cambios.
export const FRUIT_SPRITES = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
} satisfies Record<string, FruitRect>;

export type FruitName = keyof typeof FRUIT_SPRITES;

export class FruitSheet {
  loaded = false;
  private img: HTMLImageElement;

  constructor(src = "/games/snake/fruits.png") {
    this.img = new Image();
    this.img.onload = () => {
      this.loaded = true;
    };
    this.img.onerror = () => console.error("Failed to load fruits spritesheet");
    this.img.src = src;
  }

  // Escala el sprite para caber en un cuadrado size×size, centrado y manteniendo proporción.
  draw(
    ctx: CanvasRenderingContext2D,
    name: FruitName,
    x: number,
    y: number,
    size: number,
  ) {
    if (!this.loaded) return;
    const sp = FRUIT_SPRITES[name];
    const scale = size / Math.max(sp.w, sp.h);
    const dw = sp.w * scale;
    const dh = sp.h * scale;
    ctx.drawImage(
      this.img,
      sp.x,
      sp.y,
      sp.w,
      sp.h,
      x + (size - dw) / 2,
      y + (size - dh) / 2,
      dw,
      dh,
    );
  }
}
