import { defineChain, http } from "viem";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 0);
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "";

/** HSK values are deployment configuration, not application defaults. */
export const hskConfigured = Number.isInteger(chainId) && chainId > 0 && Boolean(rpcUrl);
export const hskChain = defineChain({
  id: chainId,
  name: "HSK Chain",
  nativeCurrency: { name: "HSK", symbol: "HSK", decimals: 18 },
  rpcUrls: { default: { http: rpcUrl ? [rpcUrl] : [] } },
  blockExplorers: process.env.NEXT_PUBLIC_EXPLORER_URL
    ? { default: { name: "HSK Explorer", url: process.env.NEXT_PUBLIC_EXPLORER_URL } }
    : undefined
});

export const hskTransport = http(rpcUrl || undefined);

