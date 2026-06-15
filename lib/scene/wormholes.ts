import * as THREE from "three";
import type { WormholeEdge } from "@/lib/data/bridges";

export interface Wormhole {
  tubeGroup: THREE.Group;
  edge: WormholeEdge;
  volume24h: number;
  curve: THREE.QuadraticBezierCurve3;
  particles: WormholeParticle[];
  baseOpacity: number; // volume-derived, used by fadeWormholes
  opacity: number;     // current fade multiplier [0..1]
}

interface WormholeParticle {
  sprite: THREE.Sprite;
  t: number;
  speed: number;
}

// Scene units span ±130; tube radius needs to be visible at that scale.
// sqrt scale from $25M–$2B → radius 1.2–4.0 scene units.
function volumeToRadius(vol: number): number {
  const minR = 1.2;
  const maxR = 4.0;
  const sqrtMin = Math.sqrt(20_000_000);
  const sqrtMax = Math.sqrt(2_000_000_000);
  const v = Math.min(Math.max(Math.sqrt(vol), sqrtMin), sqrtMax);
  return minR + ((v - sqrtMin) / (sqrtMax - sqrtMin)) * (maxR - minR);
}

// Log scale → opacity 0.25–0.65
function volumeToOpacity(vol: number): number {
  const lo = Math.log10(20_000_000);
  const hi = Math.log10(2_000_000_000);
  const v = Math.min(Math.max(Math.log10(Math.max(vol, 1)), lo), hi);
  return 0.25 + ((v - lo) / (hi - lo)) * 0.40;
}

function makeParticleTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  grad.addColorStop(0.0, "rgba(200,220,255,1)");
  grad.addColorStop(0.3, "rgba(140,180,255,0.8)");
  grad.addColorStop(0.7, "rgba(80,120,255,0.3)");
  grad.addColorStop(1.0, "rgba(60,100,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// Shared texture — created once on first call, reused for all particles
let particleTex: THREE.Texture | null = null;

export function createWormholes(edges: WormholeEdge[]): {
  group: THREE.Group;
  wormholes: Wormhole[];
} {
  const group = new THREE.Group();
  // renderOrder -1 keeps tubes behind sphere meshes (spheres are renderOrder 0)
  group.renderOrder = -1;
  const wormholes: Wormhole[] = [];

  if (!particleTex) particleTex = makeParticleTexture();

  for (const edge of edges) {
    const tubeGroup = new THREE.Group();
    const baseOpacity = volumeToOpacity(edge.volume24h);
    const radius = volumeToRadius(edge.volume24h);

    const p0 = new THREE.Vector3(...edge.from.position);
    const p2 = new THREE.Vector3(...edge.to.position);

    // Control point: midpoint lifted in Y so the arc bows upward through space
    const mid = new THREE.Vector3().addVectors(p0, p2).multiplyScalar(0.5);
    mid.y += p0.distanceTo(p2) * 0.3;

    const curve = new THREE.QuadraticBezierCurve3(p0, mid, p2);

    // ── Tube mesh ───────────────────────────────────────────────────────────
    const tubeGeo = new THREE.TubeGeometry(curve, 48, radius, 6, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x4488ff),
      transparent: true,
      opacity: baseOpacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tubeGroup.add(tube);

    // ── Flowing particles ───────────────────────────────────────────────────
    const PARTICLE_COUNT = 3;
    const particles: WormholeParticle[] = [];
    const particleSize = radius * 5;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const mat = new THREE.SpriteMaterial({
        map: particleTex,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: Math.min(baseOpacity * 2.0, 0.9),
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(particleSize, particleSize, 1);

      const t = i / PARTICLE_COUNT; // evenly staggered start positions
      sprite.position.copy(curve.getPoint(t));
      tubeGroup.add(sprite);

      particles.push({
        sprite,
        t,
        speed: 0.08 + Math.random() * 0.05,
      });
    }

    group.add(tubeGroup);
    wormholes.push({
      tubeGroup,
      edge,
      volume24h: edge.volume24h,
      curve,
      particles,
      baseOpacity,
      opacity: 1,
    });
  }

  return { group, wormholes };
}

export function tickWormholes(wormholes: Wormhole[], delta: number) {
  for (const wh of wormholes) {
    for (const p of wh.particles) {
      p.t = (p.t + p.speed * delta) % 1;
      p.sprite.position.copy(wh.curve.getPoint(p.t));
    }
  }
}

// targetMult: 0 = invisible, 1 = full volume-scaled opacity
export function fadeWormholes(wormholes: Wormhole[], targetMult: number, alpha: number) {
  for (const wh of wormholes) {
    wh.opacity = THREE.MathUtils.lerp(wh.opacity, targetMult, alpha);

    for (const child of wh.tubeGroup.children) {
      if (child instanceof THREE.Mesh) {
        (child.material as THREE.MeshBasicMaterial).opacity =
          wh.baseOpacity * wh.opacity;
      } else if (child instanceof THREE.Sprite) {
        (child.material as THREE.SpriteMaterial).opacity =
          Math.min(wh.baseOpacity * 2.0, 0.9) * wh.opacity;
      }
    }
  }
}
