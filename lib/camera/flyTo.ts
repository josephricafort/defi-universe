import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export interface FlyToOptions {
  duration?: number; // seconds, default 1.2
  offsetDistance?: number; // how far from target center, default 30
}

export interface FlyHandle {
  cancel: () => void;
  promise: Promise<void>;
}

// Tweens camera.position and controls.target to look at `targetPosition`.
// Returns a handle so the caller can cancel mid-flight.
export function flyTo(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  targetPosition: THREE.Vector3,
  options: FlyToOptions = {}
): FlyHandle {
  const duration = options.duration ?? 1.2;
  const offsetDistance = options.offsetDistance ?? 30;

  const fromPos = camera.position.clone();
  const fromTarget = controls.target.clone();

  // Approach from current camera direction, stopping `offsetDistance` away
  const dir = camera.position.clone().sub(targetPosition).normalize();
  const toPos = targetPosition.clone().add(dir.multiplyScalar(offsetDistance));
  const toTarget = targetPosition.clone();

  let elapsed = 0;
  let cancelled = false;
  let rafId: number;

  const promise = new Promise<void>((resolve) => {
    function tick(dt: number) {
      if (cancelled) { resolve(); return; }

      elapsed += dt;
      const t = Math.min(elapsed / duration, 1);
      const e = easeInOutQuad(t);

      camera.position.lerpVectors(fromPos, toPos, e);
      controls.target.lerpVectors(fromTarget, toTarget, e);
      controls.update();

      if (t < 1) {
        rafId = requestAnimationFrame(() => tick(1 / 60));
      } else {
        resolve();
      }
    }
    rafId = requestAnimationFrame(() => tick(1 / 60));
  });

  return {
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    },
    promise,
  };
}

export function flyBack(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  homePos: THREE.Vector3,
  homeTarget: THREE.Vector3,
  duration = 1.2
): FlyHandle {
  const fromPos = camera.position.clone();
  const fromTarget = controls.target.clone();
  let elapsed = 0;
  let cancelled = false;
  let rafId: number;

  const promise = new Promise<void>((resolve) => {
    function tick(dt: number) {
      if (cancelled) { resolve(); return; }
      elapsed += dt;
      const t = Math.min(elapsed / duration, 1);
      const e = easeInOutQuad(t);
      camera.position.lerpVectors(fromPos, homePos, e);
      controls.target.lerpVectors(fromTarget, homeTarget, e);
      controls.update();
      if (t < 1) {
        rafId = requestAnimationFrame(() => tick(1 / 60));
      } else {
        resolve();
      }
    }
    rafId = requestAnimationFrame(() => tick(1 / 60));
  });

  return {
    cancel: () => { cancelled = true; cancelAnimationFrame(rafId); },
    promise,
  };
}

// Lerp the opacity of a PointsMaterial or SpriteMaterial toward `target`
export function fadePoints(points: THREE.Points, targetOpacity: number, alpha: number) {
  const mat = points.material as THREE.PointsMaterial;
  mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, alpha);
  mat.needsUpdate = true;
}

export function fadeOrbs(
  orbs: Array<{ mesh: THREE.Mesh; glowSprite: THREE.Sprite }>,
  targetOpacity: number,
  alpha: number
) {
  for (const orb of orbs) {
    const mat = orb.mesh.material as THREE.MeshStandardMaterial;
    mat.transparent = true;
    mat.opacity = THREE.MathUtils.lerp(mat.opacity ?? 1, targetOpacity, alpha);
    const gMat = orb.glowSprite.material as THREE.SpriteMaterial;
    gMat.opacity = THREE.MathUtils.lerp(gMat.opacity ?? 1, targetOpacity, alpha);
  }
}
