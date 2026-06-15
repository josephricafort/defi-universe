import * as THREE from "three";
import type { ProtocolStar } from "@/lib/scene/systemView";

export interface StarPickResult {
  star: ProtocolStar;
  point: THREE.Vector3;
}

export function pickStar(
  event: MouseEvent,
  container: HTMLElement,
  camera: THREE.Camera,
  stars: ProtocolStar[]
): StarPickResult | null {
  if (stars.length === 0) return null;

  const rect = container.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(x, y), camera);

  const meshes = stars.map((s) => s.mesh);
  const hits = ray.intersectObjects(meshes, false);
  if (hits.length === 0) return null;

  const hit = hits[0];
  const star = stars.find((s) => s.mesh === hit.object);
  return star ? { star, point: hit.point } : null;
}
