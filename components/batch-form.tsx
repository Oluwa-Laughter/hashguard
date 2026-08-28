"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { parseEther, parseUnits, zeroAddress, type Address } from "viem";
import { useAccount, useReadContract, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import {
  erc20Abi,
  hashGuardAbi,
  hashGuardAddress,
  usernameRegistryAbi,
  usernameRegistryAddress,
} from "@/lib/contracts";
import { hskChain } from "@/lib/chains";
import { cleanUsername, asAddress, shortAddress, formatFriendlyError } from "@/lib/utils";
import { TransactionState } from "@/components/transaction-state";
import { CopyButton } from "@/components/copy-button";
import { Icon } from "@/components/icons";
import { getSupportedTokens, isNativeToken, TokenInfo, NATIVE_HSK } from "@/lib/tokens";

type Row = { recipient: string; amount: string };

export function BatchForm({ initial, initialSymbol }: { initial?: string; initialSymbol?: string }) {
  const queryClient = useQueryClient();
  const supportedTokens = useMemo(() => getSupportedTokens(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [csvNotice, setCsvNotice] = useState<string>();
  const [showBulkPasteModal, setShowBulkPasteModal] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");
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
        category: "custom",
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
    query: {
      enabled: Boolean(usernameRegistryAddress && userRows.some((r) => r.username)),
    },
  });

  // Target Addresses Calculation
  const targets = useMemo(() => {
    return userRows.map((row, idx) => {
      if (row.address) return row.address;
      const res = results.data?.[idx]?.result as Address | undefined;
      return res && res !== zeroAddress ? res : undefined;
    });
  }, [userRows, results.data]);

  // Check ERC-20 Allowance
  const allowanceQuery = useReadContract({
    address: !isNative ? tokenAddressToUse : zeroAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address ?? zeroAddress, hashGuardAddress ?? zeroAddress],
    query: { enabled: !isNative && Boolean(address && hashGuardAddress && tokenAddressToUse !== zeroAddress) },
  });

  // Calculate Total Batch Amount
  const totalParsedAmount = useMemo(() => {
    let sum = 0n;
    for (const r of rows) {
      if (!r.amount || isNaN(Number(r.amount)) || Number(r.amount) <= 0) continue;
      try {
        sum += isNative ? parseEther(r.amount) : parseUnits(r.amount, tokenDecimals);
      } catch {
        // Skip invalid
      }
    }
    return sum;
  }, [rows, isNative, tokenDecimals]);

  const currentAllowance = allowanceQuery.data ?? 0n;
  const hasAllowance = isNative || tokenApproved || currentAllowance >= totalParsedAmount;

  // Transaction Writing
  const { writeContract, data: hash, isPending, reset: resetWrite } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash, chainId: hskChain.id });

  // Invalidate queries when transaction confirms
  useEffect(() => {
    if (receipt.isSuccess) {
      if (transactionKind === "approve") {
        setTokenApproved(true);
        allowanceQuery.refetch();
      } else {
        queryClient.invalidateQueries();
      }
    }
  }, [receipt.isSuccess, transactionKind, allowanceQuery, queryClient]);

  function updateRow(idx: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    setReview(false);
  }

  function addRow() {
    setRows((prev) => [...prev, { recipient: "", amount: "" }]);
    setReview(false);
  }

  function addFiveRows() {
    setRows((prev) => [
      ...prev,
      { recipient: "", amount: "" },
      { recipient: "", amount: "" },
      { recipient: "", amount: "" },
      { recipient: "", amount: "" },
      { recipient: "", amount: "" },
    ]);
    setReview(false);
  }

  function clearAllRows() {
    setRows([
      { recipient: "", amount: "" },
      { recipient: "", amount: "" },
    ]);
    setReview(false);
    setError(undefined);
    setCsvNotice(undefined);
  }

  function removeRow(idx: number) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== idx));
    setReview(false);
  }

  // Handle CSV Upload
  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const lines = content.split(/\r?\n/);
      const parsed: Row[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Skip header if line has "recipient" or "address"
        if (trimmed.toLowerCase().includes("recipient") && trimmed.toLowerCase().includes("amount")) {
          continue;
        }

        // Support comma, semicolon, tab, or space separation
        const parts = trimmed.split(/[,;\t\s]+/).map((p) => p.trim());
        if (parts.length >= 2) {
          const rec = parts[0];
          const amt = parts[1];
          if (rec && amt && !isNaN(Number(amt))) {
            parsed.push({ recipient: rec, amount: amt });
          }
        }
      }

      if (parsed.length > 0) {
        setRows(parsed);
        setReview(false);
        setError(undefined);
        setCsvNotice(`Successfully imported ${parsed.length} recipients from ${file.name}!`);
      } else {
        setError("Could not find valid recipient and amount pairs in the uploaded CSV file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // Download Sample CSV
  function downloadSampleCsv() {
    const sampleContent = `recipient,amount\n@alice,10.5\n0x4aa1a2F948b6d554720986F0632DBff9cBE5517f,25.0\n@bob,5.0\n`;
    const blob = new Blob([sampleContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "hashguard_batch_payroll_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Handle Bulk Text Paste
  function handleBulkPasteSubmit() {
    if (!bulkPasteText.trim()) return;

    const lines = bulkPasteText.split(/\r?\n/);
    const parsed: Row[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.toLowerCase().includes("recipient") && trimmed.toLowerCase().includes("amount")) {
        continue;
      }

      const parts = trimmed.split(/[,;\t\s]+/).map((p) => p.trim());
      if (parts.length >= 2) {
        const rec = parts[0];
        const amt = parts[1];
        if (rec && amt && !isNaN(Number(amt))) {
          parsed.push({ recipient: rec, amount: amt });
        }
      }
    }

    if (parsed.length > 0) {
      setRows(parsed);
      setReview(false);
      setError(undefined);
      setCsvNotice(`Successfully loaded ${parsed.length} recipients from bulk paste!`);
      setShowBulkPasteModal(false);
      setBulkPasteText("");
    } else {
      setError("Please ensure each line has: recipient,amount (e.g. @alice,10 or 0x...,25)");
    }
  }

  function handleReview() {
    setError(undefined);
    setCsvNotice(undefined);

    if (rows.length === 0) {
      return setError("Add at least one transfer to execute a batch.");
    }
    if (rows.length > 50) {
      return setError("Maximum batch limit is 50 recipients per transaction.");
    }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.recipient) {
        return setError(`Recipient in row #${i + 1} is empty.`);
      }
      if (!targets[i]) {
        return setError(`Recipient in row #${i + 1} ("${r.recipient}") could not be resolved to a valid address.`);
      }
      if (!r.amount || isNaN(Number(r.amount)) || Number(r.amount) <= 0) {
        return setError(`Amount in row #${i + 1} is invalid.`);
      }
    }

    setReview(true);
  }

  function sign() {
    if (!hashGuardAddress) return;
    setError(undefined);
    resetWrite();

    const recipients = targets.filter(Boolean) as Address[];
    const amounts = rows.map((r) =>
      isNative ? parseEther(r.amount || "0") : parseUnits(r.amount || "0", tokenDecimals)
    );
    const total = amounts.reduce((a, b) => a + b, 0n);

    if (isNative) {
      setTransactionKind("batch");
      writeContract(
        {
          chainId: hskChain.id,
          address: hashGuardAddress,
          abi: hashGuardAbi,
          functionName: "batchNativePayment",
          args: [recipients, amounts],
          value: total,
        },
        { onError: (err) => setError(formatFriendlyError(err) || "Batch wallet request failed.") }
      );
    } else {
      const targetToken = isCustomToken ? (customTokenAddress as Address) : activeTokenInfo.address;
      if (hasAllowance) {
        setTransactionKind("batch");
        writeContract(
          {
            chainId: hskChain.id,
            address: hashGuardAddress,
            abi: hashGuardAbi,
            functionName: "batchTokenPayment",
            args: [targetToken, recipients, amounts],
          },
          { onError: (err) => setError(formatFriendlyError(err) || "Batch token payment failed.") }
        );
      } else {
        setTransactionKind("approve");
        writeContract(
          {
            chainId: hskChain.id,
            address: targetToken,
            abi: erc20Abi,
            functionName: "approve",
            args: [hashGuardAddress, total],
          },
          { onError: (err) => setError(formatFriendlyError(err) || `Approval for ${tokenSymbol} was rejected.`) }
        );
      }
    }
  }

  // Success Screen
  if (transactionKind === "batch" && receipt.isSuccess) {
    const totalAmount = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const explorerUrl = hskChain.blockExplorers?.default.url || "https://testnet-explorer.hskchain.net";

    return (
      <div className="card text-center py-10 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <Icon name="check" className="h-8 w-8" />
        </span>
        <h2 className="text-xl font-extrabold text-white mt-5">Batch Transfers Completed!</h2>
        <p className="text-sm text-gray-300 mt-2 max-w-md mx-auto leading-relaxed">
          Your batch payment has been successfully completed and registered on {hskChain.name}. All transfers were executed in a single atomic transaction.
        </p>

        <div className="mt-6 p-4 rounded-xl border border-white/[0.04] bg-white/[0.02] text-xs max-w-sm mx-auto text-left space-y-2 text-gray-400">
          <div className="flex justify-between">
            <span>Total Transfers:</span>
            <span className="text-white font-bold">{rows.length} recipients</span>
          </div>
          <div className="flex justify-between">
            <span>Total Value Paid:</span>
            <span className="text-emerald-400 font-bold font-mono">
              {totalAmount.toLocaleString()} {tokenSymbol}
            </span>
          </div>
          {hash && (
            <div className="flex justify-between items-center border-t border-white/[0.04] pt-2 mt-2">
              <span>Tx Hash:</span>
              <div className="flex items-center gap-1.5">
                <a
                  href={`${explorerUrl}/tx/${hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-emerald-400 hover:underline"
                >
                  {shortAddress(hash)}
                </a>
                <CopyButton text={hash} iconOnly title="Copy transaction hash" />
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={() => {
              clearAllRows();
              setReview(false);
              setTransactionKind(undefined);
            }}
            className="button button-primary text-xs py-2.5 px-4"
          >
            Create New Batch
          </button>
          <Link href="/dashboard" className="button button-secondary text-xs py-2.5 px-4">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
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
          className="field mt-1.5 font-medium text-white"
          value={selectedTokenKey}
          onChange={(e) => {
            setSelectedTokenKey(e.target.value);
            setReview(false);
            setTokenApproved(false);
          }}
        >
          <optgroup label="Native HSKChain">
            <option value="HSK">HSK (Native Gas Token)</option>
          </optgroup>
          <optgroup label="Global Stablecoins">
            {supportedTokens
              .filter((t) => t.category === "stablecoin")
              .map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol} · {t.name}
                </option>
              ))}
          </optgroup>
          <optgroup label="Crypto Assets">
            {supportedTokens
              .filter((t) => t.category === "defi")
              .map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol} · {t.name}
                </option>
              ))}
          </optgroup>
          <optgroup label="Custom Token">
            <option value="CUSTOM">Custom ERC-20 Token…</option>
          </optgroup>
        </select>

        {/* Quick Global Stablecoin Chips */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          <span className="text-[11px] font-semibold text-gray-500 mr-1">Quick Select:</span>
          {["USDT", "USDC", "WETH", "WBTC", "WHSK"].map((sym) => {
            const isSelected = selectedTokenKey === sym;
            return (
              <button
                key={sym}
                type="button"
                onClick={() => {
                  setSelectedTokenKey(sym);
                  setReview(false);
                  setTokenApproved(false);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-white/[0.03] text-gray-400 hover:bg-white/[0.08] hover:text-white border border-white/[0.04]"
                }`}
              >
                {sym}
              </button>
            );
          })}
        </div>

        {/* Custom ERC-20 Input */}
        {isCustomToken && (
          <div className="mt-3 border-t border-white/[0.04] pt-3">
            <label className="text-xs text-gray-400">Custom ERC-20 Contract Address on HSKChain:</label>
            <input
              type="text"
              placeholder="0x..."
              value={customTokenAddress}
              onChange={(e) => {
                setCustomTokenAddress(e.target.value);
                setReview(false);
                setTokenApproved(false);
              }}
              className="field font-mono text-xs mt-1.5"
            />
          </div>
        )}
      </div>

      {/* CSV & Bulk Automation Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-white/[0.06] bg-slate-900/60 p-3">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCsvFile}
            accept=".csv,.txt"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="button button-secondary py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5"
            title="Import recipients and amounts from a CSV file"
          >
            <Icon name="upload" className="h-3.5 w-3.5 text-cyan-400" />
            <span>Upload CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBulkPasteModal(true)}
            className="button button-secondary py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5"
            title="Paste multi-line text directly"
          >
            <Icon name="terminal" className="h-3.5 w-3.5 text-cyan-400" />
            <span>Paste Bulk</span>
          </button>
          <button
            type="button"
            onClick={downloadSampleCsv}
            className="py-1.5 px-2.5 text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            title="Download formatted CSV sample"
          >
            <Icon name="download" className="h-3.5 w-3.5" />
            <span>Sample CSV</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addFiveRows}
            className="text-[11px] text-cyan-400 hover:underline font-semibold"
          >
            + Add 5 Rows
          </button>
          <button
            type="button"
            onClick={clearAllRows}
            className="text-[11px] text-gray-500 hover:text-rose-400 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {csvNotice && (
        <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center justify-between">
          <span>{csvNotice}</span>
          <button onClick={() => setCsvNotice(undefined)} className="text-emerald-400 hover:text-white">
            <Icon name="x" className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Recipient Rows List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Recipients ({rows.length})
          </span>
          <span className="text-xs font-mono text-cyan-400 font-semibold">
            Total: {rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0).toLocaleString()} {tokenSymbol}
          </span>
        </div>

        {rows.map((row, idx) => (
          <div key={idx} className="rounded-xl border border-white/[0.06] bg-slate-950/60 p-3.5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.04] text-[11px] font-mono text-gray-400 shrink-0">
                #{idx + 1}
              </span>
              <input
                className="field text-xs font-mono flex-1"
                placeholder="Recipient (@username or 0x...)"
                value={row.recipient}
                onChange={(e) => updateRow(idx, { recipient: e.target.value })}
              />
              <div className="w-32 shrink-0">
                <input
                  className="field text-xs font-mono text-right"
                  placeholder={`Amount (${tokenSymbol})`}
                  value={row.amount}
                  onChange={(e) => updateRow(idx, { amount: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(idx)}
                disabled={rows.length <= 1}
                className="rounded-lg p-2 text-gray-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors disabled:opacity-30 shrink-0"
                title="Remove recipient"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            {/* Resolved destination tag */}
            {row.recipient && (
              <div className="pl-8 text-[11px] text-gray-400 flex items-center gap-1.5 font-mono">
                {targets[idx] ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Icon name="check" className="h-3 w-3" /> Resolved: {shortAddress(targets[idx])}
                  </span>
                ) : (
                  <span className="text-amber-400">Resolving on HSKChain…</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="button button-secondary mt-4 w-full text-xs font-semibold py-2.5"
        onClick={addRow}
      >
        + Add Recipient
      </button>

      {/* Review Box */}
      {review && (
        <div className="mt-6 rounded-xl border border-cyan-500/25 bg-cyan-500/[0.03] p-5">
          <p className="text-[10px] font-extrabold tracking-widest text-cyan-400 uppercase">
            Review Batch Execution
          </p>
          <div className="mt-4 grid gap-2 text-xs text-gray-400">
            <div className="flex justify-between border-b border-white/[0.04] pb-2">
              <span>Recipients:</span>
              <span className="font-bold text-white">{rows.length} addresses</span>
            </div>
            <div className="flex justify-between border-b border-white/[0.04] pb-2">
              <span>Total Payment Value:</span>
              <span className="font-bold text-cyan-400 font-mono">
                {rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0).toLocaleString()} {tokenSymbol}
              </span>
            </div>
            <div className="flex justify-between border-b border-white/[0.04] pb-2">
              <span>Execution Guarantee:</span>
              <span className="text-emerald-400 font-semibold">100% Atomic Settlement</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
          {error}
        </p>
      )}

      {/* Action CTA */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="button button-secondary flex-1 py-3"
          onClick={handleReview}
        >
          {review ? "Update Review" : "Review Batch"}
        </button>
        {review && (
          <button
            type="button"
            className="button button-primary flex-1 py-3 font-bold"
            disabled={isPending || receipt.isLoading}
            onClick={sign}
          >
            {isPending
              ? "Awaiting Wallet…"
              : receipt.isLoading
              ? "Confirming on HSK…"
              : !isNative && !hasAllowance
              ? `Approve ${tokenSymbol}`
              : "Execute Batch Payment"}
          </button>
        )}
      </div>

      <TransactionState
        state={
          hash
            ? receipt.isSuccess
              ? "Confirmed ✓"
              : receipt.isLoading
              ? "Confirming on HSKChain…"
              : "Awaiting confirmation…"
            : undefined
        }
        hash={hash}
      />

      {/* Bulk Paste Modal */}
      {showBulkPasteModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowBulkPasteModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-slate-950 p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white">Paste Bulk Recipients</h3>
            <p className="text-xs text-gray-400 mt-1">
              Paste lines from spreadsheets or text documents. Format: <code className="text-cyan-400">@username,amount</code> or <code className="text-cyan-400">0xaddress,amount</code>
            </p>
            <textarea
              rows={8}
              value={bulkPasteText}
              onChange={(e) => setBulkPasteText(e.target.value)}
              placeholder={"@alice, 10\n0x4aa1a2F948b6d554720986F0632DBff9cBE5517f, 25.5\n@bob, 5"}
              className="field mt-3 w-full font-mono text-xs"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkPasteModal(false)}
                className="button button-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkPasteSubmit}
                className="button button-primary text-xs py-2 px-4 font-bold"
              >
                Parse & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
