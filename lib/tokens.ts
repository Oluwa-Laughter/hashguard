import { zeroAddress, type Address, formatUnits, parseUnits } from "viem";
import { hskChain } from "@/lib/chains";

export type TokenInfo = {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  isNative?: boolean;
};

export const NATIVE_HSK: TokenInfo = {
  address: zeroAddress,
  symbol: "HSK",
  name: "HashKey Token",
  decimals: 18,
  isNative: true,
};

// Official HSKChain Mainnet token addresses (Chain ID: 177)
export const MAINNET_TOKENS: Record<string, TokenInfo> = {
  USDT: {
    address: "0xf1b50ed67a9e2cc94ad3c477779e2d4cbfff9029" as Address,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
  },
  USDC: {
    address: "0x054ed45810DbBAb8B27668922D110669c9D88D0a" as Address,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  },
  WETH: {
    address: "0xefd4bC9afD210517803f293ABABd701CaeeCdfd0" as Address,
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
  },
};

// Testnet token addresses with environment variable overrides
export const TESTNET_TOKENS: Record<string, TokenInfo> = {
  USDC: {
    address: (process.env.NEXT_PUBLIC_USDC_ADDRESS || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48") as Address,
    symbol: "USDC",
    name: "USD Coin (Testnet)",
    decimals: 6,
  },
  USDT: {
    address: (process.env.NEXT_PUBLIC_USDT_ADDRESS || "0xdAC17F958D2ee523a2206206994597C13D831ec7") as Address,
    symbol: "USDT",
    name: "Tether USD (Testnet)",
    decimals: 6,
  },
};

export function getSupportedTokens(): TokenInfo[] {
  const isMainnet = hskChain.id === 177;
  const tokenMap = isMainnet ? MAINNET_TOKENS : TESTNET_TOKENS;
  return [NATIVE_HSK, ...Object.values(tokenMap)];
}

export function isNativeToken(address: Address | string): boolean {
  return !address || address.toLowerCase() === zeroAddress.toLowerCase();
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
