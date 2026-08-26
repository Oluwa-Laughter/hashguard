export type AgentIntent =
  | {
      action: "protected_transfer";
      recipient: string;
      amount: string;
      token: "native" | "token";
      tokenSymbol?: string;
      tokenAddress?: string;
      expiryDays: number;
    }
  | {
      action: "batch_payment";
      payments: Array<{ recipient: string; amount: string }>;
      token: "native" | "token";
      tokenSymbol?: string;
      tokenAddress?: string;
    }
  | { action: "wallet_balance"; tokenSymbol?: string }
  | { action: "payment_history" }
  | { action: "explain_payment" }
  | { action: "unknown"; message: string };

/** The browser executes these read/preparation tools; no tool has signing authority. */
export const agentTools = [
  "resolve_username",
  "get_wallet_balance",
  "get_token_balance",
  "prepare_protected_payment",
  "prepare_batch_payment",
  "get_payment_history",
  "get_escrow_details",
  "explain_payment",
] as const;

export function fallbackIntent(message: string): AgentIntent {
  const text = message.trim();
  const lower = text.toLowerCase();

  if (/balance|how much.*(hsk|usdc|usdt|weth|token|crypto)/.test(lower)) {
    const tokenMatch = lower.match(/\b(hsk|usdc|usdt|weth)\b/);
    return {
      action: "wallet_balance",
      tokenSymbol: tokenMatch ? tokenMatch[1].toUpperCase() : "HSK",
    };
  }

  if (/recent|history|payments/.test(lower) && !/send|pay\b/.test(lower)) {
    return { action: "payment_history" };
  }

  if (/what is|explain.*escrow|explain.*payment|how does.*work/.test(lower)) {
    return { action: "explain_payment" };
  }

  // Detect token symbol
  let detectedSymbol = "HSK";
  let isErc20 = false;
  if (/\busdt\b/i.test(text)) {
    detectedSymbol = "USDT";
    isErc20 = true;
  } else if (/\busdc\b/i.test(text)) {
    detectedSymbol = "USDC";
    isErc20 = true;
  } else if (/\bweth\b/i.test(text)) {
    detectedSymbol = "WETH";
    isErc20 = true;
  }

  // Detect batch payment pattern (e.g. "@alice 1, @bob 2" or "1 to @alice, 2 to @bob")
  const batch = [...text.matchAll(/(@[a-zA-Z0-9_]+)\s+(\d+(?:\.\d+)?)/g)];
  if (batch.length > 1) {
    return {
      action: "batch_payment",
      token: isErc20 ? "token" : "native",
      tokenSymbol: detectedSymbol,
      payments: batch.map((match) => ({ recipient: match[1], amount: match[2] })),
    };
  }

  // Detect protected single payment pattern
  // Matches: "send 10 USDT to @alice for 5 days" or "pay 1.5 HSK to 0x123... for 7 days"
  const match = text.match(
    /(?:send|pay)\s+(\d+(?:\.\d+)?)\s*(hsk|usdc|usdt|weth)?\s+(?:to\s+)?(@[a-zA-Z0-9_]+|0x[a-fA-F0-9]{40})(?:.*?(?:for\s+)?(\d+)\s*days?)?/i
  );

  if (match) {
    const symbolFromMatch = match[2]?.toUpperCase() || detectedSymbol;
    const isErc = symbolFromMatch !== "HSK";
    return {
      action: "protected_transfer",
      amount: match[1],
      token: isErc ? "token" : "native",
      tokenSymbol: symbolFromMatch,
      recipient: match[3],
      expiryDays: Number(match[4] || 7),
    };
  }

  return {
    action: "unknown",
    message:
      "I can prepare protected single and batch payments (in HSK, USDT, USDC, or custom tokens), check balances, and explain HashGuard escrow protection.",
  };
}
