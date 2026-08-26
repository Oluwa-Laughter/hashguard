"use client";

import { useEffect, useMemo, useState } from "react";
import { parseEther, parseUnits, zeroAddress, type Address } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { contractsConfigured, erc20Abi, hashGuardAbi, hashGuardAddress, usdcAddress, usernameRegistryAbi, usernameRegistryAddress } from "@/lib/contracts";
import { cleanUsername, shortAddress } from "@/lib/utils";
import { TransactionState } from "@/components/transaction-state";
import { Icon } from "@/components/icons";

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
  
  const resolution = useReadContract({
    address: usernameRegistryAddress ?? zeroAddress,
    abi: usernameRegistryAbi,
    functionName: "resolveUsername",
    args: [username],
    query: { enabled: Boolean(usernameRegistryAddress && resolvingUsername) }
  });
  
  const resolved = (directRecipient || (resolution.data && resolution.data !== zeroAddress ? resolution.data : undefined)) as Address | undefined;
  const tokenDecimals = useReadContract({
    address: usdcAddress ?? zeroAddress,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: tokenType === "token" && Boolean(usdcAddress) }
  });
  
  const decimals = Number(tokenDecimals.data ?? 6);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const expiry = useMemo(() => Math.floor(Date.now() / 1000) + Number(days || 0) * 86400, [days]);
  
  const parsedAmount = useMemo(() => {
    try {
      return tokenType === "native" ? parseEther(amount || "0") : parseUnits(amount || "0", decimals);
    } catch {
      return 0n;
    }
  }, [amount, tokenType, decimals]);

  useEffect(() => {
    if (receipt.error) {
      setError("The transaction was not confirmed. Check your wallet and try again.");
    }
    if (receipt.isSuccess && transactionKind === "approve") {
      setTokenApproved(true);
      setError("Token approval confirmed. Ready to lock protected payment.");
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
      writeContract(
        { address: hashGuardAddress, abi: hashGuardAbi, functionName: "createNativeEscrow", args: [resolved, BigInt(expiry)], value: parsedAmount },
        { onError: () => setError("Wallet request was rejected or could not be prepared.") }
      );
    } else if (usdcAddress) {
      if (tokenApproved) {
        setTransactionKind("escrow");
        writeContract(
          { address: hashGuardAddress, abi: hashGuardAbi, functionName: "createTokenEscrow", args: [usdcAddress, resolved, parsedAmount, BigInt(expiry)] },
          { onError: () => setError("Wallet request was rejected or could not be prepared.") }
        );
      } else {
        setTransactionKind("approve");
        writeContract(
          { address: usdcAddress, abi: erc20Abi, functionName: "approve", args: [hashGuardAddress, parsedAmount] },
          { onError: () => setError("Token approval was rejected.") }
        );
      }
    } else {
      setError("No supported ERC-20 token is configured.");
    }
  }

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="mb-6 flex items-start gap-4">
        <span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400">
          <Icon name="shield" className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-white">Send Protected Payment</h2>
          <p className="muted mt-1 text-sm leading-relaxed">
            Funds are locked securely inside the smart contract until claimed. Senders can request refunds after the protection expiry.
          </p>
        </div>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-2">
          <label className="label">Recipient Address or Username</label>
          <div className="relative">
            <input
              className="field pr-10"
              value={recipient}
              onChange={e => { setRecipient(e.target.value); setReviewing(false); setTokenApproved(false); }}
              placeholder="@username or 0x…"
            />
          </div>
          {resolvingUsername && recipient && (
            <p className="text-xs font-semibold mt-1">
              {resolution.isLoading ? (
                <span className="text-gray-500">Resolving username on-chain…</span>
              ) : resolved ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Icon name="check" className="h-3.5 w-3.5" />
                  @{username} resolved: {shortAddress(resolved)}
                </span>
              ) : (
                <span className="text-rose-400">Username could not be resolved</span>
              )}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <label className="label">Amount</label>
            <input
              className="field"
              inputMode="decimal"
              value={amount}
              onChange={e => { setAmount(e.target.value); setTokenApproved(false); }}
              placeholder="0.00"
            />
          </div>

          <div className="grid gap-2">
            <label className="label">Select Asset</label>
            <select
              className="field"
              value={tokenType}
              onChange={e => { setTokenType(e.target.value as "native" | "token"); setReviewing(false); setTokenApproved(false); }}
            >
              <option value="native">HSK (Native)</option>
              <option value="token" disabled={!usdcAddress}>USDC {usdcAddress ? "" : "(Not Configured)"}</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="label">Escrow Protection</label>
            <div className="relative flex items-center">
              <input
                className="field"
                type="number"
                min="1"
                max="365"
                value={days}
                onChange={e => { setDays(e.target.value); setTokenApproved(false); }}
              />
              <span className="absolute right-4 text-xs font-semibold text-gray-500 pointer-events-none mt-1">days</span>
            </div>
          </div>
        </div>
      </div>

      {reviewing && resolved && (
        <div className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.03] p-5">
          <p className="text-[10px] font-extrabold tracking-widest text-emerald-400 uppercase">Review Payment Escrow</p>
          <div className="mt-4 grid gap-2.5 text-sm text-gray-400">
            <div className="flex justify-between border-b border-white/[0.04] pb-2">
              <span>Recipient</span>
              <span className="font-bold text-white">{recipient.startsWith("@") ? recipient : shortAddress(resolved)}</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.04] pb-2">
              <span>Resolved Address</span>
              <span className="font-mono text-xs text-white">{resolved}</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.04] pb-2">
              <span>Escrow Value</span>
              <span className="font-bold text-emerald-400">{amount} {tokenType === "native" ? "HSK" : "USDC"}</span>
            </div>
            <div className="flex justify-between">
              <span>Protection Period</span>
              <span className="font-semibold text-white">{days} days</span>
            </div>
          </div>
          <p className="mt-4 border-t border-white/[0.06] pt-4 text-xs text-gray-500 leading-relaxed">
            Funds enter smart-contract custody. Recipient claims the escrow payload, or you request a refund after expiry.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button className="button button-secondary flex-1" onClick={review}>
          {reviewing ? "Update Review" : "Review Payment"}
        </button>
        {reviewing && (
          <button
            className="button button-primary flex-1"
            disabled={isPending || receipt.isLoading}
            onClick={sign}
          >
            {isPending ? "Awaiting Wallet…" : receipt.isLoading ? "Confirming…" : tokenType === "token" && !tokenApproved ? "Approve Token" : "Confirm & Sign"}
          </button>
        )}
      </div>

      <TransactionState
        state={hash ? (receipt.isSuccess ? "Confirmed ✓" : receipt.isLoading ? "Confirming on HSK Chain…" : "Awaiting confirmation…") : undefined}
        hash={hash}
      />
    </div>
  );
}
