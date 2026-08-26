"use client";

import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { hashGuardAbi, hashGuardAddress } from "@/lib/contracts";
import { EscrowCard, type Escrow } from "@/components/escrow-card";

export default function PaymentsPage() {
  const { address } = useAccount(); const total = useReadContract({ address: hashGuardAddress, abi: hashGuardAbi, functionName: "nextEscrowId", query: { enabled: Boolean(hashGuardAddress) } });
  const count = Math.min(Number(total.data || 0n), 100); const contracts = useMemo(() => Array.from({ length: count }, (_, id) => ({ address: hashGuardAddress!, abi: hashGuardAbi, functionName: "getEscrow" as const, args: [BigInt(id)] })), [count]);
  const escrows = useReadContracts({ contracts, query: { enabled: Boolean(hashGuardAddress && count) } });
  const items = escrows.data?.map((result, id) => ({ id, escrow: result.result as Escrow })).filter(item => item.escrow && (!address || item.escrow.sender.toLowerCase() === address.toLowerCase() || item.escrow.recipient.toLowerCase() === address.toLowerCase())).reverse() || [];
  return <main className="shell py-10"><p className="text-sm font-bold tracking-widest text-emerald-400">ON-CHAIN ACTIVITY</p><h1 className="mt-2 text-3xl font-bold">Payment history</h1><p className="muted mt-2">Escrow state is read directly from the HashGuard contract. Connect a wallet to filter to your payments.</p>{!hashGuardAddress && <p className="mt-6 text-rose-200">HashGuard contract address is not configured.</p>}{total.isLoading && <p className="mt-6 muted">Loading escrows…</p>}<div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{items.map(item => <EscrowCard key={item.id} id={item.id} escrow={item.escrow} />)}</div>{total.data === 0n && <p className="mt-8 muted">No protected payments have been created yet.</p>}</main>;
}

