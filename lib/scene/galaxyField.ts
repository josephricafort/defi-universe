import * as THREE from "three";
import type { Chain } from "@/lib/data/chains";

export interface ChainOrb {
  mesh: THREE.Mesh;
  glowSprite: THREE.Sprite;
  chain: Chain;
}

// sqrt scaling clamped to [minR, maxR] in scene units
function tvlToRadius(tvl: number, minR = 1.8, maxR = 9.0): number {
  const sqrtMin = Math.sqrt(200_000_000);   // $200M floor
  const sqrtMax = Math.sqrt(65_000_000_000); // $65B ceiling
  const clamped = Math.min(Math.max(Math.sqrt(tvl), sqrtMin), sqrtMax);
  return minR + ((clamped - sqrtMin) / (sqrtMax - sqrtMin)) * (maxR - minR);
}

// Radial-gradient canvas texture for the glow sprite
function makeGlowTexture(hexColor: string): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const cx = size / 2;
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  grad.addColorStop(0.0, hexColor + "ff"); // opaque centre
  grad.addColorStop(0.35, hexColor + "99");
  grad.addColorStop(0.7, hexColor + "33");
  grad.addColorStop(1.0, hexColor + "00"); // transparent edge

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createGalaxyField(chains: Chain[]): {
  group: THREE.Group;
  orbs: ChainOrb[];
} {
  const group = new THREE.Group();
  const orbs: ChainOrb[] = [];

  for (const chain of chains) {
    const radius = tvlToRadius(chain.tvl);
    const color = new THREE.Color(chain.color);

    // ── Solid sphere ─────────────────────────────────────────────────────────
    const geo = new THREE.SphereGeometry(radius, 40, 40);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...chain.position);
    mesh.userData = { chainId: chain.id };
    group.add(mesh);

    // ── Glow sprite (additive, always faces camera) ───────────────────────────
    const glowTex = makeGlowTexture(chain.color);
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const glowSprite = new THREE.Sprite(glowMat);
    // Scale the glow to ~4× the sphere radius so it bleeds nicely
    const glowSize = radius * 5.5;
    glowSprite.scale.set(glowSize, glowSize, 1);
    glowSprite.position.set(...chain.position);
    group.add(glowSprite);

    orbs.push({ mesh, glowSprite, chain });
  }

  return { group, orbs };
}

// Gentle self-rotation in the render loop — no orbiting, positions stay fixed
export function tickOrbs(orbs: ChainOrb[], delta: number) {
  for (const orb of orbs) {
    orb.mesh.rotation.y += delta * 0.18;
  }
}
