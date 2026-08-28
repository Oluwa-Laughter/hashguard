"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { hashGuardAbi, hashGuardAddress } from "@/lib/contracts";
import { EscrowCard, type Escrow } from "@/components/escrow-card";
import { AccessGuard } from "@/components/access-guard";
import { Icon } from "@/components/icons";

const PAGE_SIZE = 12;

function PaymentsContent() {
  const { address } = useAccount();
  const [filter, setFilter] = useState<"all" | "pending" | "claimed" | "refunded">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const total = useReadContract({
    address: hashGuardAddress,
    abi: hashGuardAbi,
    functionName: "nextEscrowId",
    query: { enabled: Boolean(hashGuardAddress), refetchInterval: 3000 },
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
    query: { enabled: Boolean(hashGuardAddress && count), refetchInterval: 3000 },
  });

  const allItems = useMemo(() => {
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
  const pendingCount = useMemo(() => allItems.filter((i) => i.escrow.status === 0).length, [allItems]);
  const claimedCount = useMemo(() => allItems.filter((i) => i.escrow.status === 1).length, [allItems]);
  const refundedCount = useMemo(() => allItems.filter((i) => i.escrow.status === 2).length, [allItems]);

  // Filtered view by status tab
  const tabFiltered = useMemo(() => {
    if (filter === "pending") return allItems.filter((i) => i.escrow.status === 0);
    if (filter === "claimed") return allItems.filter((i) => i.escrow.status === 1);
    if (filter === "refunded") return allItems.filter((i) => i.escrow.status === 2);
    return allItems;
  }, [allItems, filter]);

  // Search filter
  const searchFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tabFiltered;

    // Remove leading # if user searches for #3
    const normalizedQ = q.startsWith("#") ? q.slice(1) : q;

    return tabFiltered.filter((item) => {
      const matchId = String(item.id).includes(normalizedQ);
      const matchSender = item.escrow.sender.toLowerCase().includes(q);
      const matchRecipient = item.escrow.recipient.toLowerCase().includes(q);
      return matchId || matchSender || matchRecipient;
    });
  }, [tabFiltered, searchQuery]);

  // Paginated visible slice for scalable rendering
  const paginatedItems = useMemo(() => {
    return searchFiltered.slice(0, visibleCount);
  }, [searchFiltered, visibleCount]);

  const hasMore = visibleCount < searchFiltered.length;

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

      {/* Filter Tabs & Search Bar */}
      <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-slate-900/60 p-1 overflow-x-auto">
          {[
            { key: "all" as const, label: "All", count: allItems.length },
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
                onClick={() => {
                  setFilter(tab.key);
                  setVisibleCount(PAGE_SIZE);
                }}
              >
                <span>{tab.label}</span>
                <span className="rounded-full bg-white/[0.06] px-1.5 py-0.2 text-[10px] font-mono text-gray-300">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by ID (#1) or address…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="w-full rounded-xl border border-white/[0.06] bg-slate-900/80 py-2 pl-9 pr-8 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500/40 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              aria-label="Clear search"
            >
              <Icon name="x" className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {!hashGuardAddress && (
        <p className="mt-6 text-rose-300 text-sm">HashGuard contract address is not configured.</p>
      )}

      {/* Skeleton Loading State */}
      {total.isLoading && (
        <div className="mt-6 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="card border border-white/[0.04] bg-slate-950/40 p-5 animate-pulse">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-3 w-20 rounded bg-white/[0.06]" />
                  <div className="h-6 w-32 rounded bg-white/[0.08]" />
                </div>
                <div className="h-5 w-16 rounded-full bg-white/[0.06]" />
              </div>
              <div className="mt-4 space-y-2 border-t border-white/[0.04] pt-3">
                <div className="h-3 w-full rounded bg-white/[0.04]" />
                <div className="h-3 w-3/4 rounded bg-white/[0.04]" />
              </div>
              <div className="mt-5 flex gap-2">
                <div className="h-8 flex-1 rounded-xl bg-white/[0.04]" />
                <div className="h-8 flex-1 rounded-xl bg-white/[0.06]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Escrow Cards Grid */}
      {!total.isLoading && (
        <div className="mt-6 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {paginatedItems.map((item) => (
            <EscrowCard
              key={item.id}
              id={item.id}
              escrow={item.escrow}
              onActionSuccess={() => {
                total.refetch();
                escrows.refetch();
              }}
            />
          ))}
        </div>
      )}

      {/* Pagination / Load More Button */}
      {hasMore && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="button button-secondary py-2.5 px-6 text-xs font-bold inline-flex items-center gap-2"
          >
            <span>Load More Payments</span>
            <span className="text-gray-500 font-normal">
              ({paginatedItems.length} of {searchFiltered.length})
            </span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!total.isLoading && searchFiltered.length === 0 && (
        <div className="mt-8 card text-center py-12 sm:py-16 bg-slate-950/40 border border-white/[0.04]">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.02] text-gray-500 border border-white/[0.06]">
            <Icon name="history" className="h-6 w-6" />
          </span>
          <p className="font-bold text-white mt-4 text-base">
            {searchQuery
              ? `No escrows match "${searchQuery}"`
              : filter === "all"
              ? "No protected payments created yet"
              : `No ${filter} payments found`}
          </p>
          <p className="text-xs text-gray-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
            {searchQuery
              ? "Try searching by a different escrow ID, token symbol, or address."
              : filter === "all"
              ? "Create a non-custodial time-locked escrow to protect your crypto transfers on HSKChain."
              : `You do not have any escrows with ${filter} status currently.`}
          </p>
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="button button-secondary mt-5 py-2 px-4 text-xs font-bold inline-flex"
            >
              Clear Search Query
            </button>
          ) : (
            <Link href="/pay" className="button button-primary mt-5 py-2.5 px-4 text-xs font-bold inline-flex">
              Create Protected Payment
            </Link>
          )}
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
