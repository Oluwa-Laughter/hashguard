"use client";

import { useEffect, useMemo, useState } from "react";
import { parseEther, parseUnits, zeroAddress, type Address } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import {
  scheduledPaymentAddress,
  scheduledPaymentAbi,
  usernameRegistryAbi,
  usernameRegistryAddress,
  usdcAddress,
  erc20Abi
} from "@/lib/contracts";
import { cleanUsername, shortAddress } from "@/lib/utils";
import { TransactionState } from "@/components/transaction-state";
import { Icon } from "@/components/icons";

type RecurringFormProps = {
  initial?: {
    recipient?: string;
    amount?: string;
    interval?: string;
    periods?: string;
    token?: "native" | "token";
  };
};

export function RecurringForm({ initial }: RecurringFormProps) {
  const { isConnected } = useAccount();
  const [recipient, setRecipient] = useState(initial?.recipient || "");
  const [amount, setAmount] = useState(initial?.amount || "");
  const [periods, setPeriods] = useState(initial?.periods || "6");
  const [intervalType, setIntervalType] = useState<string>(initial?.interval || "monthly");
  const [tokenType, setTokenType] = useState<"native" | "token">(initial?.token || "native");
  const [demoMode, setDemoMode] = useState(true); // Default to true for hackathon judges

  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string>();
  const [tokenApproved, setTokenApproved] = useState(false);
  const [transactionKind, setTransactionKind] = useState<"approve" | "create">();

  const username = cleanUsername(recipient);
  const directRecipient = recipient.startsWith("0x") ? (recipient as Address) : undefined;
  const resolvingUsername = Boolean(username && !directRecipient);

  // Resolve username
  const resolution = useReadContract({
    address: usernameRegistryAddress ?? zeroAddress,
    abi: usernameRegistryAbi,
    functionName: "resolveUsername",
    args: [username],
    query: { enabled: Boolean(usernameRegistryAddress && resolvingUsername) }
  });

  const resolved = (directRecipient || (resolution.data && resolution.data !== zeroAddress ? resolution.data : undefined)) as Address | undefined;

  // Resolve token decimals
  const tokenDecimals = useReadContract({
    address: usdcAddress ?? zeroAddress,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: tokenType === "token" && Boolean(usdcAddress) }
  });

  const decimals = Number(tokenDecimals.data ?? 6);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  // Map interval type to seconds
  const intervalSeconds = useMemo(() => {
    if (demoMode) {
      if (intervalType === "daily") return 60n;
      if (intervalType === "weekly") return 120n;
      return 180n; // monthly
    } else {
      if (intervalType === "daily") return 86400n;
      if (intervalType === "weekly") return 604800n;
      return 2592000n; // 30 days
    }
  }, [intervalType, demoMode]);

  const parsedAmountPerPeriod = useMemo(() => {
    try {
      return tokenType === "native"
        ? parseEther(amount || "0")
        : parseUnits(amount || "0", decimals);
    } catch {
      return 0n;
    }
  }, [amount, tokenType, decimals]);

  const totalAmount = useMemo(() => {
    return parsedAmountPerPeriod * BigInt(periods || 0);
  }, [parsedAmountPerPeriod, periods]);

  // Compute payment release dates timeline
  const releaseTimeline = useMemo(() => {
    const list = [];
    const count = Math.min(Number(periods || 0), 100);
    const start = Date.now();
    for (let i = 0; i < count; i++) {
      const releaseTime = start + (i + 1) * Number(intervalSeconds) * 1000;
      list.push(new Date(releaseTime).toLocaleString());
    }
    return list;
  }, [periods, intervalSeconds]);

  useEffect(() => {
    if (receipt.error) {
      setError("The transaction was rejected or could not be completed. Check wallet.");
    }
    if (receipt.isSuccess && transactionKind === "approve") {
      setTokenApproved(true);
      setError("Token approval confirmed. Ready to deposit & schedule payments.");
      setTransactionKind(undefined);
    }
  }, [receipt.error, receipt.isSuccess, transactionKind]);

  function review() {
    setError(undefined);
    if (!scheduledPaymentAddress) {
      return setError("ScheduledPayment contract is not deployed or configured in environment.");
    }
    if (!isConnected) {
      return setError("Connect your wallet first.");
    }
    if (!resolved) {
      return setError(resolvingUsername ? "Recipient @username is not registered." : "Enter a valid address.");
    }
    if (parsedAmountPerPeriod <= 0n || Number(periods) <= 0) {
      return setError("Please enter a positive amount and periods.");
    }
    setReviewing(true);
  }

  function sign() {
    if (!resolved || !scheduledPaymentAddress) return;
    setError(undefined);

    if (tokenType === "native") {
      setTransactionKind("create");
      writeContract(
        {
          address: scheduledPaymentAddress,
          abi: scheduledPaymentAbi,
          functionName: "createSchedule",
          args: [resolved, zeroAddress, parsedAmountPerPeriod, intervalSeconds, BigInt(periods)],
          value: totalAmount
        },
        { onError: () => setError("Wallet creation request rejected.") }
      );
    } else if (usdcAddress) {
      if (tokenApproved) {
        setTransactionKind("create");
        writeContract(
          {
            address: scheduledPaymentAddress,
            abi: scheduledPaymentAbi,
            functionName: "createSchedule",
            args: [resolved, usdcAddress, parsedAmountPerPeriod, intervalSeconds, BigInt(periods)]
          },
          { onError: () => setError("Wallet creation request rejected.") }
        );
      } else {
        setTransactionKind("approve");
        writeContract(
          {
            address: usdcAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [scheduledPaymentAddress, totalAmount]
          },
          { onError: () => setError("Token approval was rejected.") }
        );
      }
    } else {
      setError("No supported token configuration found.");
    }
  }

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="mb-6 flex items-start gap-4">
        <span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400">
          <Icon name="history" className="h-6 w-6 animate-spin-slow" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-white">Create Scheduled Payment</h2>
          <p className="muted mt-1 text-sm leading-relaxed">
            Fund the entire schedule upfront. Installments are locked in the smart contract and released when they become due.
          </p>
        </div>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-2">
          <label className="label">Recipient Address or @Username</label>
          <input
            className="field"
            value={recipient}
            onChange={e => { setRecipient(e.target.value); setReviewing(false); setTokenApproved(false); }}
            placeholder="@username or 0x…"
          />
          {resolvingUsername && recipient && (
            <p className="text-xs font-semibold mt-1">
              {resolution.isLoading ? (
                <span className="text-gray-500">Resolving recipient username…</span>
              ) : resolved ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Icon name="check" className="h-3.5 w-3.5" />
                  @{username} resolved to: {shortAddress(resolved)}
                </span>
              ) : (
                <span className="text-rose-400">Username registry not resolved</span>
              )}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="grid gap-2 sm:col-span-1">
            <label className="label">Amount / Period</label>
            <input
              className="field"
              inputMode="decimal"
              value={amount}
              onChange={e => { setAmount(e.target.value); setTokenApproved(false); }}
              placeholder="0.00"
            />
          </div>

          <div className="grid gap-2">
            <label className="label">Asset</label>
            <select
              className="field"
              value={tokenType}
              onChange={e => { setTokenType(e.target.value as "native" | "token"); setReviewing(false); setTokenApproved(false); }}
            >
              <option value="native">HSK (Native)</option>
              <option value="token" disabled={!usdcAddress}>USDC {usdcAddress ? "" : "(not configured)"}</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="label">Frequency</label>
            <select
              className="field text-white"
              value={intervalType}
              onChange={e => { setIntervalType(e.target.value); setTokenApproved(false); }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="label">Total Periods</label>
            <input
              className="field"
              type="number"
              min="1"
              value={periods}
              onChange={e => { setPeriods(e.target.value); setTokenApproved(false); }}
            />
          </div>
        </div>

        {/* Demo Mode Toggle */}
        <div className="flex items-center gap-3 rounded-xl border border-cyan-500/10 bg-cyan-500/[0.02] p-4 text-xs">
          <input
            type="checkbox"
            id="demo-mode"
            checked={demoMode}
            onChange={e => { setDemoMode(e.target.checked); setTokenApproved(false); }}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 bg-black/30"
          />
          <label htmlFor="demo-mode" className="text-gray-400 font-semibold cursor-pointer">
            <span className="text-emerald-400 font-bold block mb-0.5">Demo / Hackathon mode (1-3 minute intervals)</span>
            Accelerate the execution cycle for demonstration purposes (rather than waiting days/weeks).
          </label>
        </div>
      </div>

      {reviewing && resolved && (
        <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] p-5 space-y-4">
          <div>
            <p className="text-[10px] font-extrabold tracking-widest text-emerald-400 uppercase">Review Commitment Schedule</p>
            <div className="mt-3 grid gap-2.5 text-sm text-gray-400">
              <div className="flex justify-between border-b border-white/[0.04] pb-2">
                <span>Recipient</span>
                <span className="font-bold text-white">{recipient.startsWith("@") ? recipient : shortAddress(resolved)}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.04] pb-2">
                <span>Installment Size</span>
                <span className="font-bold text-white">{amount} {tokenType === "native" ? "HSK" : "USDC"}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.04] pb-2">
                <span>Interval Timing</span>
                <span className="font-semibold text-white capitalize">{intervalType} {demoMode && "(Demo Speed: ~1-3m)"}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.04] pb-2">
                <span>Installments Count</span>
                <span className="font-semibold text-white">{periods} periods</span>
              </div>
              <div className="flex justify-between pt-1 font-bold text-emerald-400 text-base">
                <span>Upfront Deposit</span>
                <span>{(Number(amount || 0) * Number(periods || 0))} {tokenType === "native" ? "HSK" : "USDC"}</span>
              </div>
            </div>
          </div>

          {/* Release timeline schedule display */}
          <div className="border-t border-white/[0.06] pt-4">
            <p className="text-[10px] font-extrabold tracking-widest text-cyan-400 uppercase mb-3">Installment Release Timeline</p>
            <div className="max-h-40 overflow-y-auto space-y-2 text-xs pr-2 scrollbar-thin">
              {releaseTimeline.map((dateStr, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-white/[0.02] last:border-0">
                  <span className="text-gray-500 font-semibold">Period #{idx + 1} Payout</span>
                  <span className="font-mono text-white font-semibold">{dateStr}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button className="button button-secondary flex-1" onClick={review}>
          {reviewing ? "Update Review" : "Review Schedule"}
        </button>
        {reviewing && (
          <button
            className="button button-primary flex-1"
            disabled={isPending || receipt.isLoading}
            onClick={sign}
          >
            {isPending ? "Awaiting Wallet…" : receipt.isLoading ? "Confirming…" : tokenType === "token" && !tokenApproved ? "Approve Token" : "Create Schedule"}
          </button>
        )}
      </div>

      <TransactionState
        state={hash ? (receipt.isSuccess ? "Schedule Created ✓" : receipt.isLoading ? "Confirming on HSK Chain…" : "Awaiting confirmation…") : undefined}
        hash={hash}
      />
    </div>
  );
}
