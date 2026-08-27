"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { hashGuardAbi, hashGuardAddress } from "@/lib/contracts";
import { EscrowCard, type Escrow } from "@/components/escrow-card";
import { AccessGuard } from "@/components/access-guard";
import { Icon } from "@/components/icons";

function PaymentsContent() {
  const { address } = useAccount();
  const [filter, setFilter] = useState<"all" | "pending" | "claimed" | "refunded">("all");

  const total = useReadContract({
    address: hashGuardAddress,
    abi: hashGuardAbi,
    functionName: "nextEscrowId",
    query: { enabled: Boolean(hashGuardAddress) },
  });

  const count = Math.min(Number(total.data || 0n), 100);
  const contracts = useMemo(
    () =>
      Array.from({ length: count }, (_, id) => ({
        address: hashGuardAddress!,
        abi: hashGuardAbi,
        functionName: "getEscrow" as const,
        args: [BigInt(id)],
      })),
    [count]
  );

  const escrows = useReadContracts({
    contracts,
    query: { enabled: Boolean(hashGuardAddress && count) },
  });

  const items = useMemo(() => {
    return (
      escrows.data
        ?.map((result, id) => ({ id, escrow: result.result as Escrow }))
        .filter(
          (item) =>
            item.escrow &&
            (!address ||
              item.escrow.sender.toLowerCase() === address.toLowerCase() ||
              item.escrow.recipient.toLowerCase() === address.toLowerCase())
        )
        .reverse() || []
    );
  }, [escrows.data, address]);

  // Counts for status tabs
  const pendingCount = useMemo(() => items.filter((i) => i.escrow.status === 0).length, [items]);
  const claimedCount = useMemo(() => items.filter((i) => i.escrow.status === 1).length, [items]);
  const refundedCount = useMemo(() => items.filter((i) => i.escrow.status === 2).length, [items]);

  // Filtered view
  const filteredItems = useMemo(() => {
    if (filter === "pending") return items.filter((i) => i.escrow.status === 0);
    if (filter === "claimed") return items.filter((i) => i.escrow.status === 1);
    if (filter === "refunded") return items.filter((i) => i.escrow.status === 2);
    return items;
  }, [items, filter]);

  return (
    <main className="shell py-8 sm:py-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <p className="text-xs font-bold tracking-widest text-emerald-400 uppercase">ON-CHAIN ACTIVITY</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white">Payment History</h1>
          <p className="muted mt-1 text-xs sm:text-sm">
            Real-time escrow state read directly from the HashGuard contract on HSKChain.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link href="/claim" className="button button-secondary py-2 px-3.5 text-xs font-bold flex items-center gap-1.5">
            <Icon name="check" className="h-3.5 w-3.5 text-emerald-400" />
            <span>Claim Inbox</span>
          </Link>
          <Link href="/pay" className="button button-primary py-2 px-3.5 text-xs font-bold flex items-center gap-1.5">
            <Icon name="shield" className="h-3.5 w-3.5" />
            <span>New Payment</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Count */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-slate-900/60 p-1 overflow-x-auto">
          {[
            { key: "all" as const, label: "All", count: items.length },
            { key: "pending" as const, label: "Pending", count: pendingCount },
            { key: "claimed" as const, label: "Claimed", count: claimedCount },
            { key: "refunded" as const, label: "Refunded", count: refundedCount },
          ].map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  active
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-gray-400 hover:text-white"
                }`}
                onClick={() => setFilter(tab.key)}
              >
                <span>{tab.label}</span>
                <span className="rounded-full bg-white/[0.06] px-1.5 py-0.2 text-[10px] font-mono text-gray-300">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!hashGuardAddress && (
        <p className="mt-6 text-rose-300 text-sm">HashGuard contract address is not configured.</p>
      )}

      {total.isLoading && (
        <div className="mt-8 card text-center py-12 text-gray-400 text-sm">
          <span className="h-4 w-4 inline-block rounded-full bg-emerald-400 animate-ping mr-2" />
          Loading escrows from HSKChain…
        </div>
      )}

      {/* Escrow Cards Grid */}
      <div className="mt-6 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => (
          <EscrowCard key={item.id} id={item.id} escrow={item.escrow} />
        ))}
      </div>

      {/* Empty State */}
      {!total.isLoading && filteredItems.length === 0 && (
        <div className="mt-8 card text-center py-12 sm:py-16 bg-slate-950/40 border border-white/[0.04]">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.02] text-gray-500 border border-white/[0.06]">
            <Icon name="history" className="h-6 w-6" />
          </span>
          <p className="font-bold text-white mt-4 text-base">
            {filter === "all" ? "No protected payments created yet" : `No ${filter} payments found`}
          </p>
          <p className="text-xs text-gray-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
            {filter === "all"
              ? "Create a non-custodial time-locked escrow to protect your crypto transfers on HSKChain."
              : `You do not have any escrows with ${filter} status currently.`}
          </p>
          <Link href="/pay" className="button button-primary mt-5 py-2.5 px-4 text-xs font-bold inline-flex">
            Create Protected Payment
          </Link>
        </div>
      )}
    </main>
  );
}

export default function PaymentsPage() {
  return (
    <AccessGuard>
      <PaymentsContent />
    </AccessGuard>
  );
}
