import * as THREE from "three";

// A few thousand dim points representing the "long tail" of ~500+ minor chains
// tracked by DefiLlama — purely atmospheric, not interactive.
export function createStarfield(count = 3_500): THREE.Points {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Distribute within a shell that sits just beyond the main chain orbs
    // (orbs span roughly ±130 units) but well inside the far clipping plane.
    const r = 180 + Math.random() * 320;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    // Vary point size slightly for a more natural look
    sizes[i] = 0.6 + Math.random() * 1.2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xaaaacc,
    size: 0.9,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.55,
    fog: false,
  });

  return new THREE.Points(geometry, material);
}
