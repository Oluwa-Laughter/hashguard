import { type Address, getAddress, isAddress } from "viem";

export function shortAddress(value?: string) { return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "—"; }
export function cleanUsername(value: string) { return value.trim().replace(/^@/, "").toLowerCase(); }
export function asAddress(value: string): Address | undefined { return isAddress(value) ? getAddress(value) : undefined; }
export function explorerTx(hash: string) { const base = process.env.NEXT_PUBLIC_EXPLORER_URL?.replace(/\/$/, ""); return base ? `${base}/tx/${hash}` : undefined; }

