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

  // 1. Classification matches
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

  // 2. Recurring plans
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
      token: /usdt/i.test(text) ? "token" : /usdc/i.test(text) ? "token" : "native",
      tokenSymbol: /usdt/i.test(text) ? "USDT" : /usdc/i.test(text) ? "USDC" : "HSK",
      interval,
      frequencyCount: count,
      totalAmount: totalCalc,
      schedule,
      summary: `Pay ${amountPerPeriod} ${/usdt/i.test(text) ? "USDT" : /usdc/i.test(text) ? "USDC" : "HSK"} ${interval} to ${recipient} for ${count} ${intervalLabel} (Total commitment: ${totalCalc} HSK).`,
    };
  }

  // 3. Batch payments - Recipient MUST start with @ or 0x to avoid matching normal prose words
  const batch = [...text.matchAll(/(@[a-zA-Z0-9_]+|0x[a-fA-F0-9]{40})\s+(\d+(?:\.\d+)?)/g)];
  if (batch.length > 1) {
    return {
      action: "batch_payment",
      token: /usdt/i.test(text) ? "token" : /usdc/i.test(text) ? "token" : "native",
      tokenSymbol: /usdt/i.test(text) ? "USDT" : /usdc/i.test(text) ? "USDC" : "HSK",
      payments: batch.map((m) => {
        let recipient = m[1];
        if (!recipient.startsWith("@") && !recipient.startsWith("0x")) {
          recipient = "@" + recipient;
        }
        return { recipient, amount: m[2] };
      }),
    };
  }

  // 4. Token-Based Generic Protected Transfer Parser
  // Extractor 1: Recipient address or handler username
  const recipientMatch = text.match(/(@[a-zA-Z0-9_]+|0x[a-fA-F0-9]{40})/);
  let recipient = recipientMatch ? recipientMatch[1] : undefined;

  if (!recipient) {
    // Look for usernames missing a leading '@' following active verb tokens
    const verbMatch = text.match(/(?:send|pay|sen|to)\s+([a-zA-Z0-9_]+)/i);
    if (verbMatch) {
      const candidate = verbMatch[1].toLowerCase();
      const reserved = ["hsk", "usdt", "usdc", "weth", "dai", "for", "lock", "escrow", "day", "week", "month", "hour"];
      if (!reserved.includes(candidate) && isNaN(Number(candidate))) {
        recipient = "@" + verbMatch[1];
      }
    }
  }

  // Extractor 2: Duration Expiry Locking Period
  let expiryDays = 7;
  const durationMatch = text.match(
    /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(day|week|month|year|hour)s?/i
  );
  let durationValStr = "";

  if (durationMatch) {
    const rawVal = durationMatch[1].toLowerCase();
    const unit = durationMatch[2].toLowerCase();
    const num = numberWords[rawVal] || parseInt(rawVal, 10) || 1;
    durationValStr = durationMatch[1];

    if (unit === "day") {
      expiryDays = num;
    } else if (unit === "week") {
      expiryDays = num * 7;
    } else if (unit === "month") {
      expiryDays = num * 30;
    } else if (unit === "year") {
      expiryDays = num * 365;
    } else if (unit === "hour") {
      expiryDays = Math.max(1, Math.round(num / 24));
    }
  }

  // Extractor 3: Payment lock amount
  const numbers = [...text.matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => m[1]);
  const amountStr = numbers.find((n) => n !== durationValStr) || "0.001";

  // Extractor 4: Active Token Symbol
  let tokenSymbol = "HSK";
  if (/\busdt\b/i.test(text)) {
    tokenSymbol = "USDT";
  } else if (/\busdc\b/i.test(text)) {
    tokenSymbol = "USDC";
  } else if (/\bweth\b|\beth\b/i.test(text)) {
    tokenSymbol = "WETH";
  } else if (/\bdai\b/i.test(text)) {
    tokenSymbol = "DAI";
  }
  const isErc = tokenSymbol !== "HSK";

  if (recipient) {
    return {
      action: "protected_transfer",
      amount: amountStr,
      token: isErc ? "token" : "native",
      tokenSymbol,
      recipient,
      expiryDays,
    };
  }

  return {
    action: "unknown",
    message:
      "I can prepare protected single, batch, and recurring payments (in HSK, USDT, USDC, or custom tokens), check balances, and explain HashGuard escrow protection.",
  };
}
