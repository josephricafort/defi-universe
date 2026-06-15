import * as THREE from "three";
import type { ChainOrb } from "@/lib/scene/galaxyField";

export interface PickResult {
  orb: ChainOrb;
  point: THREE.Vector3;
}

// Returns the first orb under the pointer, or null
export function pickOrb(
  event: MouseEvent | Touch,
  container: HTMLElement,
  camera: THREE.Camera,
  orbs: ChainOrb[]
): PickResult | null {
  const rect = container.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  const pointer = new THREE.Vector2(x, y);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(pointer, camera);

  const meshes = orbs.map((o) => o.mesh);
  const hits = ray.intersectObjects(meshes, false);

  if (hits.length === 0) return null;

  const hit = hits[0];
  const orb = orbs.find((o) => o.mesh === hit.object);
  return orb ? { orb, point: hit.point } : null;
}
