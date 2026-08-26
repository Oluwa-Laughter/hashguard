import { type Address } from "viem";

export type AgentIntent =
  | {
      action: "wallet_balance";
      tokenSymbol: string;
    }
  | {
      action: "payment_history";
    }
  | {
      action: "explain_payment";
    }
  | {
      action: "protected_transfer";
      amount: string;
      token: "native" | "token";
      tokenSymbol: string;
      recipient: string;
      expiryDays: number;
    }
  | {
      action: "batch_payment";
      payments: Array<{ recipient: string; amount: string }>;
      token: "native" | "token";
      tokenSymbol: string;
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
  | {
      action: "unknown";
      message: string;
    };

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

  if (/recent|history|payments/.test(lower) && !/send|pay|sen\b/.test(lower)) {
    return { action: "payment_history" };
  }

  if (/what is|explain.*escrow|explain.*payment|how does.*work/.test(lower)) {
    return { action: "explain_payment" };
  }

  // Detect token symbol across global stablecoins and ERC-20s
  let detectedSymbol = "HSK";
  let isErc20 = false;
  if (/\busdt\b/i.test(text)) {
    detectedSymbol = "USDT";
    isErc20 = true;
  } else if (/\busdc\b/i.test(text)) {
    detectedSymbol = "USDC";
    isErc20 = true;
  } else if (/\bdai\b|\busds\b/i.test(text)) {
    detectedSymbol = "DAI";
    isErc20 = true;
  } else if (/\beurc\b|\beuro\b/i.test(text)) {
    detectedSymbol = "EURC";
    isErc20 = true;
  } else if (/\bpyusd\b/i.test(text)) {
    detectedSymbol = "PYUSD";
    isErc20 = true;
  } else if (/\bfdusd\b/i.test(text)) {
    detectedSymbol = "FDUSD";
    isErc20 = true;
  } else if (/\bweth\b|\beth\b/i.test(text)) {
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

    // Try alternate format: send @recipient [amount] first, fallback to standard
    const recipientMatch =
      text.match(/(?:to\s+)?(@[a-zA-Z0-9_]+|0x[a-fA-F0-9]{40})/i) ||
      text.match(/(?:send|pay|sen)\s+([a-zA-Z0-9_@]+)/i);
    
    let recipient = recipientMatch ? recipientMatch[1] : "@recipient";
    if (!recipient.startsWith("@") && !recipient.startsWith("0x")) {
      recipient = "@" + recipient;
    }

    const amountMatch =
      text.match(/(?:pay|send|sen)\s+(?:.*?)\s*(\d+(?:\.\d+)?)/i) ||
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
  const batch = [...text.matchAll(/(@?[a-zA-Z0-9_]+)\s+(\d+(?:\.\d+)?)/g)];
  if (batch.length > 1) {
    return {
      action: "batch_payment",
      token: isErc20 ? "token" : "native",
      tokenSymbol: detectedSymbol,
      payments: batch.map((m) => {
        let recipient = m[1];
        if (!recipient.startsWith("@") && !recipient.startsWith("0x")) {
          recipient = "@" + recipient;
        }
        return { recipient, amount: m[2] };
      }),
    };
  }

  // Detect protected single payment pattern
  // Matches standard: "send 10 HSK to @alice for 5 days"
  // Matches alternate: "sen @alic 4HSK"
  const alternateMatch = text.match(
    /(?:send|pay|sen)\s+(@?[a-zA-Z0-9_]+|0x[a-fA-F0-9]{40})\s+(\d+(?:\.\d+)?)\s*(hsk|usdt|usdc|dai|eurc|pyusd|fdusd|weth)?/i
  );

  if (alternateMatch) {
    let recipient = alternateMatch[1];
    if (!recipient.startsWith("@") && !recipient.startsWith("0x")) {
      recipient = "@" + recipient;
    }
    const symbolFromMatch = alternateMatch[3]?.toUpperCase() || detectedSymbol;
    const isErc = symbolFromMatch !== "HSK";

    return {
      action: "protected_transfer",
      amount: alternateMatch[2],
      token: isErc ? "token" : "native",
      tokenSymbol: symbolFromMatch,
      recipient,
      expiryDays: 7,
    };
  }

  const standardMatch = text.match(
    /(?:send|pay|sen)\s+(\d+(?:\.\d+)?)\s*(hsk|usdt|usdc|dai|eurc|pyusd|fdusd|weth)?\s+(?:to\s+)?(@?[a-zA-Z0-9_]+|0x[a-fA-F0-9]{40})(?:.*?(?:for\s+)?(\d+)\s*days?)?/i
  );

  if (standardMatch) {
    let recipient = standardMatch[3];
    if (!recipient.startsWith("@") && !recipient.startsWith("0x")) {
      recipient = "@" + recipient;
    }
    const symbolFromMatch = standardMatch[2]?.toUpperCase() || detectedSymbol;
    const isErc = symbolFromMatch !== "HSK";
    return {
      action: "protected_transfer",
      amount: standardMatch[1],
      token: isErc ? "token" : "native",
      tokenSymbol: symbolFromMatch,
      recipient,
      expiryDays: Number(standardMatch[4] || 7),
    };
  }

  return {
    action: "unknown",
    message:
      "I can prepare protected single, batch, and recurring payments (in HSK, USDT, USDC, or custom tokens), check balances, and explain HashGuard escrow protection.",
  };
}
