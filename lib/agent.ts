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
  | {
      action: "recurring_payment";
      recipient: string;
      amountPerPeriod: string;
      token: "native" | "token";
      tokenSymbol: string;
      interval: "monthly" | "weekly" | "daily";
      frequencyCount: number;
      totalAmount: string;
      schedule: Array<{ period: number; date: string; amount: string }>;
      summary: string;
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
  "prepare_recurring_payment",
  "get_payment_history",
  "get_escrow_details",
  "explain_payment",
] as const;

const numberWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

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

  // Detect Recurring Payment Intent (e.g. "pay @alice 100 USDT monthly for the next six months")
  const isRecurring =
    /recurring|recurrence|monthly|weekly|daily|every month|every week|every day/i.test(text);

  if (isRecurring) {
    const interval: "monthly" | "weekly" | "daily" = /daily|every day/i.test(text)
      ? "daily"
      : /weekly|every week/i.test(text)
      ? "weekly"
      : "monthly";

    const countMatch = text.match(
      /(?:for\s+(?:the\s+next\s+)?|every\s+)(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(?:months?|weeks?|days?)/i
    );

    let count = 6;
    if (countMatch) {
      const raw = countMatch[1].toLowerCase();
      count = numberWords[raw] || parseInt(raw, 10) || 6;
    }

    const recipientMatch = text.match(/(@[a-zA-Z0-9_]+|0x[a-fA-F0-9]{40})/);
    const recipient = recipientMatch ? recipientMatch[1] : "@recipient";

    const amountMatch =
      text.match(/(?:pay|send)\s+(?:.*?)\s*(\d+(?:\.\d+)?)/i) ||
      text.match(/(\d+(?:\.\d+)?)\s*(?:hsk|usdc|usdt|weth)/i) ||
      text.match(/(\d+(?:\.\d+)?)/);

    const amountPerPeriod = amountMatch ? amountMatch[1] : "10";
    const totalCalc = (Number(amountPerPeriod) * count).toFixed(2).replace(/\.00$/, "");

    const schedule: Array<{ period: number; date: string; amount: string }> = [];
    const now = new Date();
    for (let i = 1; i <= count; i++) {
      const d = new Date(now.getTime());
      if (interval === "monthly") {
        d.setMonth(d.getMonth() + i);
      } else if (interval === "weekly") {
        d.setDate(d.getDate() + i * 7);
      } else {
        d.setDate(d.getDate() + i);
      }
      const dateStr = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      schedule.push({
        period: i,
        date: dateStr,
        amount: amountPerPeriod,
      });
    }

    const intervalLabel =
      interval === "monthly" ? "months" : interval === "weekly" ? "weeks" : "days";

    return {
      action: "recurring_payment",
      recipient,
      amountPerPeriod,
      token: isErc20 ? "token" : "native",
      tokenSymbol: detectedSymbol,
      interval,
      frequencyCount: count,
      totalAmount: totalCalc,
      schedule,
      summary: `Pay ${amountPerPeriod} ${detectedSymbol} ${interval} to ${recipient} for ${count} ${intervalLabel} (Total commitment: ${totalCalc} ${detectedSymbol}).`,
    };
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
      "I can prepare protected single, batch, and recurring payments (in HSK, USDT, USDC, or custom tokens), check balances, and explain HashGuard escrow protection.",
  };
}
