export type AgentIntent =
  | { action: "protected_transfer"; recipient: string; amount: string; token: "native" | "token"; expiryDays: number }
  | { action: "batch_payment"; payments: Array<{ recipient: string; amount: string }>; token: "native" | "token" }
  | { action: "wallet_balance" }
  | { action: "payment_history" }
  | { action: "explain_payment" }
  | { action: "unknown"; message: string };

/** The browser executes these read/preparation tools; no tool has signing authority. */
export const agentTools = ["resolve_username", "get_wallet_balance", "get_token_balance", "prepare_protected_payment", "prepare_batch_payment", "get_payment_history", "get_escrow_details", "explain_payment"] as const;

export function fallbackIntent(message: string): AgentIntent {
  const text = message.trim(); const lower = text.toLowerCase();
  if (/balance|how much.*hsk/.test(lower)) return { action: "wallet_balance" };
  if (/recent|history|payments/.test(lower) && !/send|pay @/.test(lower)) return { action: "payment_history" };
  if (/what is|explain.*escrow|explain.*payment/.test(lower)) return { action: "explain_payment" };
  const batch = [...text.matchAll(/(@[a-zA-Z0-9_]+)\s+(\d+(?:\.\d+)?)/g)];
  if (batch.length > 1) return { action: "batch_payment", token: /usdc/i.test(text) ? "token" : "native", payments: batch.map(match => ({ recipient: match[1], amount: match[2] })) };
  const match = text.match(/(?:send|pay)\s+(\d+(?:\.\d+)?)\s*(hsk|usdc)?\s+(?:to\s+)?(@[a-zA-Z0-9_]+|0x[a-fA-F0-9]{40})(?:.*?(?:for\s+)?(\d+)\s*days?)?/i);
  if (match) return { action: "protected_transfer", amount: match[1], token: match[2]?.toLowerCase() === "usdc" ? "token" : "native", recipient: match[3], expiryDays: Number(match[4] || 7) };
  return { action: "unknown", message: "I can prepare protected payments, batch HSK payments, read your balance, and explain escrow protection." };
}

