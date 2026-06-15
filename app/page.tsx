import type { Metadata } from "next";
import CosmosScene from "@/components/CosmosScene";

export const metadata: Metadata = {
  title: "DeFi Cosmos — An Interactive Map of the DeFi Ecosystem",
  description:
    "Explore the decentralized finance universe in 3D. Navigate chains by TVL, discover protocols, and understand how DeFi is structured — built for curious newcomers.",
  openGraph: {
    title: "DeFi Cosmos",
    description:
      "An interactive 3D map of the DeFi ecosystem. Click any chain to explore.",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#04050a]">
      {/* Full-viewport 3D scene — owns its own data fetch */}
      <CosmosScene />

      {/* Branding — top left */}
      <header className="pointer-events-none absolute left-6 top-5 z-20 select-none">
        <h1 className="text-xl font-bold tracking-widest text-white/90">
          DeFi <span className="text-indigo-400">Cosmos</span>
        </h1>
        <p className="mt-0.5 text-[11px] uppercase tracking-widest text-white/35">
          Universe View · Z0
        </p>
      </header>

      {/* Hint — bottom right */}
      <p className="pointer-events-none absolute bottom-5 right-5 z-20 select-none text-xs text-white/25">
        Drag to orbit · Scroll to zoom · Click a chain
      </p>
    </main>
  );
}
