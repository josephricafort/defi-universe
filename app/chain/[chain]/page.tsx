import type { Metadata } from "next";
import CosmosScene from "@/components/CosmosScene";
import { CHAIN_CATALOG } from "@/lib/data/chains";
import { formatTVL } from "@/lib/scene/labels";

interface Props {
  params: Promise<{ chain: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chain } = await params;
  const found = CHAIN_CATALOG.find((c) => c.id === chain);
  const name = found?.name ?? chain;
  const tvlStr = found ? ` · ${formatTVL(found.tvl)} TVL` : "";
  return {
    title: `${name} — DeFi Cosmos`,
    description: found
      ? `Explore ${name}${tvlStr} in DeFi Cosmos — an interactive 3D map of the DeFi ecosystem. ${found.description}`
      : `Explore ${name} protocols in DeFi Cosmos.`,
    openGraph: {
      title: `${name} — DeFi Cosmos`,
      description: found?.description ?? `Explore ${name} in DeFi Cosmos.`,
      type: "website",
    },
  };
}

// Renders the full scene pre-focused on this chain.
// CosmosScene reads initialChain and jumps directly into system view on mount.
export default async function ChainPage({ params }: Props) {
  const { chain } = await params;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#04050a]">
      <CosmosScene initialChain={chain} />

      {/* Branding */}
      <header className="pointer-events-none absolute left-6 top-5 z-20 select-none">
        <h1 className="text-xl font-bold tracking-widest text-white/90">
          DeFi <span className="text-indigo-400">Cosmos</span>
        </h1>
      </header>
    </main>
  );
}
