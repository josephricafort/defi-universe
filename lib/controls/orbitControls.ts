import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Used only for Z1 system view — orbiting around a focused chain position
export function createOrbitControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement
): OrbitControls {
  const controls = new OrbitControls(camera, domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.8;
  controls.enablePan = false;
  controls.autoRotate = false;

  controls.minDistance = 8;
  controls.maxDistance = 80;

  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;

  return controls;
}
