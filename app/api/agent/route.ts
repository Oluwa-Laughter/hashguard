import { NextRequest, NextResponse } from "next/server";
import { fallbackIntent } from "@/lib/agent";

const SYSTEM_PROMPT = `You are HashGuard Agent, the autonomous intent-to-execution assistant for HashGuard on HSKChain.
Your role is to analyze payment instructions and return structured transaction intents.
HashGuard supports native HSK and ERC-20 tokens (USDC, USDT, WETH, or custom tokens).

Always return ONLY valid JSON adhering strictly to one of the following schemas:

1. Protected Payment:
{
  "action": "protected_transfer",
  "recipient": "@username or 0x address",
  "amount": "decimal string (e.g. '10' or '0.5')",
  "token": "native" | "token",
  "tokenSymbol": "HSK" | "USDC" | "USDT" | "WETH",
  "expiryDays": positive integer (default 7 if not specified)
}

2. Batch Payment:
{
  "action": "batch_payment",
  "payments": [{"recipient": "@username or 0x address", "amount": "decimal string"}],
  "token": "native" | "token",
  "tokenSymbol": "HSK" | "USDC" | "USDT" | "WETH"
}

3. Recurring Payment Plan (e.g. monthly for 6 months):
{
  "action": "recurring_payment",
  "recipient": "@username or 0x address",
  "amountPerPeriod": "decimal string (e.g. '100')",
  "token": "native" | "token",
  "tokenSymbol": "HSK" | "USDC" | "USDT" | "WETH",
  "interval": "monthly" | "weekly" | "daily",
  "frequencyCount": positive integer (e.g. 6),
  "totalAmount": "decimal string (amountPerPeriod * frequencyCount)",
  "schedule": [{"period": 1, "date": "Date string", "amount": "decimal string"}],
  "summary": "concise description of the recurring payment plan"
}

4. Check Balance:
{
  "action": "wallet_balance",
  "tokenSymbol": "HSK" | "USDC" | "USDT" | "WETH"
}

5. Payment History:
{
  "action": "payment_history"
}

6. Explain Concept:
{
  "action": "explain_payment"
}

7. Unknown/Clarification:
{
  "action": "unknown",
  "message": "concise guidance"
}

Rules:
- For HSK payments: token is "native", tokenSymbol is "HSK".
- For USDT, USDC, WETH, or other ERC-20s: token is "token", tokenSymbol is the uppercase symbol.
- Default protection period is 7 days.
- Never output markdown tags or explanations outside the JSON. Return raw JSON only.`;

export async function POST(request: NextRequest) {
  try {
    const { message } = (await request.json()) as { message?: string };
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const mistralKey = process.env.MISTRAL_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    // 1. Priority: Google Gemini (fastest structured output, generous free tier)
    if (geminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: message }] }],
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0,
            },
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const intent = JSON.parse(text);
            return NextResponse.json({ intent, provider: "gemini-2.0-flash" });
          }
        }
      } catch (err) {
        console.warn("Gemini agent call failed, falling back:", err);
      }
    }

    // 2. Mistral AI
    if (mistralKey) {
      try {
        const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mistralKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "mistral-small-latest",
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: message },
            ],
          }),
        });

        if (res.ok) {
          const body = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content = body.choices?.[0]?.message?.content;
          if (content) {
            const intent = JSON.parse(content);
            return NextResponse.json({ intent, provider: "mistral" });
          }
        }
      } catch (err) {
        console.warn("Mistral agent call failed, falling back:", err);
      }
    }

    // 3. OpenAI
    if (openaiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: message },
            ],
          }),
        });

        if (res.ok) {
          const body = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content = body.choices?.[0]?.message?.content;
          if (content) {
            const intent = JSON.parse(content);
            return NextResponse.json({ intent, provider: "openai" });
          }
        }
      } catch (err) {
        console.warn("OpenAI agent call failed, falling back:", err);
      }
    }

    // 4. Zero-downtime local regex parser fallback
    const intent = fallbackIntent(message);
    return NextResponse.json({
      intent,
      provider: "local-parser",
      note: "Operating on high-performance local parser (add GEMINI_API_KEY for full conversational AI).",
    });
  } catch (err) {
    return NextResponse.json(
      {
        intent: fallbackIntent(""),
        provider: "local-parser",
        error: err instanceof Error ? err.message : "Agent processing error",
      },
      { status: 200 }
    );
  }
}
