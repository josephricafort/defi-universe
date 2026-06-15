import * as THREE from "three";
import type { Protocol } from "@/lib/data/protocols";
import { categoryColor } from "@/lib/data/protocols";

export interface ProtocolStar {
  mesh: THREE.Mesh;
  glowSprite: THREE.Sprite;
  label: THREE.Sprite;
  protocol: Protocol;
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
  orbitY: number;
}

// sqrt TVL → radius, clamped to smaller range than chain orbs
function tvlToRadius(tvl: number): number {
  const minR = 0.5;
  const maxR = 3.2;
  const sqrtMin = Math.sqrt(1_000_000);      // $1M floor
  const sqrtMax = Math.sqrt(20_000_000_000); // $20B ceiling
  const v = Math.min(Math.max(Math.sqrt(tvl), sqrtMin), sqrtMax);
  return minR + ((v - sqrtMin) / (sqrtMax - sqrtMin)) * (maxR - minR);
}

function makeGlowTexture(hexColor: string): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  grad.addColorStop(0.0, hexColor + "ff");
  grad.addColorStop(0.4, hexColor + "88");
  grad.addColorStop(0.8, hexColor + "22");
  grad.addColorStop(1.0, hexColor + "00");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function makeProtocolLabel(protocol: Protocol, sphereRadius: number): THREE.Sprite {
  const W = 220;
  const H = 52;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(4,5,10,0.75)";
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 10);
  ctx.fill();

  const color = categoryColor(protocol.category);
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(protocol.name, W / 2, H * 0.38);

  ctx.font = "13px system-ui, sans-serif";
  ctx.fillStyle = "rgba(180,180,220,0.65)";
  ctx.fillText(formatTVL(protocol.tvl), W / 2, H * 0.72);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  const scale = Math.max(sphereRadius * 3.5, 8);
  sprite.scale.set(scale, scale * (H / W), 1);
  sprite.position.set(0, sphereRadius + scale * (H / W) * 0.6 + 0.5, 0);
  return sprite;
}

// Tier radii: inner (rank 1-4), mid (5-8), outer (9-12)
const TIER_RADII = [14, 24, 36];
const TIER_SPEEDS = [0.22, 0.14, 0.09];

export function createSystemView(
  protocols: Protocol[],
  center: THREE.Vector3
): { group: THREE.Group; stars: ProtocolStar[] } {
  const group = new THREE.Group();
  group.position.copy(center);
  const stars: ProtocolStar[] = [];

  // Faint orbit ring guides
  for (let t = 0; t < 3; t++) {
    const ringGeo = new THREE.TorusGeometry(TIER_RADII[t], 0.06, 2, 80);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x334455,
      transparent: true,
      opacity: 0.25,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }

  // Assign each protocol to a tier by TVL rank
  protocols.forEach((protocol, i) => {
    const tier = Math.min(Math.floor(i / 4), 2);
    const positionInTier = i - tier * 4;
    const countInTier = Math.min(protocols.length - tier * 4, 4);
    const angle = (positionInTier / countInTier) * Math.PI * 2;

    const orbitRadius = TIER_RADII[tier];
    const orbitY = (Math.random() - 0.5) * 3;
    const orbitSpeed = TIER_SPEEDS[tier] * (0.85 + Math.random() * 0.3);
    const color = categoryColor(protocol.category);
    const radius = tvlToRadius(protocol.tvl);

    // Sphere
    const threeColor = new THREE.Color(color);
    const geo = new THREE.SphereGeometry(radius, 24, 24);
    const mat = new THREE.MeshStandardMaterial({
      color: threeColor,
      emissive: threeColor,
      emissiveIntensity: 0.6,
      roughness: 0.4,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      Math.cos(angle) * orbitRadius,
      orbitY,
      Math.sin(angle) * orbitRadius
    );
    mesh.userData = { protocolSlug: protocol.slug };
    group.add(mesh);

    // Glow sprite
    const glowTex = makeGlowTexture(color);
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const glowSprite = new THREE.Sprite(glowMat);
    const glowSize = radius * 5;
    glowSprite.scale.set(glowSize, glowSize, 1);
    mesh.add(glowSprite);

    // Label
    const label = makeProtocolLabel(protocol, radius);
    mesh.add(label);

    stars.push({
      mesh,
      glowSprite,
      label,
      protocol,
      orbitRadius,
      orbitSpeed,
      orbitAngle: angle,
      orbitY,
    });
  });

  return { group, stars };
}

export function tickStars(stars: ProtocolStar[], delta: number) {
  for (const star of stars) {
    star.orbitAngle += star.orbitSpeed * delta;
    star.mesh.position.set(
      Math.cos(star.orbitAngle) * star.orbitRadius,
      star.orbitY,
      Math.sin(star.orbitAngle) * star.orbitRadius
    );
    star.mesh.rotation.y += delta * 0.25;
  }
}

export function formatTVL(tvl: number): string {
  if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(1)}B`;
  if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(0)}M`;
  return `$${tvl.toLocaleString()}`;
}
