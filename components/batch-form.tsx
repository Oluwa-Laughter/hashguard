"use client";

import { useMemo, useState } from "react";
import { parseEther, zeroAddress, type Address } from "viem";
import { useAccount, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { hashGuardAbi, hashGuardAddress, usernameRegistryAbi, usernameRegistryAddress } from "@/lib/contracts";
import { cleanUsername, asAddress, shortAddress } from "@/lib/utils";
import { TransactionState } from "@/components/transaction-state";
import { Icon } from "@/components/icons";

type Row = { recipient: string; amount: string };

export function BatchForm({ initial }: { initial?: string }) {
  const initialRows = useMemo(() => {
    try {
      const values = JSON.parse(initial || "[]") as Row[];
      return values.length ? values : [{ recipient: "", amount: "" }, { recipient: "", amount: "" }];
    } catch {
      return [{ recipient: "", amount: "" }, { recipient: "", amount: "" }];
    }
  }, [initial]);

  const { isConnected } = useAccount();
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [review, setReview] = useState(false);
  const [error, setError] = useState<string>();
  
  const userRows = rows.map(row => ({
    ...row,
    username: cleanUsername(row.recipient),
    address: asAddress(row.recipient)
  }));
  
  const results = useReadContracts({
    contracts: userRows.map(row => ({
      address: usernameRegistryAddress ?? zeroAddress,
      abi: usernameRegistryAbi,
      functionName: "resolveUsername" as const,
      args: [row.username]
    })),
    query: { enabled: Boolean(usernameRegistryAddress && userRows.some(row => row.username && !row.address)) }
  });

  const recipients = useMemo(() => 
    userRows.map((row, i) => 
      row.address || (results.data?.[i]?.result && results.data[i].result !== zeroAddress ? results.data[i].result : undefined)
    ).filter(Boolean) as Address[],
    [userRows, results.data]
  );

  const amounts = useMemo(() => {
    try {
      return rows.map(row => parseEther(row.amount || "0"));
    } catch {
      return [];
    }
  }, [rows]);

  const total = amounts.reduce((sum, value) => sum + value, 0n);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  function change(i: number, patch: Partial<Row>) {
    setRows(current => current.map((row, index) => index === i ? { ...row, ...patch } : row));
    setReview(false);
  }

  function startReview() {
    setError(undefined);
    if (!isConnected) return setError("Connect the wallet that will make this payment.");
    if (!hashGuardAddress) return setError("HashGuard is not configured.");
    if (recipients.length !== rows.length) return setError("Resolve every recipient before signing.");
    if (amounts.length !== rows.length || amounts.some(value => value <= 0n)) return setError("Each recipient needs a positive amount.");
    setReview(true);
  }

  function sign() {
    if (hashGuardAddress) {
      writeContract(
        { address: hashGuardAddress, abi: hashGuardAbi, functionName: "batchNativePayment", args: [recipients, amounts], value: total },
        { onError: () => setError("Wallet request was rejected or failed.") }
      );
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
            Execute multiple HSK transfers atomically in a single blockchain transaction. If one transfer fails, the entire batch reverts.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <label className="label">Recipients & Amounts</label>
        {rows.map((row, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[1fr_160px_auto] items-center">
            <input
              className="field mt-0"
              value={row.recipient}
              placeholder="@recipient or 0x…"
              onChange={e => change(i, { recipient: e.target.value })}
            />
            <input
              className="field mt-0"
              value={row.amount}
              inputMode="decimal"
              placeholder="0.0 HSK"
              onChange={e => change(i, { amount: e.target.value })}
            />
            <button
              className="button button-secondary py-3"
              disabled={rows.length <= 1}
              onClick={() => { setRows(rows.filter((_, index) => index !== i)); setReview(false); }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <button
          className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
          onClick={() => setRows([...rows, { recipient: "", amount: "" }])}
        >
          <span>+ Add Recipient</span>
        </button>
      </div>

      {review && (
        <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.02] p-5">
          <p className="text-[10px] font-extrabold tracking-widest text-cyan-400 uppercase">Review Atomic Batch</p>
          <div className="mt-4 space-y-3 divide-y divide-white/[0.04] text-sm text-gray-400">
            {rows.map((row, i) => (
              <div key={i} className="flex justify-between items-center pt-2.5 first:pt-0">
                <div>
                  <span className="font-bold text-white">{row.recipient}</span>
                  <span className="text-[11px] text-gray-500 ml-2">({shortAddress(recipients[i])})</span>
                </div>
                <span className="font-semibold text-white">{row.amount} HSK</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 font-bold text-white text-base">
              <span>Total Value</span>
              <span className="text-cyan-400">{Number(total) / 1e18} HSK</span>
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
        <button className="button button-secondary flex-1" onClick={startReview}>
          Review Batch
        </button>
        {review && (
          <button
            className="button button-primary flex-1"
            disabled={isPending || receipt.isLoading}
            onClick={sign}
          >
            {isPending ? "Awaiting Wallet…" : receipt.isLoading ? "Confirming…" : "Confirm & Sign Batch"}
          </button>
        )}
      </div>

      <TransactionState
        state={hash ? (receipt.isSuccess ? "Batch Confirmed ✓" : receipt.isLoading ? "Confirming Batch on HSK…" : "Awaiting confirmation…") : undefined}
        hash={hash}
      />
    </div>
  );
}
