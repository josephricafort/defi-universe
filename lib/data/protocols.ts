export interface Protocol {
  name: string;
  slug: string;
  tvl: number;
  category: string;
  description: string;
  chains: string[];
  // resolved after filtering
  chainTvl?: number;
}

export interface ProtocolFees {
  totalFees24h: number | null;
  totalRevenue24h: number | null;
}

export const CATEGORY_COLOR: Record<string, string> = {
  Lending: "#1D9E75",
  Dexes: "#185FA5",
  Yield: "#854F0B",
  "Liquid Staking": "#854F0B",
  "Yield Aggregator": "#854F0B",
  Derivatives: "#993C1D",
  CDP: "#72243E",
  RWA: "#72243E",
  Bridge: "#5A4E8A",
  "Cross Chain": "#5A4E8A",
};

export function categoryColor(category: string): string {
  return CATEGORY_COLOR[category] ?? "#5F5E5A";
}

// Module-level cache — fetched once per browser session, shared across chain views
let protocolsCache: Protocol[] | null = null;
let protocolsFetchPromise: Promise<Protocol[]> | null = null;

export async function getProtocols(): Promise<Protocol[]> {
  if (protocolsCache) return protocolsCache;
  if (protocolsFetchPromise) return protocolsFetchPromise;

  protocolsFetchPromise = (async () => {
    try {
      const res = await fetch("https://api.llama.fi/protocols", {
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) throw new Error(`protocols ${res.status}`);
      const raw: Array<{
        name: string;
        slug: string;
        tvl: number;
        category: string;
        description?: string;
        chains: string[];
        chainTvls?: Record<string, number>;
      }> = await res.json();

      protocolsCache = raw.map((p) => ({
        name: p.name,
        slug: p.slug,
        tvl: p.tvl ?? 0,
        category: p.category ?? "Other",
        description: p.description ?? "",
        chains: p.chains ?? [],
      }));
      return protocolsCache;
    } catch {
      protocolsCache = [];
      return [];
    }
  })();

  return protocolsFetchPromise;
}

// Returns top N protocols for a chain, sorted by TVL desc
export async function getProtocolsForChain(
  llamaChainName: string,
  limit = 12
): Promise<Protocol[]> {
  const all = await getProtocols();
  return all
    .filter(
      (p) =>
        p.tvl > 0 &&
        p.chains.some((c) => c.toLowerCase() === llamaChainName.toLowerCase())
    )
    .sort((a, b) => b.tvl - a.tvl)
    .slice(0, limit);
}

export async function fetchProtocolFees(slug: string): Promise<ProtocolFees> {
  try {
    const res = await fetch(`https://api.llama.fi/summary/fees/${slug}`, {
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return { totalFees24h: null, totalRevenue24h: null };
    const data = await res.json();
    return {
      totalFees24h: data.total24h ?? null,
      totalRevenue24h: data.totalRevenue24h ?? null,
    };
  } catch {
    return { totalFees24h: null, totalRevenue24h: null };
  }
}
