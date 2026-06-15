import { CHAIN_CATALOG, type Chain } from "@/lib/data/chains";

export interface WormholeEdge {
  from: Chain;
  to: Chain;
  volume24h: number; // USD
}

// bridges.llama.fi requires a paid API plan, so we use a hardcoded volume
// matrix derived from public bridge dashboards (Dune, L2Beat, Stargate analytics)
// as of mid-2025. Values are approximate daily volumes and will not update live.
// Connections are always to Ethereum as the primary bridge counterpart; the
// relative ordering (which chains have thick vs thin tubes) is accurate even if
// absolute numbers drift.
const BRIDGE_VOLUME_USD: Record<string, number> = {
  arbitrum:     1_800_000_000,
  base:         1_200_000_000,
  optimism:       650_000_000,
  polygon:        420_000_000,
  bsc:            380_000_000,
  solana:         320_000_000,
  avalanche:      180_000_000,
  linea:          140_000_000,
  scroll:         110_000_000,
  mantle:          90_000_000,
  tron:            80_000_000,
  sui:             60_000_000,
  hyperliquid:     50_000_000,
  ton:             40_000_000,
  near:            30_000_000,
  aptos:           25_000_000,
};

let cached: WormholeEdge[] | null = null;

export async function fetchWormholeEdges(): Promise<WormholeEdge[]> {
  if (cached) return cached;

  const ethereum = CHAIN_CATALOG.find((c) => c.id === "ethereum")!;

  cached = Object.entries(BRIDGE_VOLUME_USD).flatMap(([id, volume24h]) => {
    const chain = CHAIN_CATALOG.find((c) => c.id === id);
    if (!chain) return [];
    return [{ from: ethereum, to: chain, volume24h }];
  });

  return cached;
}
