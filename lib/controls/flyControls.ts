import * as THREE from "three";
import { FlyControls } from "three/examples/jsm/controls/FlyControls.js";

export function createFlyControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement
): FlyControls {
  const controls = new FlyControls(camera, domElement);

  // dragToLook: mouse only steers when button held — idle mouse doesn't spin camera
  controls.dragToLook = true;
  controls.movementSpeed = 25; // scene units/s — tuned for ±130 unit spread
  controls.rollSpeed = 0.4;    // radians/s

  return controls;
}

// Scroll wheel zooms by moving camera forward/backward along its look direction
export function applyScrollZoom(
  camera: THREE.Camera,
  event: WheelEvent,
  speed = 0.12
) {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const delta = -event.deltaY * speed;
  camera.position.addScaledVector(dir, delta);
}
