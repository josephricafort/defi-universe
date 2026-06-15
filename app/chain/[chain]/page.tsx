import type { Metadata } from "next";
import Link from "next/link";
import { CHAIN_CATALOG } from "@/lib/data/chains";

interface Props {
  params: Promise<{ chain: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chain } = await params;
  const found = CHAIN_CATALOG.find((c) => c.id === chain);
  const name = found?.name ?? chain;
  return {
    title: `${name} — DeFi Cosmos`,
    description: found?.description ?? `Explore ${name} in DeFi Cosmos.`,
  };
}

// Scaffold — Z1 detail view (protocol breakdown, fly-to camera) built next session
export default async function ChainPage({ params }: Props) {
  const { chain } = await params;
  const found = CHAIN_CATALOG.find((c) => c.id === chain);

  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-4 bg-[#04050a] text-white">
      <p className="text-[11px] uppercase tracking-widest text-white/35">
        DeFi Cosmos · Z1 — coming next session
      </p>
      <h1 className="text-3xl font-bold" style={{ color: found?.color ?? "white" }}>
        {found?.name ?? chain}
      </h1>
      {found && (
        <p className="max-w-sm text-center text-sm text-white/50">
          {found.description}
        </p>
      )}
      <Link
        href="/"
        className="mt-6 rounded-full border border-white/15 px-5 py-2 text-sm text-white/60 transition hover:border-white/40 hover:text-white"
      >
        ← Back to Universe
      </Link>
    </main>
  );
}
