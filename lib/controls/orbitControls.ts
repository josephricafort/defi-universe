import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function createOrbitControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement
): OrbitControls {
  const controls = new OrbitControls(camera, domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.8;

  // Free navigation — no orbit lock, no auto-rotate
  controls.enablePan = true;
  controls.autoRotate = false;

  // Universe view zoom range
  controls.minDistance = 15;
  controls.maxDistance = 500;

  // No polar clamping — free vertical orbit
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;

  return controls;
}
