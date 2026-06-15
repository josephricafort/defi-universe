import * as THREE from "three";
import type { Chain } from "@/lib/data/chains";

export function createChainLabel(chain: Chain, sphereRadius: number): THREE.Sprite {
  const W = 300;
  const H = 72;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Translucent dark pill background
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(4, 5, 10, 0.70)";
  roundRect(ctx, 0, 0, W, H, 14);
  ctx.fill();

  // Chain name
  ctx.font = "bold 26px system-ui, sans-serif";
  ctx.fillStyle = chain.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(chain.name, W / 2, H * 0.36);

  // TVL line
  ctx.font = "17px system-ui, sans-serif";
  ctx.fillStyle = "rgba(180,180,220,0.75)";
  ctx.fillText(formatTVL(chain.tvl), W / 2, H * 0.72);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);

  // Scale to keep proportional; width relative to sphere size
  const scale = Math.max(sphereRadius * 2.8, 14);
  sprite.scale.set(scale, scale * (H / W), 1);
  // Position just above the sphere
  sprite.position.set(0, sphereRadius + scale * (H / W) * 0.6, 0);

  return sprite;
}

export function updateLabelTVL(sprite: THREE.Sprite, chain: Chain, sphereRadius: number): void {
  // Re-draw the canvas texture with updated TVL (called after live fetch resolves)
  const mat = sprite.material as THREE.SpriteMaterial;
  const canvas = (mat.map as THREE.CanvasTexture).image as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(4, 5, 10, 0.70)";
  roundRect(ctx, 0, 0, W, H, 14);
  ctx.fill();

  ctx.font = "bold 26px system-ui, sans-serif";
  ctx.fillStyle = chain.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(chain.name, W / 2, H * 0.36);

  ctx.font = "17px system-ui, sans-serif";
  ctx.fillStyle = "rgba(180,180,220,0.75)";
  ctx.fillText(formatTVL(chain.tvl), W / 2, H * 0.72);

  (mat.map as THREE.CanvasTexture).needsUpdate = true;
}

export function formatTVL(tvl: number): string {
  if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(1)}B`;
  if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(0)}M`;
  return `$${tvl.toLocaleString()}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
