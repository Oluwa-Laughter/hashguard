"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { zeroAddress } from "viem";
import { AgentIntent } from "@/lib/agent";
import { usernameRegistryAbi, usernameRegistryAddress } from "@/lib/contracts";
import { cleanUsername, shortAddress } from "@/lib/utils";
import { AccessGuard } from "@/components/access-guard";

function AgentContent() {
  const [message, setMessage] = useState("");
  const [intent, setIntent] = useState<AgentIntent>();
  const [provider, setProvider] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const { address } = useAccount();
  const balance = useBalance({ address });
  const recipient = intent && intent.action === "protected_transfer" ? intent.recipient : "";

  const resolution = useReadContract({
    address: usernameRegistryAddress ?? zeroAddress,
    abi: usernameRegistryAbi,
    functionName: "resolveUsername",
    args: [cleanUsername(recipient)],
    query: { enabled: Boolean(recipient.startsWith("@") && usernameRegistryAddress) }
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    setIntent(undefined);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      const data = await response.json() as { intent?: AgentIntent; provider?: string; error?: string };
      if (!response.ok || !data.intent) throw new Error(data.error || "Could not understand that request.");
      setIntent(data.intent);
      setProvider(data.provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent unavailable.");
    } finally {
      setBusy(false);
    }
  }

  const payHref = intent?.action === "protected_transfer"
    ? `/pay?recipient=${encodeURIComponent(intent.recipient)}&amount=${intent.amount}&days=${intent.expiryDays}&token=${intent.token}`
    : "#";
  const batchHref = intent?.action === "batch_payment"
    ? `/batch?payments=${encodeURIComponent(JSON.stringify(intent.payments))}`
    : "#";

  return (
    <main className="shell max-w-3xl py-12">
      <div className="card">
        <p className="text-sm font-bold tracking-widest text-emerald-400">HASHGUARD AGENT</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Intent → Verification → Protected execution</h1>
        <p className="muted mt-2">
          The agent prepares structured actions. It cannot sign, custody funds, or submit transactions without your wallet confirmation.
        </p>
        <form className="mt-6" onSubmit={submit}>
          <textarea
            className="field min-h-28"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Send 1 HSK to @alice as a protected payment for 7 days."
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="button button-primary" disabled={busy}>
              {busy ? "Understanding intent…" : "Prepare payment"}
            </button>
            <button type="button" className="button-secondary text-sm" onClick={() => setMessage("What's my HSK balance?")}>
              Check balance
            </button>
            <button type="button" className="button-secondary text-sm" onClick={() => setMessage("Pay @alice 1 HSK, @bob 2 HSK and @charlie 0.5 HSK.")}>
              Try batch
            </button>
          </div>
        </form>
        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
        {intent && (
          <section className="mt-6 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-5">
            <p className="text-xs font-bold tracking-widest text-emerald-300">
              PREPARED ACTION {provider === "local-parser" && "· LOCAL FALLBACK"}
            </p>
            {intent.action === "wallet_balance" && (
              <div className="mt-3">
                <p>Your connected wallet balance</p>
                <p className="mt-1 text-2xl font-bold">{balance.data ? `${Number(balance.data.formatted).toFixed(4)} HSK` : "Connect wallet to read balance"}</p>
              </div>
            )}
            {intent.action === "explain_payment" && (
              <p className="mt-3 leading-6 text-emerald-50/75">
                A protected payment deposits funds into the HashGuard smart contract. Only the named recipient can claim them. If they do not claim before expiry, only the sender can refund. A successful claim is final like any ordinary blockchain transfer.
              </p>
            )}
            {intent.action === "payment_history" && (
              <div className="mt-3">
                <p>Payment history is sourced from HashGuard contract events.</p>
                <Link className="button-secondary mt-4" href="/payments">Open payment history</Link>
              </div>
            )}
            {intent.action === "unknown" && <p className="mt-3">{intent.message}</p>}
            {intent.action === "protected_transfer" && (
              <div className="mt-3">
                <p className="font-semibold">HASHGUARD PROTECTED PAYMENT</p>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt>Recipient</dt>
                    <dd>{intent.recipient}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Resolved address</dt>
                    <dd>{recipient.startsWith("@") ? (resolution.isLoading ? "Resolving…" : (resolution.data && resolution.data !== zeroAddress ? shortAddress(resolution.data) : "Not resolved on-chain")) : shortAddress(recipient)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Amount</dt>
                    <dd>{intent.amount} {intent.token === "native" ? "HSK" : "USDC"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Protection</dt>
                    <dd>{intent.expiryDays} days</dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm text-emerald-50/65">Refund available after expiry if unclaimed. You will review again before the wallet request.</p>
                <Link className="button button-primary mt-5" href={payHref}>Continue to confirm & sign</Link>
              </div>
            )}
            {intent.action === "batch_payment" && (
              <div className="mt-3">
                <p className="font-semibold">BATCH PAYMENT</p>
                {intent.payments.map(payment => (
                  <p key={payment.recipient} className="mt-2 text-sm">{payment.recipient}<span className="float-right">{payment.amount} HSK</span></p>
                ))}
                <Link className="button button-primary mt-5" href={batchHref}>Continue to batch review</Link>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default function AgentPage() {
  return (
    <AccessGuard>
      <AgentContent />
    </AccessGuard>
  );
}
