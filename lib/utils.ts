import { type Address, getAddress, isAddress } from "viem";

export function shortAddress(value?: string) { return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "—"; }
export function cleanUsername(value: string) { return value.trim().replace(/^@/, "").toLowerCase(); }
export function asAddress(value: string): Address | undefined { return isAddress(value) ? getAddress(value) : undefined; }
export function explorerTx(hash: string) { const base = process.env.NEXT_PUBLIC_EXPLORER_URL?.replace(/\/$/, ""); return base ? `${base}/tx/${hash}` : undefined; }

export function formatFriendlyError(error: any): string {
  if (!error) return "";
  const msg = typeof error === "string" ? error : (error.message || String(error));
  if (
    msg.includes("User rejected") ||
    msg.includes("User denied") ||
    msg.includes("rejected the request") ||
    msg.includes("denied transaction signature")
  ) {
    return "Transaction rejected in wallet.";
  }
  if (msg.includes("connector not found") || msg.includes("Provider not found")) {
    return "Wallet provider not found. Please connect your wallet.";
  }
  const cleanMsg = msg.split("Request Arguments:")[0].split("Contract Call:")[0].trim();
  return cleanMsg;
}

