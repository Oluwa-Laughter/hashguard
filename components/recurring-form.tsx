"use client";

import { useEffect, useMemo, useState } from "react";
import { parseEther, parseUnits, zeroAddress, type Address } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import {
  scheduledPaymentAddress,
  scheduledPaymentAbi,
  usernameRegistryAbi,
  usernameRegistryAddress,
  erc20Abi,
} from "@/lib/contracts";
import { cleanUsername, shortAddress } from "@/lib/utils";
import { TransactionState } from "@/components/transaction-state";
import { Icon } from "@/components/icons";
import { resolveUsernameApi } from "@/lib/username-client";
import {
  getSupportedTokens,
  isNativeToken,
  TokenInfo,
  NATIVE_HSK,
  formatTokenBalance,
} from "@/lib/tokens";

type RecurringFormProps = {
  initial?: {
    recipient?: string;
    amount?: string;
    interval?: string;
    periods?: string;
    token?: "native" | "token";
    tokenSymbol?: string;
  };
};

export function RecurringForm({ initial }: RecurringFormProps) {
  const supportedTokens = useMemo(() => getSupportedTokens(), []);
  const { address, isConnected } = useAccount();

  const [recipient, setRecipient] = useState(initial?.recipient || "");
  const [amount, setAmount] = useState(initial?.amount || "");
  const [periods, setPeriods] = useState(initial?.periods || "6");
  const [intervalType, setIntervalType] = useState<string>(initial?.interval || "monthly");
  const [demoMode, setDemoMode] = useState(true); // Default to true for hackathon speed testing

  // Token Selection
  const [selectedTokenKey, setSelectedTokenKey] = useState<string>(() => {
    if (initial?.tokenSymbol) {
      const match = supportedTokens.find(
        (t) => t.symbol.toLowerCase() === initial.tokenSymbol?.toLowerCase()
      );
      if (match) return match.symbol;
    }
    return initial?.token === "token" ? "USDT" : "HSK";
  });
  const [customTokenAddress, setCustomTokenAddress] = useState<string>("");

  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string>();
  const [tokenApproved, setTokenApproved] = useState(false);
  const [transactionKind, setTransactionKind] = useState<"approve" | "create">();

  const isCustomToken = selectedTokenKey === "CUSTOM";
  const activeTokenInfo = useMemo<TokenInfo>(() => {
    if (isCustomToken) {
      return {
        address: (customTokenAddress.startsWith("0x") ? customTokenAddress : zeroAddress) as Address,
        symbol: "CUSTOM",
        name: "Custom ERC-20",
        decimals: 18,
        isNative: false,
        category: "custom",
      };
    }
    return supportedTokens.find((t) => t.symbol === selectedTokenKey) || NATIVE_HSK;
  }, [isCustomToken, customTokenAddress, selectedTokenKey, supportedTokens]);

  const isNative = isNativeToken(activeTokenInfo.address);
  const tokenAddressToUse = isCustomToken ? (customTokenAddress as Address) : activeTokenInfo.address;

  // Custom token Decimals and Symbol queries if custom token
  const customDecimalsQuery = useReadContract({
    address: isCustomToken && customTokenAddress.startsWith("0x") ? (customTokenAddress as Address) : zeroAddress,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: isCustomToken && customTokenAddress.startsWith("0x") && customTokenAddress.length === 42 },
  });

  const customSymbolQuery = useReadContract({
    address: isCustomToken && customTokenAddress.startsWith("0x") ? (customTokenAddress as Address) : zeroAddress,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: isCustomToken && customTokenAddress.startsWith("0x") && customTokenAddress.length === 42 },
  });

  const tokenDecimals = isCustomToken ? Number(customDecimalsQuery.data ?? 18) : activeTokenInfo.decimals;
  const tokenSymbol = isCustomToken ? customSymbolQuery.data || "TOKEN" : activeTokenInfo.symbol;

  const username = cleanUsername(recipient);
  const directRecipient = recipient.startsWith("0x") ? (recipient as Address) : undefined;
  const resolvingUsername = Boolean(username && !directRecipient);

  // Resolve username on-chain
  const resolution = useReadContract({
    address: usernameRegistryAddress ?? zeroAddress,
    abi: usernameRegistryAbi,
    functionName: "resolveUsername",
    args: [username],
    query: { enabled: Boolean(usernameRegistryAddress && resolvingUsername) },
  });

  const [apiResolvedAddress, setApiResolvedAddress] = useState<Address>();

  useEffect(() => {
    if (!resolvingUsername || !username) {
      setApiResolvedAddress(undefined);
      return;
    }
    if (resolution.data && resolution.data !== zeroAddress) {
      setApiResolvedAddress(undefined);
      return;
    }
    let active = true;
    resolveUsernameApi(username).then((res) => {
      if (active && res.found && res.address?.startsWith("0x")) {
        setApiResolvedAddress(res.address as Address);
      }
    });
    return () => {
      active = false;
    };
  }, [resolvingUsername, username, resolution.data]);

  const resolved = (directRecipient ||
    (resolution.data && resolution.data !== zeroAddress ? resolution.data : undefined) ||
    apiResolvedAddress) as Address | undefined;

  const { writeContract, data: hash, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  // Map interval type to seconds
  const intervalSeconds = useMemo(() => {
    if (demoMode) {
      if (intervalType === "daily") return 60n; // 1 min for testing
      if (intervalType === "weekly") return 120n; // 2 mins for testing
      return 180n; // 3 mins for testing
    } else {
      if (intervalType === "daily") return 86400n;
      if (intervalType === "weekly") return 604800n;
      return 2592000n; // 30 days
    }
  }, [intervalType, demoMode]);

  const numPeriods = Math.max(1, parseInt(periods || "1", 10));

  const parsedAmountPerPeriod = useMemo(() => {
    try {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return 0n;
      return isNative ? parseEther(amount) : parseUnits(amount, tokenDecimals);
    } catch {
      return 0n;
    }
  }, [amount, isNative, tokenDecimals]);

  const totalAmount = useMemo(() => {
    return parsedAmountPerPeriod * BigInt(numPeriods);
  }, [parsedAmountPerPeriod, numPeriods]);

  // Check ERC-20 Allowance
  const allowance = useReadContract({
    address: isNative ? zeroAddress : tokenAddressToUse,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address ?? zeroAddress, scheduledPaymentAddress ?? zeroAddress],
    query: {
      enabled:
        !isNative &&
        Boolean(
          address &&
            scheduledPaymentAddress &&
            tokenAddressToUse &&
            tokenAddressToUse !== zeroAddress
        ),
    },
  });

  const isApproved =
    isNative ||
    (allowance.data !== undefined &&
      allowance.data >= totalAmount &&
      totalAmount > 0n) ||
    tokenApproved;

  // Compute payment release dates timeline
  const releaseTimeline = useMemo(() => {
    const list = [];
    const count = Math.min(numPeriods, 24);
    const start = Date.now();
    for (let i = 0; i < count; i++) {
      const releaseTime = start + (i + 1) * Number(intervalSeconds) * 1000;
      list.push(new Date(releaseTime).toLocaleString());
    }
    return list;
  }, [numPeriods, intervalSeconds]);

  useEffect(() => {
    if (receipt.error) {
      setError("The transaction was rejected or could not be completed. Check your wallet.");
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
      return setError("ScheduledPayment contract is not configured in environment.");
    }
    if (!isConnected) {
      return setError("Connect your wallet first.");
    }
    if (!resolved) {
      return setError(resolvingUsername ? "Recipient @username is not registered." : "Enter a valid recipient.");
    }
    if (parsedAmountPerPeriod <= 0n || numPeriods <= 0) {
      return setError("Please enter a positive amount and periods.");
    }
    if (isCustomToken && (!customTokenAddress || !customTokenAddress.startsWith("0x") || customTokenAddress.length !== 42)) {
      return setError("Please enter a valid 42-character ERC-20 contract address.");
    }
    setReviewing(true);
  }

  function sign() {
    if (!resolved || !scheduledPaymentAddress) return;
    setError(undefined);

    if (isNative) {
      setTransactionKind("create");
      writeContract(
        {
          address: scheduledPaymentAddress,
          abi: scheduledPaymentAbi,
          functionName: "createSchedule",
          args: [resolved, zeroAddress, parsedAmountPerPeriod, intervalSeconds, BigInt(numPeriods)],
          value: totalAmount,
        },
        { onError: (err) => setError(err.message || "Wallet creation request rejected.") }
      );
    } else {
      if (isApproved) {
        setTransactionKind("create");
        writeContract(
          {
            address: scheduledPaymentAddress,
            abi: scheduledPaymentAbi,
            functionName: "createSchedule",
            args: [resolved, tokenAddressToUse, parsedAmountPerPeriod, intervalSeconds, BigInt(numPeriods)],
          },
          { onError: (err) => setError(err.message || "Wallet creation request rejected.") }
        );
      } else {
        setTransactionKind("approve");
        writeContract(
          {
            address: tokenAddressToUse,
            abi: erc20Abi,
            functionName: "approve",
            args: [scheduledPaymentAddress, totalAmount],
          },
          { onError: (err) => setError(err.message || "Token approval was rejected.") }
        );
      }
    }
  }

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="mb-6 flex items-start gap-4">
        <span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400">
          <Icon name="history" className="h-6 w-6 animate-spin-slow" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-white">Create Recurring Payment Schedule</h2>
          <p className="muted mt-1 text-sm leading-relaxed">
            Automate subscriptions, payroll, and recurring retainers using global stablecoins (USDT, USDC, DAI, EURC) or HSK.
          </p>
        </div>
      </div>

      <div className="grid gap-5">
        {/* Recipient */}
        <div className="grid gap-2">
          <label className="label">Recipient Address or @Username</label>
          <input
            className="field font-mono text-sm"
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value);
              setReviewing(false);
              setTokenApproved(false);
            }}
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
                <span className="text-rose-400">Username not found in registry</span>
              )}
            </p>
          )}
        </div>

        {/* Amount & Asset Selection */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="label">Amount / Period</label>
            <input
              className="field font-mono"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setTokenApproved(false);
              }}
              placeholder="0.00"
            />
          </div>

          <div className="grid gap-2">
            <label className="label">Asset / Stablecoin</label>
            <select
              className="field font-medium text-white"
              value={selectedTokenKey}
              onChange={(e) => {
                setSelectedTokenKey(e.target.value);
                setReviewing(false);
                setTokenApproved(false);
              }}
            >
              <optgroup label="⚡ Native HSKChain">
                <option value="HSK">HSK (Native Gas Token)</option>
              </optgroup>
              <optgroup label="💵 Global Stablecoins">
                {supportedTokens
                  .filter((t) => t.category === "stablecoin")
                  .map((t) => (
                    <option key={t.symbol} value={t.symbol}>
                      {t.symbol} · {t.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="💎 Crypto Assets">
                {supportedTokens
                  .filter((t) => t.category === "defi")
                  .map((t) => (
                    <option key={t.symbol} value={t.symbol}>
                      {t.symbol} · {t.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="⚙️ Custom">
                <option value="CUSTOM">Custom ERC-20 Token…</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Custom ERC-20 Input */}
        {isCustomToken && (
          <div className="rounded-xl border border-white/[0.08] bg-slate-900/60 p-4 animate-in fade-in duration-200">
            <label className="label text-xs">ERC-20 Token Contract Address (HSKChain)</label>
            <input
              className="field mt-1.5 font-mono text-xs"
              placeholder="0x…"
              value={customTokenAddress}
              onChange={(e) => {
                setCustomTokenAddress(e.target.value.trim());
                setReviewing(false);
                setTokenApproved(false);
              }}
            />
            {customSymbolQuery.data && (
              <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5">
                <Icon name="check" className="h-3 w-3" />
                Detected Token: <strong>{customSymbolQuery.data}</strong> ({Number(customDecimalsQuery.data ?? 18)} decimals)
              </p>
            )}
          </div>
        )}

        {/* Interval & Periods */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="label">Frequency</label>
            <select
              className="field text-white"
              value={intervalType}
              onChange={(e) => {
                setIntervalType(e.target.value);
                setTokenApproved(false);
              }}
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="label">Total Periods / Installments</label>
            <input
              type="number"
              min="1"
              max="60"
              className="field"
              value={periods}
              onChange={(e) => {
                setPeriods(e.target.value);
                setTokenApproved(false);
              }}
            />
          </div>
        </div>

        {/* Hackathon Speed Test Mode Toggle */}
        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs">
          <div className="flex items-center gap-2">
            <Icon name="spark" className="h-4 w-4 text-emerald-400" />
            <div>
              <p className="font-bold text-white">Hackathon Testing Acceleration</p>
              <p className="text-[11px] text-gray-400">
                {demoMode ? "1 Period = 1 to 3 minutes (Speed Test)" : "1 Period = Normal calendar days/months"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`rounded-lg px-2.5 py-1 font-semibold text-[11px] transition-colors ${
              demoMode
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-white/[0.05] text-gray-400 border border-white/[0.08]"
            }`}
            onClick={() => setDemoMode(!demoMode)}
          >
            {demoMode ? "Accelerated ⚡" : "Real Time ⏱️"}
          </button>
        </div>

        {/* Summary Card */}
        {amount && Number(amount) > 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-slate-950/60 p-4 text-xs space-y-2">
            <div className="flex justify-between text-gray-400">
              <span>Installment Plan:</span>
              <span className="text-white font-semibold">
                {periods} payments of {amount} {tokenSymbol} ({intervalType})
              </span>
            </div>
            <div className="flex justify-between border-t border-white/[0.04] pt-2 text-sm">
              <span className="font-bold text-gray-300">Total Commitment:</span>
              <span className="font-extrabold text-emerald-400 font-mono">
                {(Number(amount) * numPeriods).toFixed(2).replace(/\.00$/, "")} {tokenSymbol}
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </p>
        )}

        {/* Review & Submit Actions */}
        {!reviewing ? (
          <button
            className="button button-primary w-full"
            disabled={!amount || Number(amount) <= 0 || !recipient}
            onClick={review}
          >
            Review Recurring Plan
          </button>
        ) : (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-4">
            <h3 className="font-bold text-sm text-emerald-300">Confirm Schedule Deployment</h3>
            <dl className="grid gap-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-gray-400">Designated Recipient:</dt>
                <dd className="font-mono text-white">{resolved ? shortAddress(resolved) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Asset:</dt>
                <dd className="font-semibold text-emerald-400">{tokenSymbol} ({isNative ? "Native" : "ERC-20"})</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Amount per period:</dt>
                <dd className="font-mono text-white">{amount} {tokenSymbol}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Total periods:</dt>
                <dd className="text-white">{periods} installments</dd>
              </div>
              <div className="flex justify-between border-t border-white/[0.06] pt-2 font-bold text-sm">
                <dt className="text-gray-300">Total Lockup:</dt>
                <dd className="font-mono text-emerald-400">
                  {(Number(amount) * numPeriods).toFixed(2).replace(/\.00$/, "")} {tokenSymbol}
                </dd>
              </div>
            </dl>

            {/* Timeline preview */}
            <div className="rounded-lg bg-black/40 p-3 text-[11px] text-gray-400 space-y-1">
              <p className="font-semibold text-gray-300">First 3 Release Due Dates:</p>
              {releaseTimeline.slice(0, 3).map((t, idx) => (
                <p key={idx} className="flex justify-between">
                  <span>Period #{idx + 1}:</span>
                  <span className="font-mono text-emerald-300">{t}</span>
                </p>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                className="button button-secondary flex-1"
                disabled={isPending || receipt.isLoading}
                onClick={() => setReviewing(false)}
              >
                Back
              </button>
              <button
                className="button button-primary flex-1"
                disabled={isPending || receipt.isLoading}
                onClick={sign}
              >
                {isPending
                  ? "Awaiting Wallet…"
                  : receipt.isLoading
                  ? "Confirming on HSKChain…"
                  : !isNative && !isApproved
                  ? `1. Approve ${tokenSymbol} Access`
                  : `2. Deploy & Fund ${tokenSymbol} Schedule`}
              </button>
            </div>
          </div>
        )}

        <TransactionState
          state={
            hash
              ? receipt.isSuccess
                ? "Schedule Created & Funded ✓"
                : "Confirming on HSKChain…"
              : undefined
          }
          hash={hash}
        />
      </div>
    </div>
  );
}
