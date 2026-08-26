"use client";

import { useEffect, useMemo, useState } from "react";
import { parseEther, parseUnits, zeroAddress, type Address } from "viem";
import { useAccount, useReadContract, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import {
  erc20Abi,
  hashGuardAbi,
  hashGuardAddress,
  usernameRegistryAbi,
  usernameRegistryAddress,
} from "@/lib/contracts";
import { cleanUsername, asAddress, shortAddress } from "@/lib/utils";
import { TransactionState } from "@/components/transaction-state";
import { Icon } from "@/components/icons";
import { getSupportedTokens, isNativeToken, TokenInfo, NATIVE_HSK } from "@/lib/tokens";

type Row = { recipient: string; amount: string };

export function BatchForm({ initial, initialSymbol }: { initial?: string; initialSymbol?: string }) {
  const supportedTokens = useMemo(() => getSupportedTokens(), []);

  const initialRows = useMemo(() => {
    try {
      const values = JSON.parse(initial || "[]") as Row[];
      return values.length ? values : [{ recipient: "", amount: "" }, { recipient: "", amount: "" }];
    } catch {
      return [{ recipient: "", amount: "" }, { recipient: "", amount: "" }];
    }
  }, [initial]);

  const { address, isConnected } = useAccount();
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [review, setReview] = useState(false);
  const [error, setError] = useState<string>();
  const [tokenApproved, setTokenApproved] = useState(false);
  const [transactionKind, setTransactionKind] = useState<"approve" | "batch">();

  // Token Selection
  const [selectedTokenKey, setSelectedTokenKey] = useState<string>(() => {
    if (initialSymbol) {
      const match = supportedTokens.find(
        (t) => t.symbol.toLowerCase() === initialSymbol.toLowerCase()
      );
      if (match) return match.symbol;
    }
    return "HSK";
  });
  const [customTokenAddress, setCustomTokenAddress] = useState<string>("");

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
  const tokenSymbol = isCustomToken ? customSymbolQuery.data || "TOKEN" : activeTokenInfo.symbol;
  const isNative = isNativeToken(activeTokenInfo.address);
  const tokenAddressToUse = isCustomToken ? (customTokenAddress as Address) : activeTokenInfo.address;

  // Resolve Recipient Usernames on HSKChain
  const userRows = rows.map((row) => ({
    ...row,
    username: cleanUsername(row.recipient),
    address: asAddress(row.recipient),
  }));

  const results = useReadContracts({
    contracts: userRows.map((row) => ({
      address: usernameRegistryAddress ?? zeroAddress,
      abi: usernameRegistryAbi,
      functionName: "resolveUsername" as const,
      args: [row.username],
    })),
    query: { enabled: Boolean(usernameRegistryAddress && userRows.some((row) => row.username && !row.address)) },
  });

  const recipients = useMemo(
    () =>
      userRows
        .map((row, i) =>
          row.address ||
          (results.data?.[i]?.result && results.data[i].result !== zeroAddress
            ? (results.data[i].result as Address)
            : undefined)
        )
        .filter(Boolean) as Address[],
    [userRows, results.data]
  );

  const amounts = useMemo(() => {
    try {
      return rows.map((row) => {
        if (!row.amount || isNaN(Number(row.amount)) || Number(row.amount) <= 0) return 0n;
        return isNative ? parseEther(row.amount) : parseUnits(row.amount, tokenDecimals);
      });
    } catch {
      return [];
    }
  }, [rows, isNative, tokenDecimals]);

  const total = amounts.reduce((sum, value) => sum + value, 0n);

  // Allowance check for batch token payments
  const allowanceQuery = useReadContract({
    address: !isNative && tokenAddressToUse.startsWith("0x") ? tokenAddressToUse : zeroAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address ?? zeroAddress, hashGuardAddress ?? zeroAddress],
    query: { enabled: !isNative && Boolean(address && hashGuardAddress && tokenAddressToUse.startsWith("0x")) },
  });

  const hasAllowance = useMemo(() => {
    if (isNative) return true;
    if (tokenApproved) return true;
    if (allowanceQuery.data !== undefined && total > 0n) {
      return allowanceQuery.data >= total;
    }
    return false;
  }, [isNative, tokenApproved, allowanceQuery.data, total]);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (receipt.error) {
      setError("The transaction was rejected or failed. Check your wallet and try again.");
    }
    if (receipt.isSuccess && transactionKind === "approve") {
      setTokenApproved(true);
      setError(`Approval confirmed for ${tokenSymbol}. Ready to execute batch.`);
      setTransactionKind(undefined);
    }
  }, [receipt.error, receipt.isSuccess, transactionKind, tokenSymbol]);

  function change(i: number, patch: Partial<Row>) {
    setRows((current) => current.map((row, index) => (index === i ? { ...row, ...patch } : row)));
    setReview(false);
    setTokenApproved(false);
  }

  function addRow() {
    setRows((current) => [...current, { recipient: "", amount: "" }]);
    setReview(false);
  }

  function removeRow(index: number) {
    if (rows.length <= 2) return;
    setRows((current) => current.filter((_, i) => i !== index));
    setReview(false);
  }

  function startReview() {
    setError(undefined);
    if (!isConnected) return setError("Connect the wallet that will make this payment.");
    if (!hashGuardAddress) {
      return setError("HashGuard contract address is not configured. Please deploy contracts and configure environment.");
    }
    if (recipients.length !== rows.length) return setError("Every recipient must be a valid @username or 0x address.");
    if (amounts.length !== rows.length || amounts.some((value) => value <= 0n)) {
      return setError("Each recipient requires a positive payment amount.");
    }
    if (isCustomToken && (!customTokenAddress.startsWith("0x") || customTokenAddress.length !== 42)) {
      return setError("Enter a valid 42-character ERC-20 token address.");
    }
    setReview(true);
  }

  function sign() {
    if (!hashGuardAddress) return;
    setError(undefined);

    if (isNative) {
      setTransactionKind("batch");
      writeContract(
        {
          address: hashGuardAddress,
          abi: hashGuardAbi,
          functionName: "batchNativePayment",
          args: [recipients, amounts],
          value: total,
        },
        { onError: (err) => setError(err.message || "Batch wallet request failed.") }
      );
    } else {
      const targetToken = isCustomToken ? (customTokenAddress as Address) : activeTokenInfo.address;
      if (hasAllowance) {
        setTransactionKind("batch");
        writeContract(
          {
            address: hashGuardAddress,
            abi: hashGuardAbi,
            functionName: "batchTokenPayment",
            args: [targetToken, recipients, amounts],
          },
          { onError: (err) => setError(err.message || "Batch token payment failed.") }
        );
      } else {
        setTransactionKind("approve");
        writeContract(
          {
            address: targetToken,
            abi: erc20Abi,
            functionName: "approve",
            args: [hashGuardAddress, total],
          },
          { onError: (err) => setError(err.message || `Approval for ${tokenSymbol} was rejected.`) }
        );
      }
    }
  }

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="mb-6 flex items-start gap-4">
        <span className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-400">
          <Icon name="layers" className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-white">Atomic Batch Payment</h2>
          <p className="muted mt-1 text-sm leading-relaxed">
            Execute multiple transfers in a single transaction on HSKChain using native HSK or ERC-20 tokens.
            All transfers succeed together or the entire batch reverts atomically.
          </p>
        </div>
      </div>

      {/* Asset Selector */}
      <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <label className="label">Select Payment Asset</label>
        <select
          className="field mt-1.5"
          value={selectedTokenKey}
          onChange={(e) => {
            setSelectedTokenKey(e.target.value);
            setReview(false);
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

        {isCustomToken && (
          <div className="mt-3">
            <input
              className="field font-mono text-xs"
              placeholder="0x... (ERC-20 token address on HSKChain)"
              value={customTokenAddress}
              onChange={(e) => {
                setCustomTokenAddress(e.target.value.trim());
                setReview(false);
                setTokenApproved(false);
              }}
            />
            {customSymbolQuery.data && (
              <p className="mt-1 text-xs text-cyan-400">
                Detected token: <strong>{customSymbolQuery.data}</strong> ({customDecimalsQuery.data ?? 18} decimals)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Rows */}
      <div className="space-y-4">
        {rows.map((row, i) => {
          const resolvedAddress = recipients[i];
          const hasUsername = row.recipient.startsWith("@");
          return (
            <div key={i} className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-slate-900/40 p-4 sm:flex-row sm:items-center">
              <div className="flex-1 space-y-1">
                <input
                  className="field"
                  value={row.recipient}
                  onChange={(e) => change(i, { recipient: e.target.value })}
                  placeholder={`Recipient #${i + 1} (@username or 0x…)`}
                />
                {hasUsername && (
                  <p className="text-[11px]">
                    {resolvedAddress ? (
                      <span className="text-emerald-400 font-mono">Resolved: {shortAddress(resolvedAddress)}</span>
                    ) : (
                      <span className="text-gray-500">Resolving on HSKChain…</span>
                    )}
                  </p>
                )}
              </div>

              <div className="w-full sm:w-40 relative">
                <input
                  className="field pr-12"
                  inputMode="decimal"
                  value={row.amount}
                  onChange={(e) => change(i, { amount: e.target.value })}
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-2.5 text-xs font-semibold text-gray-500 pointer-events-none">
                  {tokenSymbol}
                </span>
              </div>

              {rows.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="self-center p-2 text-gray-500 hover:text-rose-400 transition"
                  title="Remove recipient"
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={addRow}
          className="button button-secondary text-xs"
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          Add Recipient
        </button>

        <p className="text-sm font-semibold text-gray-300">
          Total: <span className="text-emerald-400 font-bold font-mono">
            {rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0).toFixed(4)} {tokenSymbol}
          </span>
        </p>
      </div>

      {review && (
        <div className="mt-6 rounded-xl border border-cyan-500/25 bg-cyan-500/[0.03] p-5">
          <p className="text-[10px] font-extrabold tracking-widest text-cyan-400 uppercase">
            Review Atomic Batch Execution
          </p>
          <div className="mt-4 space-y-2 text-sm text-gray-400">
            <div className="flex justify-between border-b border-white/[0.04] pb-2">
              <span>Recipients Count</span>
              <span className="font-bold text-white">{recipients.length} transfers</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.04] pb-2">
              <span>Asset</span>
              <span className="font-semibold text-white">{tokenSymbol} ({isNative ? "Native Gas" : "ERC-20"})</span>
            </div>
            <div className="flex justify-between">
              <span>Total Payment</span>
              <span className="font-bold text-emerald-400">
                {rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)} {tokenSymbol}
              </span>
            </div>
          </div>
          <p className="mt-4 border-t border-white/[0.06] pt-4 text-xs text-gray-500">
            Gas savings of up to 40% compared to separate individual transfers.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button className="button button-secondary flex-1" onClick={startReview}>
          {review ? "Update Review" : "Review Batch"}
        </button>
        {review && (
          <button
            className="button button-primary flex-1"
            disabled={isPending || receipt.isLoading}
            onClick={sign}
          >
            {isPending
              ? "Awaiting Wallet…"
              : receipt.isLoading
              ? "Executing on HSKChain…"
              : !isNative && !hasAllowance
              ? `Approve ${tokenSymbol} for Batch`
              : "Execute Batch Transfer"}
          </button>
        )}
      </div>

      <TransactionState
        state={
          hash
            ? receipt.isSuccess
              ? "Batch Payment Completed ✓"
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
