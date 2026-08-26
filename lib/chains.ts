import { defineChain, http } from "viem";

export const hskTestnet = defineChain({
  id: 133,
  name: "HSKChain Testnet",
  nativeCurrency: { name: "HashKey Token", symbol: "HSK", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL || "https://testnet.hsk.xyz"] },
    public: { http: ["https://testnet.hsk.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "HSK Testnet Explorer",
      url: process.env.NEXT_PUBLIC_EXPLORER_URL || "https://testnet-explorer.hskchain.net",
    },
  },
  testnet: true,
});

export const hskMainnet = defineChain({
  id: 177,
  name: "HSKChain",
  nativeCurrency: { name: "HashKey Token", symbol: "HSK", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.hsk.xyz"] },
    public: { http: ["https://mainnet.hsk.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "HashKey Blockscout",
      url: process.env.NEXT_PUBLIC_EXPLORER_URL || "https://hashkey.blockscout.com",
    },
  },
  testnet: false,
});

export const supportedChains = [hskTestnet, hskMainnet] as const;

// Default to HSK Testnet (133) for hackathon build phase unless 177 is explicitly specified
const targetChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 133);
export const hskChain = targetChainId === 177 ? hskMainnet : hskTestnet;

export const hskConfigured = true;
export const hskTransport = http(hskChain.rpcUrls.default.http[0]);
