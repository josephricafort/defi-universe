import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export interface FlyHandle {
  cancel: () => void;
  promise: Promise<void>;
}

// Tween camera position + quaternion toward a target position.
// Used during Z0→Z1 transition where FlyControls is active (no controls.target).
export function tweenCamera(
  camera: THREE.PerspectiveCamera,
  toPosition: THREE.Vector3,
  toLookAt: THREE.Vector3,
  duration = 1.2
): FlyHandle {
  const fromPos = camera.position.clone();
  const fromQuat = camera.quaternion.clone();

  // Compute target quaternion by pointing a temp camera at toLookAt
  const tempCam = camera.clone();
  tempCam.position.copy(toPosition);
  tempCam.lookAt(toLookAt);
  const toQuat = tempCam.quaternion.clone();

  let elapsed = 0;
  let cancelled = false;
  let rafId: number;

  const promise = new Promise<void>((resolve) => {
    function tick(dt: number) {
      if (cancelled) { resolve(); return; }
      elapsed += dt;
      const t = Math.min(elapsed / duration, 1);
      const e = easeInOutQuad(t);
      camera.position.lerpVectors(fromPos, toPosition, e);
      camera.quaternion.slerpQuaternions(fromQuat, toQuat, e);
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

// Used for Z1→Z0 return: tween camera back to saved home position + orientation
export function tweenCameraBack(
  camera: THREE.PerspectiveCamera,
  toPosition: THREE.Vector3,
  toQuaternion: THREE.Quaternion,
  duration = 1.2
): FlyHandle {
  const fromPos = camera.position.clone();
  const fromQuat = camera.quaternion.clone();
  let elapsed = 0;
  let cancelled = false;
  let rafId: number;

  const promise = new Promise<void>((resolve) => {
    function tick(dt: number) {
      if (cancelled) { resolve(); return; }
      elapsed += dt;
      const t = Math.min(elapsed / duration, 1);
      const e = easeInOutQuad(t);
      camera.position.lerpVectors(fromPos, toPosition, e);
      camera.quaternion.slerpQuaternions(fromQuat, toQuaternion, e);
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

// OrbitControls-based fly-to — used inside Z1 view for protocol star focus
export function flyTo(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  targetPosition: THREE.Vector3,
  options: { duration?: number; offsetDistance?: number } = {}
): FlyHandle {
  const duration = options.duration ?? 1.2;
  const offsetDistance = options.offsetDistance ?? 30;

  const fromPos = camera.position.clone();
  const fromTarget = controls.target.clone();

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
    cancel: () => { cancelled = true; cancelAnimationFrame(rafId); },
    promise,
  };
}

export function fadePoints(points: THREE.Points, targetOpacity: number, alpha: number) {
  const mat = points.material as THREE.PointsMaterial;
  mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, alpha);
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

// Keep flyBack as alias for backward compat
export const flyBack = flyTo;
