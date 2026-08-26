"use client";

import { useMemo, useState } from "react";
import { parseEther, zeroAddress, type Address } from "viem";
import { useAccount, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { hashGuardAbi, hashGuardAddress, usernameRegistryAbi, usernameRegistryAddress } from "@/lib/contracts";
import { cleanUsername, asAddress, shortAddress } from "@/lib/utils";
import { TransactionState } from "@/components/transaction-state";

type Row = { recipient: string; amount: string };
export function BatchForm({ initial }: { initial?: string }) {
  const initialRows = useMemo(() => { try { const values = JSON.parse(initial || "[]") as Row[]; return values.length ? values : [{ recipient: "", amount: "" }, { recipient: "", amount: "" }]; } catch { return [{ recipient: "", amount: "" }, { recipient: "", amount: "" }]; } }, [initial]);
  const { isConnected } = useAccount(); const [rows, setRows] = useState<Row[]>(initialRows); const [review, setReview] = useState(false); const [error, setError] = useState<string>();
  const userRows = rows.map(row => ({ ...row, username: cleanUsername(row.recipient), address: asAddress(row.recipient) }));
  const results = useReadContracts({ contracts: userRows.map(row => ({ address: usernameRegistryAddress ?? zeroAddress, abi: usernameRegistryAbi, functionName: "resolveUsername" as const, args: [row.username] })), query: { enabled: Boolean(usernameRegistryAddress && userRows.some(row => row.username && !row.address)) } });
  const recipients = useMemo(() => userRows.map((row, i) => row.address || (results.data?.[i]?.result && results.data[i].result !== zeroAddress ? results.data[i].result : undefined)).filter(Boolean) as Address[], [userRows, results.data]);
  const amounts = useMemo(() => { try { return rows.map(row => parseEther(row.amount || "0")); } catch { return []; } }, [rows]); const total = amounts.reduce((sum, value) => sum + value, 0n);
  const { writeContract, data: hash, isPending } = useWriteContract(); const receipt = useWaitForTransactionReceipt({ hash });
  function change(i: number, patch: Partial<Row>) { setRows(current => current.map((row, index) => index === i ? { ...row, ...patch } : row)); setReview(false); }
  function startReview() { setError(undefined); if (!isConnected) return setError("Connect the wallet that will make this payment."); if (!hashGuardAddress) return setError("HashGuard is not configured."); if (recipients.length !== rows.length) return setError("Resolve every recipient before signing."); if (amounts.length !== rows.length || amounts.some(value => value <= 0n)) return setError("Each recipient needs a positive amount."); setReview(true); }
  function sign() { if (hashGuardAddress) writeContract({ address: hashGuardAddress, abi: hashGuardAbi, functionName: "batchNativePayment", args: [recipients, amounts], value: total }, { onError: () => setError("Wallet request was rejected or failed.") }); }
  return <div className="card"><h1 className="text-2xl font-bold">Atomic batch payment</h1><p className="muted mt-2">All HSK transfers settle in one transaction, or the entire batch reverts.</p><div className="mt-6 space-y-3">{rows.map((row, i) => <div key={i} className="grid gap-2 sm:grid-cols-[1fr_160px_auto]"><input className="field mt-0" value={row.recipient} placeholder="@alice" onChange={e => change(i, { recipient: e.target.value })} /><input className="field mt-0" value={row.amount} inputMode="decimal" placeholder="HSK amount" onChange={e => change(i, { amount: e.target.value })} /><button className="button-secondary" disabled={rows.length <= 1} onClick={() => { setRows(rows.filter((_, index) => index !== i)); setReview(false); }}>Remove</button></div>)}</div><button className="mt-3 text-sm text-emerald-300" onClick={() => setRows([...rows, { recipient: "", amount: "" }])}>+ Add recipient</button>
    {review && <div className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4"><p className="text-xs font-bold tracking-widest text-emerald-300">BATCH PAYMENT</p>{rows.map((row, i) => <p className="mt-2 text-sm" key={i}>{row.recipient} <span className="float-right">{row.amount} HSK · {shortAddress(recipients[i])}</span></p>)}<p className="mt-3 border-t border-emerald-50/10 pt-3 font-semibold">Total <span className="float-right">{Number(total) / 1e18} HSK</span></p></div>}
    {error && <p className="mt-4 text-sm text-rose-200">{error}</p>}<div className="mt-5 flex gap-3"><button className="button flex-1" onClick={startReview}>Review batch</button>{review && <button className="button-secondary flex-1" disabled={isPending || receipt.isLoading} onClick={sign}>{isPending ? "Awaiting wallet…" : receipt.isLoading ? "Confirming…" : "Confirm & sign"}</button>}</div><TransactionState state={hash ? receipt.isSuccess ? "Batch confirmed ✓" : "Confirming batch…" : undefined} hash={hash} />
  </div>;
}
