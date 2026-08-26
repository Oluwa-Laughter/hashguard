"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAccount, useBalance } from "wagmi";
import { AgentIntent } from "@/lib/agent";
import { shortAddress } from "@/lib/utils";
import { AccessGuard } from "@/components/access-guard";
import { Icon } from "@/components/icons";
import { resolveUsernameApi, getUsernameByAddressApi } from "@/lib/username-client";

function BatchPaymentItem({ recipient, amount }: { recipient: string; amount: string }) {
  const [resolvedAddress, setResolvedAddress] = useState<string>();
  const [resolvedUsername, setResolvedUsername] = useState<string>();
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!recipient) return;
    setResolving(true);

    if (recipient.startsWith("@")) {
      resolveUsernameApi(recipient)
        .then((res) => {
          if (res.found && res.address) {
            setResolvedAddress(res.address);
          }
        })
        .finally(() => setResolving(false));
    } else if (recipient.startsWith("0x")) {
      setResolvedAddress(recipient);
      getUsernameByAddressApi(recipient)
        .then((res) => {
          if (res.found && res.username) {
            setResolvedUsername("@" + res.username);
          }
        })
        .finally(() => setResolving(false));
    } else {
      resolveUsernameApi("@" + recipient)
        .then((res) => {
          if (res.found && res.address) {
            setResolvedAddress(res.address);
          }
        })
        .finally(() => setResolving(false));
    }
  }, [recipient]);

  return (
    <div className="flex justify-between items-center py-2.5 border-b border-white/[0.04] last:border-0 text-sm">
      <div>
        <p className="font-bold text-white">
          {recipient.startsWith("0x") && resolvedUsername ? `${resolvedUsername} (${shortAddress(recipient)})` : recipient}
        </p>
        {!recipient.startsWith("0x") && (
          <p className="text-xs text-gray-500 mt-0.5 font-semibold">
            {resolving ? "Resolving address…" : resolvedAddress ? `Resolved: ${shortAddress(resolvedAddress)}` : "Not resolved in database"}
          </p>
        )}
      </div>
      <div className="text-right">
        <p className="font-bold text-emerald-400">{amount} HSK</p>
      </div>
    </div>
  );
}

function AgentContent() {
  const [message, setMessage] = useState("");
  const [intent, setIntent] = useState<AgentIntent>();
  const [provider, setProvider] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const { address } = useAccount();
  const balance = useBalance({ address });
  const recipient = intent && (intent.action === "protected_transfer" || intent.action === "recurring_payment") ? intent.recipient : "";

  const [apiResolvedAddress, setApiResolvedAddress] = useState<string>();
  const [apiResolvedUsername, setApiResolvedUsername] = useState<string>();
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!recipient) {
      setApiResolvedAddress(undefined);
      setApiResolvedUsername(undefined);
      return;
    }

    let active = true;
    setResolving(true);

    if (recipient.startsWith("@")) {
      setApiResolvedUsername(undefined);
      resolveUsernameApi(recipient).then((res) => {
        if (active) {
          if (res.found && res.address?.startsWith("0x")) {
            setApiResolvedAddress(res.address);
          } else {
            setApiResolvedAddress(undefined);
          }
          setResolving(false);
        }
      });
    } else if (recipient.startsWith("0x")) {
      setApiResolvedAddress(undefined);
      getUsernameByAddressApi(recipient).then((res) => {
        if (active) {
          if (res.found && res.username) {
            setApiResolvedUsername("@" + res.username);
          } else {
            setApiResolvedUsername(undefined);
          }
          setResolving(false);
        }
      });
    } else {
      setApiResolvedUsername(undefined);
      resolveUsernameApi("@" + recipient).then((res) => {
        if (active) {
          if (res.found && res.address?.startsWith("0x")) {
            setApiResolvedAddress(res.address);
          } else {
            setApiResolvedAddress(undefined);
          }
          setResolving(false);
        }
      });
    }

    return () => {
      active = false;
    };
  }, [recipient]);

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
    ? `/pay?recipient=${encodeURIComponent(recipient.startsWith("@") ? recipient : apiResolvedUsername || recipient)}&amount=${intent.amount}&days=${intent.expiryDays}&token=${intent.token}`
    : "#";
  const batchHref = intent?.action === "batch_payment"
    ? `/batch?payments=${encodeURIComponent(JSON.stringify(intent.payments))}`
    : "#";
  const recurringHref = intent?.action === "recurring_payment"
    ? `/recurring?recipient=${encodeURIComponent(recipient.startsWith("@") ? recipient : apiResolvedUsername || recipient)}&amount=${intent.amountPerPeriod}&interval=${intent.interval}&periods=${intent.frequencyCount}&token=${intent.token}`
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
            <button type="button" className="button-secondary text-sm" onClick={() => setMessage("Send @alice 10 USDC every week for 4 weeks.")}>
              Try recurring
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
                    <dd>{recipient}</dd>
                  </div>
                  {recipient.startsWith("0x") ? (
                    <div className="flex justify-between">
                      <dt>Resolved Username</dt>
                      <dd>{resolving ? "Resolving…" : apiResolvedUsername || "No registered username found"}</dd>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <dt>Resolved Address</dt>
                      <dd>{resolving ? "Resolving…" : apiResolvedAddress ? shortAddress(apiResolvedAddress) : "Not resolved in database"}</dd>
                    </div>
                  )}
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
                <p className="font-semibold mb-3">BATCH PAYMENT</p>
                <div className="divide-y divide-white/[0.04] max-h-60 overflow-y-auto pr-1">
                  {intent.payments.map((payment) => (
                    <BatchPaymentItem
                      key={payment.recipient}
                      recipient={payment.recipient}
                      amount={payment.amount}
                    />
                  ))}
                </div>
                <Link className="button button-primary mt-5" href={batchHref}>Continue to batch review</Link>
              </div>
            )}
            {intent.action === "recurring_payment" && (
              <div className="mt-3">
                <p className="font-semibold">HASHGUARD SCHEDULED PAYMENT</p>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt>Recipient</dt>
                    <dd>{recipient}</dd>
                  </div>
                  {recipient.startsWith("0x") ? (
                    <div className="flex justify-between">
                      <dt>Resolved Username</dt>
                      <dd>{resolving ? "Resolving…" : apiResolvedUsername || "No registered username found"}</dd>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <dt>Resolved Address</dt>
                      <dd>{resolving ? "Resolving…" : apiResolvedAddress ? shortAddress(apiResolvedAddress) : "Not resolved in database"}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt>Amount Per Period</dt>
                    <dd>{intent.amountPerPeriod} {intent.tokenSymbol}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Interval</dt>
                    <dd className="capitalize">{intent.interval}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Total Periods</dt>
                    <dd>{intent.frequencyCount} periods</dd>
                  </div>
                  <div className="flex justify-between border-t border-white/[0.08] pt-2 font-bold text-emerald-300">
                    <dt>Upfront Commitment</dt>
                    <dd>{intent.totalAmount} {intent.tokenSymbol}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-xs text-gray-500">The total amount will be funded and deposited upfront into the schedule contract.</p>
                <Link className="button button-primary mt-5" href={recurringHref}>Continue to schedule review</Link>
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
