"use client";

import Link from "next/link";
import { formatEther, zeroAddress, type Address } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { hashGuardAbi, hashGuardAddress } from "@/lib/contracts";
import { shortAddress } from "@/lib/utils";
import { TransactionState } from "@/components/transaction-state";

export type Escrow = { sender: Address; recipient: Address; token: Address; amount: bigint; expiry: bigint; status: number };
const labels = ["Pending", "Claimed", "Refunded"];
export function EscrowCard({ id, escrow }: { id: number; escrow: Escrow }) {
  const { address } = useAccount(); const { writeContract, data: hash, isPending } = useWriteContract(); const receipt = useWaitForTransactionReceipt({ hash });
  const expired = Number(escrow.expiry) <= Math.floor(Date.now() / 1000); const canClaim = address?.toLowerCase() === escrow.recipient.toLowerCase() && escrow.status === 0; const canRefund = address?.toLowerCase() === escrow.sender.toLowerCase() && escrow.status === 0 && expired;
  const action = canClaim ? () => writeContract({ address: hashGuardAddress!, abi: hashGuardAbi, functionName: "claim", args: [BigInt(id)] }) : canRefund ? () => writeContract({ address: hashGuardAddress!, abi: hashGuardAbi, functionName: "refund", args: [BigInt(id)] }) : undefined;
  return <article className="card"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-emerald-400">ESCROW #{id}</p><p className="mt-2 text-lg font-semibold">{escrow.token === zeroAddress ? `${Number(formatEther(escrow.amount)).toLocaleString()} HSK` : `${escrow.amount.toString()} token units`}</p></div><span className={`rounded-full px-2 py-1 text-xs ${escrow.status === 0 ? "bg-amber-400/15 text-amber-200" : "bg-emerald-400/15 text-emerald-200"}`}>{labels[escrow.status]}</span></div><div className="mt-4 grid gap-1 text-sm text-emerald-50/60"><p>From <span className="float-right text-emerald-50">{shortAddress(escrow.sender)}</span></p><p>To <span className="float-right text-emerald-50">{shortAddress(escrow.recipient)}</span></p><p>Expiry <span className="float-right text-emerald-50">{new Date(Number(escrow.expiry) * 1000).toLocaleString()}</span></p></div><div className="mt-5 flex gap-3"><Link href={`/pay/${id}`} className="button-secondary flex-1">Details</Link>{action && <button className="button flex-1" disabled={isPending || receipt.isLoading} onClick={action}>{isPending ? "Awaiting wallet…" : receipt.isLoading ? "Confirming…" : canClaim ? "Claim payment" : "Refund"}</button>}</div><TransactionState state={hash ? receipt.isSuccess ? "Confirmed ✓" : "Confirming…" : undefined} hash={hash} /></article>;
}

