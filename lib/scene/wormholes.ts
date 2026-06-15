import * as THREE from "three";
import type { WormholeEdge } from "@/lib/data/bridges";

export interface Wormhole {
  tubeGroup: THREE.Group; // tube mesh + particle sprites, all children
  edge: WormholeEdge;
  volume24h: number;
  curve: THREE.QuadraticBezierCurve3;
  particles: WormholeParticle[];
  // Current group opacity [0..1] — used by fade helpers
  opacity: number;
}

interface WormholeParticle {
  sprite: THREE.Sprite;
  t: number;    // position along curve [0..1]
  speed: number;
  offset: number; // stagger offset
}

// sqrt-scale volume to tube radius. Very wide range ($1M–$5B+) so we clamp hard.
function volumeToRadius(vol: number): number {
  const minR = 0.12;
  const maxR = 0.55;
  const sqrtMin = Math.sqrt(5_000_000);    // $5M floor
  const sqrtMax = Math.sqrt(3_000_000_000); // $3B ceiling
  const v = Math.min(Math.max(Math.sqrt(vol), sqrtMin), sqrtMax);
  return minR + ((v - sqrtMin) / (sqrtMax - sqrtMin)) * (maxR - minR);
}

// Opacity also scales with volume so dim chains stay subtle
function volumeToOpacity(vol: number): number {
  const lo = Math.log10(5_000_000);
  const hi = Math.log10(3_000_000_000);
  const v = Math.min(Math.max(Math.log10(Math.max(vol, 1)), lo), hi);
  return 0.18 + ((v - lo) / (hi - lo)) * 0.42;
}

function makeParticleTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  grad.addColorStop(0, "rgba(160,200,255,1)");
  grad.addColorStop(0.4, "rgba(120,170,255,0.6)");
  grad.addColorStop(1, "rgba(80,130,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const sharedParticleTex = { current: null as THREE.Texture | null };

export function createWormholes(edges: WormholeEdge[]): {
  group: THREE.Group;
  wormholes: Wormhole[];
} {
  const group = new THREE.Group();
  group.renderOrder = -1; // render behind galaxy spheres
  const wormholes: Wormhole[] = [];

  if (!sharedParticleTex.current) {
    sharedParticleTex.current = makeParticleTexture();
  }
  const particleTex = sharedParticleTex.current;

  for (const edge of edges) {
    const tubeGroup = new THREE.Group();
    const opacity = volumeToOpacity(edge.volume24h);
    const radius = volumeToRadius(edge.volume24h);

    const p0 = new THREE.Vector3(...edge.from.position);
    const p2 = new THREE.Vector3(...edge.to.position);

    // Arc midpoint: halfway between the two, lifted in Y proportional to distance
    const mid = new THREE.Vector3().addVectors(p0, p2).multiplyScalar(0.5);
    const dist = p0.distanceTo(p2);
    mid.y += dist * 0.25;

    const curve = new THREE.QuadraticBezierCurve3(p0, mid, p2);

    // Tube along the bezier
    const tubeGeo = new THREE.TubeGeometry(curve, 32, radius, 5, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x5588ee,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tubeGroup.add(tube);

    // 3 flowing particles per wormhole
    const PARTICLE_COUNT = 3;
    const particles: WormholeParticle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const mat = new THREE.SpriteMaterial({
        map: particleTex,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: opacity * 1.6,
      });
      const sprite = new THREE.Sprite(mat);
      const particleSize = radius * 7;
      sprite.scale.set(particleSize, particleSize, 1);

      const offset = i / PARTICLE_COUNT;
      const t = offset;
      const pos = curve.getPoint(t);
      sprite.position.copy(pos);
      tubeGroup.add(sprite);

      particles.push({
        sprite,
        t,
        speed: 0.06 + Math.random() * 0.04,
        offset,
      });
    }

    group.add(tubeGroup);
    wormholes.push({ tubeGroup, edge, volume24h: edge.volume24h, curve, particles, opacity });
  }

  return { group, wormholes };
}

// Call every frame — advances particles along their curves
export function tickWormholes(wormholes: Wormhole[], delta: number) {
  for (const wh of wormholes) {
    for (const p of wh.particles) {
      p.t = (p.t + p.speed * delta) % 1;
      const pos = wh.curve.getPoint(p.t);
      p.sprite.position.copy(pos);
    }
  }
}

// Fade all wormholes toward targetOpacity (alpha = lerp factor per call)
export function fadeWormholes(
  wormholes: Wormhole[],
  targetOpacity: number, // 0..1 multiplier on each wormhole's base opacity
  alpha: number
) {
  for (const wh of wormholes) {
    wh.opacity = THREE.MathUtils.lerp(wh.opacity, targetOpacity, alpha);
    const baseVolumeOpacity = volumeToOpacity(wh.volume24h);

    for (const child of wh.tubeGroup.children) {
      if (child instanceof THREE.Mesh) {
        (child.material as THREE.MeshBasicMaterial).opacity =
          baseVolumeOpacity * wh.opacity;
      } else if (child instanceof THREE.Sprite) {
        (child.material as THREE.SpriteMaterial).opacity =
          baseVolumeOpacity * 1.6 * wh.opacity;
      }
    }
  }
}
