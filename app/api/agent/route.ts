import { NextRequest, NextResponse } from "next/server";
import { fallbackIntent } from "@/lib/agent";

export async function POST(request: NextRequest) {
  const { message } = await request.json() as { message?: string };
  if (!message?.trim()) return NextResponse.json({ error: "Message is required." }, { status: 400 });
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return NextResponse.json({ intent: fallbackIntent(message), provider: "local-parser" });
  const system = `You are HashGuard Agent. Return only valid JSON with one of these forms: {"action":"protected_transfer","recipient":"@name or 0x address","amount":"decimal","token":"native"|"token","expiryDays":positive integer}; {"action":"batch_payment","payments":[{"recipient":"@name","amount":"decimal"}],"token":"native"|"token"}; {"action":"wallet_balance"}; {"action":"payment_history"}; {"action":"explain_payment"}; or {"action":"unknown","message":"short clarification"}. You prepare intent only. Never provide an address, balance, hash, or claim it was executed. Default protected-payment expiry is 7 days.`;
  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "mistral-small-latest", temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: message }] }) });
    if (!response.ok) throw new Error("provider response");
    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const intent = JSON.parse(body.choices?.[0]?.message?.content || "{}") as unknown;
    return NextResponse.json({ intent, provider: "mistral" });
  } catch { return NextResponse.json({ intent: fallbackIntent(message), provider: "local-parser", warning: "The AI provider was unavailable, so HashGuard used its local intent parser." }); }
}

