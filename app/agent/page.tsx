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
    ? `/pay?recipient=${encodeURIComponent(intent.recipient)}&amount=${intent.amount}&days=${intent.expiryDays}&token=${intent.token}&symbol=${encodeURIComponent(intent.tokenSymbol || (intent.token === "token" ? "USDC" : "HSK"))}`
    : "#";
  const batchHref = intent?.action === "batch_payment"
    ? `/batch?payments=${encodeURIComponent(JSON.stringify(intent.payments))}&token=${intent.token}&symbol=${encodeURIComponent(intent.tokenSymbol || (intent.token === "token" ? "USDC" : "HSK"))}`
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
            <button type="button" className="button-secondary text-sm text-cyan-300 border-cyan-500/30" onClick={() => setMessage("Pay @alice 100 USDT monthly for the next six months")}>
              Try recurring (6 mo)
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
                    <dd>{intent.amount} {intent.tokenSymbol || (intent.token === "native" ? "HSK" : "USDC")}</dd>
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
                  <p key={payment.recipient} className="mt-2 text-sm">{payment.recipient}<span className="float-right">{payment.amount} {intent.tokenSymbol || "HSK"}</span></p>
                ))}
                <Link className="button button-primary mt-5" href={batchHref}>Continue to batch review</Link>
              </div>
            )}
            {intent.action === "recurring_payment" && (
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white">RECURRING PAYMENT PLAN</p>
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-bold text-cyan-300">
                    {intent.frequencyCount} {intent.interval.toUpperCase()} INSTALLMENTS
                  </span>
                </div>

                <div className="mt-4 grid gap-2.5 rounded-xl border border-white/[0.06] bg-slate-900/50 p-4 text-sm text-gray-400">
                  <div className="flex justify-between border-b border-white/[0.04] pb-2">
                    <span>Recipient</span>
                    <span className="font-bold text-white">{intent.recipient}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.04] pb-2">
                    <span>Installment Amount</span>
                    <span className="font-bold text-emerald-400">
                      {intent.amountPerPeriod} {intent.tokenSymbol} / {intent.interval === "monthly" ? "month" : intent.interval === "weekly" ? "week" : "day"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Commitment</span>
                    <span className="font-extrabold text-white font-mono">
                      {intent.totalAmount} {intent.tokenSymbol}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-gray-400">Installment Schedule</p>
                <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {intent.schedule.map((item) => (
                    <div key={item.period} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2 text-xs">
                      <span className="text-gray-400">
                        #{item.period} · {item.date}
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {item.amount} {intent.tokenSymbol}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                  <Link
                    className="button button-primary flex-1 text-center"
                    href={`/pay?recipient=${encodeURIComponent(intent.recipient)}&amount=${intent.amountPerPeriod}&days=30&token=${intent.token}&symbol=${encodeURIComponent(intent.tokenSymbol)}`}
                  >
                    Lock 1st Installment in Escrow →
                  </Link>
                </div>
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
