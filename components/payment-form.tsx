"use client";

import { useEffect, useMemo, useState } from "react";
import { parseEther, parseUnits, zeroAddress, type Address } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { contractsConfigured, erc20Abi, hashGuardAbi, hashGuardAddress, usdcAddress, usernameRegistryAbi, usernameRegistryAddress } from "@/lib/contracts";
import { cleanUsername, shortAddress } from "@/lib/utils";
import { TransactionState } from "@/components/transaction-state";

type PaymentFormProps = { initial?: { recipient?: string; amount?: string; days?: string; token?: "native" | "token" }; compact?: boolean };

export function PaymentForm({ initial, compact }: PaymentFormProps) {
  const { isConnected } = useAccount();
  const [recipient, setRecipient] = useState(initial?.recipient || "");
  const [amount, setAmount] = useState(initial?.amount || "");
  const [days, setDays] = useState(initial?.days || "7");
  const [tokenType, setTokenType] = useState<"native" | "token">(initial?.token || "native");
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string>();
  const [tokenApproved, setTokenApproved] = useState(false);
  const [transactionKind, setTransactionKind] = useState<"approve" | "escrow">();
  const username = cleanUsername(recipient);
  const directRecipient = recipient.startsWith("0x") ? recipient as Address : undefined;
  const resolvingUsername = Boolean(username && !directRecipient);
  const resolution = useReadContract({ address: usernameRegistryAddress ?? zeroAddress, abi: usernameRegistryAbi, functionName: "resolveUsername", args: [username], query: { enabled: Boolean(usernameRegistryAddress && resolvingUsername) } });
  const resolved = (directRecipient || (resolution.data && resolution.data !== zeroAddress ? resolution.data : undefined)) as Address | undefined;
  const tokenDecimals = useReadContract({ address: usdcAddress ?? zeroAddress, abi: erc20Abi, functionName: "decimals", query: { enabled: tokenType === "token" && Boolean(usdcAddress) } });
  const decimals = Number(tokenDecimals.data ?? 6);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const expiry = useMemo(() => Math.floor(Date.now() / 1000) + Number(days || 0) * 86400, [days]);
  const parsedAmount = useMemo(() => { try { return tokenType === "native" ? parseEther(amount || "0") : parseUnits(amount || "0", decimals); } catch { return 0n; } }, [amount, tokenType, decimals]);

  useEffect(() => {
    if (receipt.error) setError("The transaction was not confirmed. Check your wallet and try again.");
    if (receipt.isSuccess && transactionKind === "approve") {
      setTokenApproved(true);
      setError("Token approval confirmed. Your next wallet confirmation locks the protected payment.");
      setTransactionKind(undefined);
    }
  }, [receipt.error, receipt.isSuccess, transactionKind]);

  function review() {
    setError(undefined);
    if (!contractsConfigured) return setError("Contract addresses are not configured yet.");
    if (!isConnected) return setError("Connect the wallet that will fund this payment.");
    if (!resolved) return setError(resolvingUsername ? "That username is not registered on HSK Chain." : "Enter a valid recipient address.");
    if (!parsedAmount || Number(days) <= 0) return setError("Enter a positive amount and protection period.");
    setReviewing(true);
  }

  function sign() {
    if (!resolved || !hashGuardAddress) return;
    setError(undefined);
    if (tokenType === "native") {
      setTransactionKind("escrow");
      writeContract({ address: hashGuardAddress, abi: hashGuardAbi, functionName: "createNativeEscrow", args: [resolved, BigInt(expiry)], value: parsedAmount }, { onError: () => setError("Wallet request was rejected or could not be prepared.") });
    } else if (usdcAddress) {
      // USDC approval is deliberately a separate wallet-authorized transaction.
      if (tokenApproved) {
        setTransactionKind("escrow");
        writeContract({ address: hashGuardAddress, abi: hashGuardAbi, functionName: "createTokenEscrow", args: [usdcAddress, resolved, parsedAmount, BigInt(expiry)] }, { onError: () => setError("Wallet request was rejected or could not be prepared.") });
      } else {
        setTransactionKind("approve");
        writeContract({ address: usdcAddress, abi: erc20Abi, functionName: "approve", args: [hashGuardAddress, parsedAmount] }, { onError: () => setError("Token approval was rejected.") });
      }
    } else setError("No supported ERC-20 token is configured.");
  }

  return <div className="card"><div className="mb-5"><h2 className="text-xl font-semibold">Protected payment</h2><p className="muted mt-1">Funds lock in HashGuard until the recipient claims. Unclaimed funds can be refunded after expiry.</p></div>
    <div className="grid gap-4"><label className="label">Recipient<input className="field" value={recipient} onChange={e => { setRecipient(e.target.value); setReviewing(false); setTokenApproved(false); }} placeholder="@alice or 0x…" /></label>
      {resolvingUsername && recipient && <p className="muted">{resolution.isLoading ? "Resolving username…" : resolved ? <><span className="text-emerald-300">✓ @${username} resolved on-chain</span> · {shortAddress(resolved)}</> : "Username not resolved"}</p>}
      <div className="grid gap-4 sm:grid-cols-3"><label className="label sm:col-span-1">Amount<input className="field" inputMode="decimal" value={amount} onChange={e => { setAmount(e.target.value); setTokenApproved(false); }} placeholder="1.00" /></label>
      <label className="label">Token<select className="field" value={tokenType} onChange={e => { setTokenType(e.target.value as "native" | "token"); setReviewing(false); setTokenApproved(false); }}><option value="native">HSK</option><option value="token" disabled={!usdcAddress}>USDC {usdcAddress ? "" : "(not configured)"}</option></select></label>
      <label className="label">Protection<input className="field" type="number" min="1" max="365" value={days} onChange={e => { setDays(e.target.value); setTokenApproved(false); }} /><span className="mt-1 block text-xs text-emerald-50/45">days</span></label></div>
    </div>
    {reviewing && <div className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4"><p className="text-xs font-bold tracking-widest text-emerald-300">REVIEW PAYMENT</p><div className="mt-3 grid gap-2 text-sm"><p>Recipient <span className="float-right font-medium">{recipient.startsWith("@") ? recipient : shortAddress(resolved)}</span></p><p>Resolved address <span className="float-right font-mono text-xs">{shortAddress(resolved)}</span></p><p>Amount <span className="float-right font-medium">{amount} {tokenType === "native" ? "HSK" : "USDC"}</span></p><p>Protection <span className="float-right">{days} days</span></p><p className="border-t border-emerald-50/10 pt-2 text-emerald-100/70">Refund is available to you after expiry only if this payment remains unclaimed.</p></div></div>}
    {error && <p className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
    <div className="mt-5 flex gap-3"><button className="button flex-1" onClick={review}>{reviewing ? "Update review" : "Review payment"}</button>{reviewing && <button className="button-secondary flex-1" disabled={isPending || receipt.isLoading} onClick={sign}>{isPending ? "Awaiting wallet…" : receipt.isLoading ? "Confirming…" : tokenType === "token" && !tokenApproved ? "Approve token" : "Confirm & sign"}</button>}</div>
    <TransactionState state={hash ? receipt.isSuccess ? "Confirmed ✓" : receipt.isLoading ? "Confirming on HSK…" : "Awaiting confirmation…" : undefined} hash={hash} />
  </div>;
}
