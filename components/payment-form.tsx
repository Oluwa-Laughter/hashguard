"use client";

import { useEffect, useMemo, useState } from "react";
import { parseEther, parseUnits, zeroAddress, type Address } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import {
  contractsConfigured,
  erc20Abi,
  hashGuardAbi,
  hashGuardAddress,
  usernameRegistryAbi,
  usernameRegistryAddress,
} from "@/lib/contracts";
import { cleanUsername, shortAddress } from "@/lib/utils";
import { TransactionState } from "@/components/transaction-state";
import { Icon } from "@/components/icons";
import { getSupportedTokens, isNativeToken, TokenInfo, NATIVE_HSK } from "@/lib/tokens";

type PaymentFormProps = {
  initial?: {
    recipient?: string;
    amount?: string;
    days?: string;
    token?: "native" | "token";
    tokenSymbol?: string;
  };
  compact?: boolean;
};

export function PaymentForm({ initial, compact }: PaymentFormProps) {
  const { address, isConnected } = useAccount();
  const supportedTokens = useMemo(() => getSupportedTokens(), []);

  // Form Inputs
  const [recipient, setRecipient] = useState(initial?.recipient || "");
  const [amount, setAmount] = useState(initial?.amount || "");

  // Expiration Date/Duration Control
  const [expiryMode, setExpiryMode] = useState<"preset" | "date">("preset");
  const [days, setDays] = useState(initial?.days || "7");
  const [customExpiryDate, setCustomExpiryDate] = useState<string>(() => {
    const d = new Date(Date.now() + 7 * 86400 * 1000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });

  const [selectedTokenKey, setSelectedTokenKey] = useState<string>(() => {
    if (initial?.tokenSymbol) {
      const match = supportedTokens.find(
        (t) => t.symbol.toLowerCase() === initial.tokenSymbol?.toLowerCase()
      );
      if (match) return match.symbol;
    }
    return initial?.token === "token" ? "USDC" : "HSK";
  });
  const [customTokenAddress, setCustomTokenAddress] = useState<string>("");

  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string>();
  const [tokenApproved, setTokenApproved] = useState(false);
  const [transactionKind, setTransactionKind] = useState<"approve" | "escrow">();

  const isCustomToken = selectedTokenKey === "CUSTOM";
  const activeTokenInfo = useMemo<TokenInfo>(() => {
    if (isCustomToken) {
      return {
        address: (customTokenAddress.startsWith("0x") ? customTokenAddress : zeroAddress) as Address,
        symbol: "CUSTOM",
        name: "Custom ERC-20",
        decimals: 18,
        isNative: false,
      };
    }
    return supportedTokens.find((t) => t.symbol === selectedTokenKey) || NATIVE_HSK;
  }, [isCustomToken, customTokenAddress, selectedTokenKey, supportedTokens]);

  const username = cleanUsername(recipient);
  const directRecipient = recipient.startsWith("0x") ? (recipient as Address) : undefined;
  const resolvingUsername = Boolean(username && !directRecipient);

  // Username Resolution
  const resolution = useReadContract({
    address: usernameRegistryAddress ?? zeroAddress,
    abi: usernameRegistryAbi,
    functionName: "resolveUsername",
    args: [username],
    query: { enabled: Boolean(usernameRegistryAddress && resolvingUsername) },
  });

  const resolved = (directRecipient ||
    (resolution.data && resolution.data !== zeroAddress ? resolution.data : undefined)) as
    | Address
    | undefined;

  // Read Custom Token Decimals & Symbol
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
  const tokenSymbol = isCustomToken
    ? customSymbolQuery.data || "TOKEN"
    : activeTokenInfo.symbol;
  const isNative = isNativeToken(activeTokenInfo.address);

  // Allowance check for ERC-20 tokens
  const tokenAddressToUse = isCustomToken ? (customTokenAddress as Address) : activeTokenInfo.address;
  const allowanceQuery = useReadContract({
    address: !isNative && tokenAddressToUse.startsWith("0x") ? tokenAddressToUse : zeroAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address ?? zeroAddress, hashGuardAddress ?? zeroAddress],
    query: { enabled: !isNative && Boolean(address && hashGuardAddress && tokenAddressToUse.startsWith("0x")) },
  });

  const parsedAmount = useMemo(() => {
    try {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return 0n;
      return isNative ? parseEther(amount) : parseUnits(amount, tokenDecimals);
    } catch {
      return 0n;
    }
  }, [amount, isNative, tokenDecimals]);

  // Determine if already approved on-chain
  const hasAllowance = useMemo(() => {
    if (isNative) return true;
    if (tokenApproved) return true;
    if (allowanceQuery.data !== undefined && parsedAmount > 0n) {
      return allowanceQuery.data >= parsedAmount;
    }
    return false;
  }, [isNative, tokenApproved, allowanceQuery.data, parsedAmount]);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  // Calculate exact expiry timestamp (in seconds)
  const expiryTimestamp = useMemo(() => {
    if (expiryMode === "date") {
      const ts = Math.floor(new Date(customExpiryDate).getTime() / 1000);
      return isNaN(ts) || ts <= Math.floor(Date.now() / 1000)
        ? Math.floor(Date.now() / 1000) + 7 * 86400
        : ts;
    }
    return Math.floor(Date.now() / 1000) + Math.max(1, Number(days || 7)) * 86400;
  }, [expiryMode, customExpiryDate, days]);

  const formattedExpiry = useMemo(() => {
    return new Date(expiryTimestamp * 1000).toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [expiryTimestamp]);

  const nowFormatted = useMemo(() => {
    return new Date(Date.now() + 3600000).toISOString().slice(0, 16);
  }, []);

  useEffect(() => {
    if (receipt.error) {
      setError("Transaction was not confirmed. Check your wallet and try again.");
    }
    if (receipt.isSuccess && transactionKind === "approve") {
      setTokenApproved(true);
      setError(`Approval confirmed for ${tokenSymbol}. Ready to create escrow.`);
      setTransactionKind(undefined);
    }
  }, [receipt.error, receipt.isSuccess, transactionKind, tokenSymbol]);

  function review() {
    setError(undefined);
    if (!contractsConfigured) {
      return setError(
        "HashGuard contracts are not yet configured in environment. Please deploy via `forge script script/Deploy.s.sol` and set NEXT_PUBLIC_HASHGUARD_ADDRESS."
      );
    }
    if (!isConnected) return setError("Connect the wallet that will fund this payment.");
    if (!resolved) {
      return setError(
        resolvingUsername
          ? "That username is not registered on HSK Chain."
          : "Enter a valid recipient address (0x...) or username (@username)."
      );
    }
    if (!parsedAmount) return setError("Enter a positive amount.");
    if (expiryTimestamp <= Math.floor(Date.now() / 1000)) {
      return setError("The expiration date must be in the future.");
    }
    if (isCustomToken && (!customTokenAddress.startsWith("0x") || customTokenAddress.length !== 42)) {
      return setError("Enter a valid 42-character ERC-20 token address.");
    }
    setReviewing(true);
  }

  function sign() {
    if (!resolved || !hashGuardAddress) return;
    setError(undefined);

    if (isNative) {
      setTransactionKind("escrow");
      writeContract(
        {
          address: hashGuardAddress,
          abi: hashGuardAbi,
          functionName: "createNativeEscrow",
          args: [resolved, BigInt(expiryTimestamp)],
          value: parsedAmount,
        },
        { onError: (err) => setError(err.message || "Wallet request was rejected.") }
      );
    } else {
      const targetToken = isCustomToken ? (customTokenAddress as Address) : activeTokenInfo.address;
      if (hasAllowance) {
        setTransactionKind("escrow");
        writeContract(
          {
            address: hashGuardAddress,
            abi: hashGuardAbi,
            functionName: "createTokenEscrow",
            args: [targetToken, resolved, parsedAmount, BigInt(expiryTimestamp)],
          },
          { onError: (err) => setError(err.message || "Escrow creation was rejected.") }
        );
      } else {
        setTransactionKind("approve");
        writeContract(
          {
            address: targetToken,
            abi: erc20Abi,
            functionName: "approve",
            args: [hashGuardAddress, parsedAmount],
          },
          { onError: (err) => setError(err.message || `Approval for ${tokenSymbol} was rejected.`) }
        );
      }
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
            Lock funds securely inside HashGuard escrow for native HSK or any ERC-20 token (USDC, USDT, WETH).
            Set the exact expiration date — recipients claim on-chain, or senders can reclaim funds once expired.
          </p>
        </div>
      </div>

      <div className="grid gap-5">
        {/* Recipient Field */}
        <div className="grid gap-2">
          <label className="label">Recipient Address or Username</label>
          <div className="relative">
            <input
              className="field pr-10"
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                setReviewing(false);
                setTokenApproved(false);
              }}
              placeholder="@alice or 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
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
                <span className="text-rose-400">Username could not be resolved on HSK Chain</span>
              )}
            </p>
          )}
        </div>

        {/* Amount & Asset */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="label">Amount</label>
            <input
              className="field"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setTokenApproved(false);
                setReviewing(false);
              }}
              placeholder="0.00"
            />
          </div>

          <div className="grid gap-2">
            <label className="label">Select Asset</label>
            <select
              className="field"
              value={selectedTokenKey}
              onChange={(e) => {
                setSelectedTokenKey(e.target.value);
                setReviewing(false);
                setTokenApproved(false);
              }}
            >
              {supportedTokens.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol} {token.isNative ? "(Native HSK)" : `(${token.name})`}
                </option>
              ))}
              <option value="CUSTOM">Custom ERC-20 Token…</option>
            </select>
          </div>
        </div>

        {/* Custom ERC-20 Contract Address Input */}
        {isCustomToken && (
          <div className="grid gap-2 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4">
            <label className="label text-cyan-300">Custom ERC-20 Contract Address</label>
            <input
              className="field font-mono text-xs"
              placeholder="0x... (ERC-20 contract address on HSKChain)"
              value={customTokenAddress}
              onChange={(e) => {
                setCustomTokenAddress(e.target.value.trim());
                setTokenApproved(false);
                setReviewing(false);
              }}
            />
            {customSymbolQuery.data && (
              <p className="text-xs text-cyan-400">
                Detected token: <strong>{customSymbolQuery.data}</strong> ({customDecimalsQuery.data ?? 18} decimals)
              </p>
            )}
          </div>
        )}

        {/* Expiration Date Selection Controls */}
        <div className="rounded-xl border border-white/[0.06] bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <label className="label text-xs uppercase tracking-wider text-emerald-400">
              Escrow Protection Expiry
            </label>
            <div className="flex gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setExpiryMode("preset");
                  setReviewing(false);
                }}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  expiryMode === "preset"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                Quick Presets
              </button>
              <button
                type="button"
                onClick={() => {
                  setExpiryMode("date");
                  setReviewing(false);
                }}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  expiryMode === "date"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                Exact Date & Time
              </button>
            </div>
          </div>

          {expiryMode === "preset" ? (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "1 Day", val: "1" },
                  { label: "3 Days", val: "3" },
                  { label: "7 Days (Standard)", val: "7" },
                  { label: "14 Days", val: "14" },
                  { label: "30 Days (Month)", val: "30" },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => {
                      setDays(preset.val);
                      setReviewing(false);
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      days === preset.val
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-white/[0.06] bg-white/[0.02] text-gray-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-gray-500">Or custom days:</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  className="field w-24 py-1 text-xs"
                  value={days}
                  onChange={(e) => {
                    setDays(e.target.value);
                    setReviewing(false);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <label className="text-xs text-gray-400">Select Expiration Date & Time:</label>
              <input
                type="datetime-local"
                min={nowFormatted}
                className="field mt-1.5"
                value={customExpiryDate}
                onChange={(e) => {
                  setCustomExpiryDate(e.target.value);
                  setReviewing(false);
                }}
              />
            </div>
          )}

          {/* Live Expiration Display */}
          <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-2.5 text-xs">
            <span className="text-gray-500">Refund available after:</span>
            <span className="font-semibold text-emerald-400">{formattedExpiry}</span>
          </div>
        </div>
      </div>

      {/* Review Box */}
      {reviewing && resolved && (
        <div className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.03] p-5">
          <p className="text-[10px] font-extrabold tracking-widest text-emerald-400 uppercase">
            Review Payment Escrow
          </p>
          <div className="mt-4 grid gap-2.5 text-sm text-gray-400">
            <div className="flex justify-between border-b border-white/[0.04] pb-2">
              <span>Recipient</span>
              <span className="font-bold text-white">
                {recipient.startsWith("@") ? recipient : shortAddress(resolved)}
              </span>
            </div>
            <div className="flex justify-between border-b border-white/[0.04] pb-2">
              <span>Resolved Address</span>
              <span className="font-mono text-xs text-white">{resolved}</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.04] pb-2">
              <span>Escrow Value</span>
              <span className="font-bold text-emerald-400">
                {amount} {tokenSymbol}
              </span>
            </div>
            <div className="flex justify-between border-b border-white/[0.04] pb-2">
              <span>Asset Type</span>
              <span className="text-xs text-gray-300">
                {isNative ? "Native Gas Currency (HSK)" : `ERC-20 Token (${shortAddress(tokenAddressToUse)})`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Protection Expiry Date</span>
              <span className="font-semibold text-white">{formattedExpiry} (Refundable thereafter)</span>
            </div>
          </div>
          <p className="mt-4 border-t border-white/[0.06] pt-4 text-xs text-gray-500 leading-relaxed">
            Funds enter smart-contract custody. Recipient claims the payment, or you can trigger a full refund once the
            protection window expires.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </p>
      )}

      {/* Action Buttons */}
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
            {isPending
              ? "Awaiting Wallet…"
              : receipt.isLoading
              ? "Confirming on HSK…"
              : !isNative && !hasAllowance
              ? `Approve ${tokenSymbol}`
              : "Confirm & Lock Escrow"}
          </button>
        )}
      </div>

      <TransactionState
        state={
          hash
            ? receipt.isSuccess
              ? "Confirmed ✓"
              : receipt.isLoading
              ? "Confirming on HSK Chain…"
              : "Awaiting confirmation…"
            : undefined
        }
        hash={hash}
      />
    </div>
  );
}
