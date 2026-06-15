"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createOrbitControls } from "@/lib/controls/orbitControls";
import { pickOrb } from "@/lib/controls/raycaster";
import {
  createGalaxyField,
  tickOrbs,
  type ChainOrb,
} from "@/lib/scene/galaxyField";
import { createStarfield } from "@/lib/scene/starfield";
import { createChainLabel, formatTVL } from "@/lib/scene/labels";
import { fetchChains, type Chain, type FetchStatus } from "@/lib/data/chains";

interface HoverInfo {
  chain: Chain;
  x: number;
  y: number;
}

export default function CosmosScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<HoverInfo | null>(null);
  const [selected, setSelected] = useState<Chain | null>(null);
  const [dataStatus, setDataStatus] = useState<FetchStatus | "loading">("loading");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);

    // ── Scene ─────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04050a);

    // ── Camera ────────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / mount.clientHeight,
      0.5,
      1200
    );
    camera.position.set(0, 55, 160);
    camera.lookAt(0, 0, 0);

    // ── Lighting ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x1a1a3a, 3.5));
    const keyLight = new THREE.PointLight(0xffffff, 4, 600);
    keyLight.position.set(30, 120, 60);
    scene.add(keyLight);

    // ── Background starfield (long-tail minor chains, decorative) ─────────────
    scene.add(createStarfield());

    // ── Controls ──────────────────────────────────────────────────────────────
    const controls = createOrbitControls(camera, renderer.domElement);

    // ── Render loop (start immediately, orbs added async below) ───────────────
    const clock = new THREE.Clock();
    let animId: number;
    let orbs: ChainOrb[] = [];

    function animate() {
      animId = requestAnimationFrame(animate);
      tickOrbs(orbs, clock.getDelta());
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // ── Resize ────────────────────────────────────────────────────────────────
    function onResize() {
      camera.aspect = mount!.clientWidth / mount!.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount!.clientWidth, mount!.clientHeight);
    }
    window.addEventListener("resize", onResize);

    // ── Fetch chains + build scene objects ────────────────────────────────────
    let destroyed = false;

    fetchChains().then(({ chains, status }) => {
      if (destroyed) return;

      setDataStatus(status);

      const { group, orbs: newOrbs } = createGalaxyField(chains);
      scene.add(group);
      orbs = newOrbs;

      // Attach labels to each sphere
      orbs.forEach((orb) => {
        const r = (orb.mesh.geometry as THREE.SphereGeometry).parameters.radius;
        const label = createChainLabel(orb.chain, r);
        orb.mesh.add(label);
      });
    });

    // ── Pointer: hover ────────────────────────────────────────────────────────
    let hoveredOrb: ChainOrb | null = null;

    function onMouseMove(e: MouseEvent) {
      const hit = pickOrb(e, mount!, camera, orbs);

      if (hit) {
        const rect = mount!.getBoundingClientRect();
        setHovered({
          chain: hit.orb.chain,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        document.body.style.cursor = "pointer";
      } else {
        setHovered(null);
        document.body.style.cursor = "default";
      }

      // Adjust emissive intensity for hover highlight
      if (hoveredOrb && hoveredOrb !== hit?.orb) {
        (hoveredOrb.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55;
      }
      if (hit?.orb) {
        (hit.orb.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4;
        hoveredOrb = hit.orb;
      } else {
        hoveredOrb = null;
      }
    }

    // ── Pointer: click ────────────────────────────────────────────────────────
    function onClick(e: MouseEvent) {
      const hit = pickOrb(e, mount!, camera, orbs);
      if (hit) {
        const { chain } = hit.orb;
        console.log(`[DeFi Cosmos] clicked: ${chain.name} | TVL: ${formatTVL(chain.tvl)}`);
        setSelected(chain);
        controls.autoRotate = false;
      } else {
        setSelected(null);
        controls.autoRotate = true;
      }
    }

    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("click", onClick);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      destroyed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      document.body.style.cursor = "default";
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Three.js canvas */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Status indicator — top right */}
      <div className="pointer-events-none absolute right-5 top-5 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur-sm">
        {dataStatus === "loading" && (
          <>
            <span className="h-2 w-2 animate-pulse rounded-full bg-white/40" />
            <span className="text-xs text-white/40">Connecting…</span>
          </>
        )}
        {dataStatus === "live" && (
          <>
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <span className="text-xs text-white/60">
              Live · <span className="text-white/80">DeFiLlama</span>
            </span>
          </>
        )}
        {dataStatus === "fallback" && (
          <>
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-xs text-white/60">Snapshot data</span>
          </>
        )}
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl border border-white/10 bg-black/75 px-3 py-2 text-sm backdrop-blur-sm"
          style={{ left: hovered.x + 16, top: hovered.y - 12 }}
        >
          <p className="font-semibold text-white">{hovered.chain.name}</p>
          <p className="text-white/55">{formatTVL(hovered.chain.tvl)} TVL</p>
        </div>
      )}

      {/* Selected chain panel — bottom centre */}
      {selected && (
        <div className="absolute bottom-8 left-1/2 z-10 w-80 -translate-x-1/2 rounded-2xl border border-white/10 bg-black/80 p-5 backdrop-blur-md">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-white">{selected.name}</h2>
              <p className="mt-1 text-sm text-white/55">{selected.description}</p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="mt-0.5 shrink-0 text-white/35 transition hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: selected.color }}
            />
            <span className="text-sm font-medium text-white/75">
              {formatTVL(selected.tvl)} TVL
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
