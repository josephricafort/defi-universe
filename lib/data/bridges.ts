import { CHAIN_CATALOG, type Chain } from "@/lib/data/chains";

export interface WormholeEdge {
  from: Chain; // always Ethereum (or the L1 anchor for that chain)
  to: Chain;
  volume24h: number; // USD — sum of deposits + withdrawals
}

// DefiLlama bridge volume endpoint returns daily buckets like:
// { date: number, depositUSD: number, withdrawUSD: number }[]
// We sum the most recent bucket (index -1) for a 24h approximation.
// This is a simplification: all L2/sidechain volume is connected to Ethereum
// as the most common bridge counterpart. Bitcoin is excluded (no EVM bridging).
// Noted here so it can be refined with actual chain-pair data later.

const SKIP_CHAINS = new Set(["ethereum", "bitcoin"]); // no self-loop; Bitcoin has negligible EVM bridge volume in this dataset

let cachedEdges: WormholeEdge[] | null = null;
let fetchPromise: Promise<WormholeEdge[]> | null = null;

export async function fetchWormholeEdges(): Promise<WormholeEdge[]> {
  if (cachedEdges) return cachedEdges;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async (): Promise<WormholeEdge[]> => {
    const ethereum = CHAIN_CATALOG.find((c) => c.id === "ethereum")!;
    const candidates = CHAIN_CATALOG.filter((c) => !SKIP_CHAINS.has(c.id));

    // Fan-out fetches in parallel — one per chain; gracefully skip any that fail
    const results = await Promise.allSettled(
      candidates.map(async (chain) => {
        const llamaName = encodeURIComponent(chain.llamaName);
        const res = await fetch(
          `https://bridges.llama.fi/bridgevolume/${llamaName}`,
          { signal: AbortSignal.timeout(8_000) }
        );
        if (!res.ok) throw new Error(`${chain.id}: ${res.status}`);

        const data: Array<{ date: number; depositUSD: number; withdrawUSD: number }> =
          await res.json();

        if (!data.length) throw new Error(`${chain.id}: empty`);

        // Most-recent complete day
        const latest = data[data.length - 1];
        const volume24h = (latest.depositUSD ?? 0) + (latest.withdrawUSD ?? 0);

        if (volume24h <= 0) throw new Error(`${chain.id}: zero volume`);

        return { from: ethereum, to: chain, volume24h } satisfies WormholeEdge;
      })
    );

    const edges: WormholeEdge[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") edges.push(r.value);
    }

    cachedEdges = edges;
    return edges;
  })();

  return fetchPromise;
}
