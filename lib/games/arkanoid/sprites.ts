export interface Frame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const explosionRow = (sy: number): Frame[] =>
  [256, 288, 320, 352].map((sx) => ({ sx, sy, sw: 32, sh: 16 }));

export const EXPLOSION_FRAMES: Record<string, Frame[]> = {
  red: explosionRow(176),
  cyan: explosionRow(192),
  green: explosionRow(208),
  magenta: explosionRow(224),
  yellow: explosionRow(240),
  hotpink: explosionRow(256),
  gray: explosionRow(176),
};

export const EXPLOSION_DURATION = 150;

export const SPRITES: {
  paddle: Frame;
  ball: Frame;
  blocks: Record<string, Frame>;
} = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  },
};

export class Spritesheet {
  private img: HTMLImageElement;
  private loaded = false;

  constructor(src = "/games/arkanoid/spritesheet.png") {
    this.img = new Image();
    this.img.onload = () => {
      this.loaded = true;
    };
    this.img.onerror = () => console.error("Failed to load spritesheet");
    this.img.src = src;
  }

  drawFrame(
    ctx: CanvasRenderingContext2D,
    frame: Frame,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    if (!this.loaded) return;
    ctx.drawImage(this.img, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
  }

  // name: "paddle" | "ball" | "block_<color>"
  drawSprite(
    ctx: CanvasRenderingContext2D,
    name: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    const sp = name.startsWith("block_")
      ? SPRITES.blocks[name.slice(6)]
      : SPRITES[name as "paddle" | "ball"];
    if (sp) this.drawFrame(ctx, sp, x, y, w, h);
  }
}
