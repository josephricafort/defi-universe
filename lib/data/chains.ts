export interface Chain {
  id: string;
  name: string;
  // Normalised name used to match DefiLlama API response
  llamaName: string;
  tvl: number; // USD snapshot used as fallback
  color: string; // hex
  description: string;
  // Hand-placed position in 3D scene — feels like a navigable starfield
  position: [number, number, number];
}

// 18 major chains — positions chosen for good spacing and depth variety.
// x range ≈ ±120, y range ≈ ±35, z range ≈ ±100
export const CHAIN_CATALOG: Chain[] = [
  {
    id: "ethereum",
    llamaName: "Ethereum",
    name: "Ethereum",
    tvl: 63_000_000_000,
    color: "#627EEA",
    description: "The original smart-contract platform and DeFi home.",
    position: [0, 0, 0],
  },
  {
    id: "tron",
    llamaName: "Tron",
    name: "Tron",
    tvl: 20_000_000_000,
    color: "#FF0013",
    description: "High-throughput L1 dominant in stablecoin transfers.",
    position: [-55, 12, -30],
  },
  {
    id: "solana",
    llamaName: "Solana",
    name: "Solana",
    tvl: 8_000_000_000,
    color: "#9945FF",
    description: "High-speed L1 with sub-second finality.",
    position: [70, -8, -50],
  },
  {
    id: "bitcoin",
    llamaName: "Bitcoin",
    name: "Bitcoin",
    tvl: 6_500_000_000,
    color: "#F7931A",
    description: "The original crypto asset, now with native DeFi via Ordinals and L2s.",
    position: [-80, 20, 10],
  },
  {
    id: "base",
    llamaName: "Base",
    name: "Base",
    tvl: 7_500_000_000,
    color: "#0052FF",
    description: "Coinbase-incubated L2 built on the OP Stack.",
    position: [40, 18, 55],
  },
  {
    id: "arbitrum",
    llamaName: "Arbitrum",
    name: "Arbitrum",
    tvl: 12_000_000_000,
    color: "#28A0F0",
    description: "Optimistic rollup scaling Ethereum with low fees.",
    position: [30, -22, -20],
  },
  {
    id: "hyperliquid",
    llamaName: "Hyperliquid",
    name: "Hyperliquid",
    tvl: 3_500_000_000,
    color: "#00D4FF",
    description: "Performant L1 purpose-built for on-chain perpetuals.",
    position: [90, 5, 20],
  },
  {
    id: "bsc",
    llamaName: "BSC",
    name: "BNB Chain",
    tvl: 5_000_000_000,
    color: "#F3BA2F",
    description: "High-throughput EVM-compatible chain by Binance.",
    position: [-35, -15, 60],
  },
  {
    id: "optimism",
    llamaName: "OP Mainnet",
    name: "Optimism",
    tvl: 6_000_000_000,
    color: "#FF0420",
    description: "Optimistic rollup and home of the Superchain.",
    position: [-20, 30, -70],
  },
  {
    id: "avalanche",
    llamaName: "Avalanche",
    name: "Avalanche",
    tvl: 800_000_000,
    color: "#E84142",
    description: "Subnet architecture enabling custom blockchains.",
    position: [110, -10, -40],
  },
  {
    id: "polygon",
    llamaName: "Polygon",
    name: "Polygon",
    tvl: 1_100_000_000,
    color: "#8247E5",
    description: "Sidechain + rollup ecosystem anchored to Ethereum.",
    position: [-95, -5, -55],
  },
  {
    id: "sui",
    llamaName: "Sui",
    name: "Sui",
    tvl: 1_800_000_000,
    color: "#4DA2FF",
    description: "Move-based L1 with object-centric model and high throughput.",
    position: [60, 28, -85],
  },
  {
    id: "aptos",
    llamaName: "Aptos",
    name: "Aptos",
    tvl: 900_000_000,
    color: "#00C2A8",
    description: "Move-based L1 focused on safety and parallel execution.",
    position: [-60, -28, 75],
  },
  {
    id: "near",
    llamaName: "Near",
    name: "NEAR",
    tvl: 500_000_000,
    color: "#00C08B",
    description: "Sharded L1 with account abstraction and low fees.",
    position: [115, 22, 60],
  },
  {
    id: "ton",
    llamaName: "TON",
    name: "TON",
    tvl: 700_000_000,
    color: "#0088CC",
    description: "Telegram-integrated blockchain with massive social reach.",
    position: [-110, 15, 40],
  },
  {
    id: "scroll",
    llamaName: "Scroll",
    name: "Scroll",
    tvl: 600_000_000,
    color: "#FFDBB3",
    description: "ZK rollup with bytecode-level EVM equivalence.",
    position: [20, -35, 85],
  },
  {
    id: "linea",
    llamaName: "Linea",
    name: "Linea",
    tvl: 550_000_000,
    color: "#61DFFF",
    description: "ConsenSys ZK rollup with native MetaMask integration.",
    position: [-30, 35, -95],
  },
  {
    id: "mantle",
    llamaName: "Mantle",
    name: "Mantle",
    tvl: 1_200_000_000,
    color: "#3CDFB0",
    description: "L2 backed by Bybit with modular architecture.",
    position: [85, -30, 75],
  },
];

export type FetchStatus = "live" | "fallback";

export interface ChainsResult {
  chains: Chain[];
  status: FetchStatus;
}

// Client-side fetch — called from CosmosScene useEffect, NOT a server action.
// Returns live TVLs merged into the catalog, plus a status flag for the UI indicator.
export async function fetchChains(): Promise<ChainsResult> {
  try {
    const res = await fetch("https://api.llama.fi/v2/chains", {
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) throw new Error(`DefiLlama ${res.status}`);

    const raw: Array<{ name: string; tvl: number }> = await res.json();

    const chains = CHAIN_CATALOG.map((known) => {
      const live = raw.find(
        (r) => r.name.toLowerCase() === known.llamaName.toLowerCase()
      );
      return live ? { ...known, tvl: live.tvl } : known;
    });

    return { chains, status: "live" };
  } catch {
    return { chains: CHAIN_CATALOG, status: "fallback" };
  }
}
