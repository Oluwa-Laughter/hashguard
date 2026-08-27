import { zeroAddress, type Address, formatUnits, parseUnits } from "viem";
import { hskChain } from "@/lib/chains";

export type TokenCategory = "native" | "stablecoin" | "defi" | "custom";

export type TokenInfo = {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  isNative?: boolean;
  category: TokenCategory;
  description?: string;
  badge?: string;
};

export const NATIVE_HSK: TokenInfo = {
  address: zeroAddress,
  symbol: "HSK",
  name: "HashKey Token",
  decimals: 18,
  isNative: true,
  category: "native",
  description: "Native gas and governance token of HSKChain",
  badge: "Native Gas",
};

// Official HSKChain Mainnet token addresses (Chain ID: 177)
export const MAINNET_TOKENS: Record<string, TokenInfo> = {
  USDT: {
    address: (process.env.NEXT_PUBLIC_USDT_ADDRESS || "0xf1b50ed67a9e2cc94ad3c477779e2d4cbfff9029") as Address,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    category: "stablecoin",
    description: "Most widely used global USD stablecoin",
    badge: "Stablecoin",
  },
  USDC: {
    address: (process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x054ed45810DbBAb8B27668922D110669c9D88D0a") as Address,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    category: "stablecoin",
    description: "Regulated digital dollar by Circle",
    badge: "Stablecoin",
  },
  WETH: {
    address: (process.env.NEXT_PUBLIC_WETH_ADDRESS || "0xefd4bC9afD210517803f293ABABd701CaeeCdfd0") as Address,
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    category: "defi",
    description: "EVM-standard wrapped Ethereum",
    badge: "DeFi Asset",
  },
  WBTC: {
    address: (process.env.NEXT_PUBLIC_WBTC_ADDRESS || "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599") as Address,
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    decimals: 8,
    category: "defi",
    description: "EVM-standard wrapped Bitcoin",
    badge: "DeFi Asset",
  },
  WHSK: {
    address: (process.env.NEXT_PUBLIC_WHSK_ADDRESS || "0x0cEC5E1f3fb30BD89Acc67eC4af516284b1bC33c") as Address,
    symbol: "WHSK",
    name: "Wrapped HSK",
    decimals: 18,
    category: "defi",
    description: "Wrapped HSK utility token",
    badge: "DeFi Asset",
  },
};

// Testnet token addresses with environment variable overrides
export const TESTNET_TOKENS: Record<string, TokenInfo> = {
  USDT: {
    address: (process.env.NEXT_PUBLIC_USDT_ADDRESS || "0xdAC17F958D2ee523a2206206994597C13D831ec7") as Address,
    symbol: "USDT",
    name: "Tether USD (Testnet)",
    decimals: 6,
    category: "stablecoin",
    description: "Global standard USD stablecoin",
    badge: "Stablecoin",
  },
  USDC: {
    address: (process.env.NEXT_PUBLIC_USDC_ADDRESS || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48") as Address,
    symbol: "USDC",
    name: "USD Coin (Testnet)",
    decimals: 6,
    category: "stablecoin",
    description: "Regulated digital dollar by Circle",
    badge: "Stablecoin",
  },
  WETH: {
    address: (process.env.NEXT_PUBLIC_WETH_ADDRESS || "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2") as Address,
    symbol: "WETH",
    name: "Wrapped Ether (Testnet)",
    decimals: 18,
    category: "defi",
    description: "Wrapped Ether",
    badge: "DeFi Asset",
  },
  WBTC: {
    address: (process.env.NEXT_PUBLIC_WBTC_ADDRESS || "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599") as Address,
    symbol: "WBTC",
    name: "Wrapped Bitcoin (Testnet)",
    decimals: 8,
    category: "defi",
    description: "Wrapped Bitcoin",
    badge: "DeFi Asset",
  },
  WHSK: {
    address: (process.env.NEXT_PUBLIC_WHSK_ADDRESS || "0x0cEC5E1f3fb30BD89Acc67eC4af516284b1bC33c") as Address,
    symbol: "WHSK",
    name: "Wrapped HSK (Testnet)",
    decimals: 18,
    category: "defi",
    description: "Wrapped HSK Token",
    badge: "DeFi Asset",
  },
};

/**
 * Returns all supported tokens for the active network (HSKChain Testnet or Mainnet).
 */
export function getSupportedTokens(): TokenInfo[] {
  const isMainnet = hskChain.id === 177;
  const tokenMap = isMainnet ? MAINNET_TOKENS : TESTNET_TOKENS;
  return [NATIVE_HSK, ...Object.values(tokenMap)];
}

/**
 * Returns all stablecoins supported on the active network.
 */
export function getSupportedStablecoins(): TokenInfo[] {
  return getSupportedTokens().filter((t) => t.category === "stablecoin");
}

/**
 * Finds a token by its symbol (case-insensitive).
 */
export function findTokenBySymbol(symbol: string): TokenInfo | undefined {
  if (!symbol) return undefined;
  const upper = symbol.toUpperCase();
  if (upper === "HSK") return NATIVE_HSK;
  const tokens = getSupportedTokens();
  return tokens.find((t) => t.symbol.toUpperCase() === upper);
}

/**
 * Finds a token by its contract address.
 */
export function findTokenByAddress(address: Address | string): TokenInfo | undefined {
  if (isNativeToken(address)) return NATIVE_HSK;
  const lower = address.toLowerCase();
  const tokens = getSupportedTokens();
  return tokens.find((t) => t.address.toLowerCase() === lower);
}

export function isNativeToken(address: Address | string): boolean {
  return !address || address.toLowerCase() === zeroAddress.toLowerCase();
}

export function isStablecoin(token: TokenInfo | string): boolean {
  if (typeof token === "string") {
    const found = findTokenBySymbol(token) || findTokenByAddress(token);
    return found?.category === "stablecoin";
  }
  return token.category === "stablecoin";
}

export function formatTokenBalance(amount: bigint, decimals: number = 18, maxDecimals: number = 4): string {
  const formatted = formatUnits(amount, decimals);
  const parts = formatted.split(".");
  if (parts.length === 1) return parts[0];
  const decimalPart = parts[1].slice(0, maxDecimals).replace(/0+$/, "");
  return decimalPart ? `${parts[0]}.${decimalPart}` : parts[0];
}

export function parseTokenValue(amountStr: string, decimals: number = 18): bigint {
  if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) <= 0) return 0n;
  try {
    return parseUnits(amountStr, decimals);
  } catch {
    return 0n;
  }
}
