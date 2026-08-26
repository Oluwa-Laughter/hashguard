"use client";

import { useMemo } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount, useBalance, useReadContract, useReadContracts } from "wagmi";
import { hskChain, hskConfigured } from "@/lib/chains";
import { hashGuardAbi, hashGuardAddress } from "@/lib/contracts";
import { AccessGuard } from "@/components/access-guard";
import { Icon } from "@/components/icons";
import { shortAddress } from "@/lib/utils";
import type { Escrow } from "@/components/escrow-card";

function DashboardContent() {
  const { address } = useAccount();
  const balance = useBalance({ address, query: { enabled: Boolean(address && hskConfigured) } });

  // Read escrow records for active stats
  const total = useReadContract({
    address: hashGuardAddress,
    abi: hashGuardAbi,
    functionName: "nextEscrowId",
    query: { enabled: Boolean(hashGuardAddress) }
  });

  const count = Math.min(Number(total.data || 0n), 50);
  const contracts = useMemo(() => 
    Array.from({ length: count }, (_, id) => ({
      address: hashGuardAddress!,
      abi: hashGuardAbi,
      functionName: "getEscrow" as const,
      args: [BigInt(id)]
    })),
    [count]
  );

  const escrows = useReadContracts({
    contracts,
    query: { enabled: Boolean(hashGuardAddress && count) }
  });

  const userItems = useMemo(() => {
    if (!address || !escrows.data) return [];
    return escrows.data
      .map((result, id) => ({ id, escrow: result.result as Escrow }))
      .filter(item => item.escrow && (
        item.escrow.sender.toLowerCase() === address.toLowerCase() ||
        item.escrow.recipient.toLowerCase() === address.toLowerCase()
      ));
  }, [escrows.data, address]);

  // Compute metrics
  const stats = useMemo(() => {
    let pending = 0;
    let completed = 0;
    let refundable = 0;
    const now = Math.floor(Date.now() / 1000);

    userItems.forEach(({ escrow }) => {
      if (escrow.status === 0) {
        pending++;
        const expired = Number(escrow.expiry) <= now;
        if (escrow.sender.toLowerCase() === address?.toLowerCase() && expired) {
          refundable++;
        }
      } else {
        completed++;
      }
    });

    return {
      total: userItems.length,
      pending,
      completed,
      refundable
    };
  }, [userItems, address]);

  const recentActivity = useMemo(() => {
    return [...userItems].reverse().slice(0, 5);
  }, [userItems]);

  const networkName = hskChain.name;

  return (
    <main className="shell py-12 sm:py-16">
      {/* Top Welcome Panel */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-white/[0.06] pb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="status-dot" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Connected</span>
            <span className="text-xs text-gray-500">·</span>
            <span className="text-xs text-gray-400">{networkName}</span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Welcome back, {address ? shortAddress(address) : "User"}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Monitor and execute protected payments in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-5 py-3 text-right">
            <p className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">Wallet Balance</p>
            <p className="text-lg font-bold text-white mt-0.5">
              {balance.data ? `${Number(formatEther(balance.data.value)).toFixed(4)} HSK` : "— HSK"}
            </p>
          </div>
          <Link href="/pay" className="button button-primary">
            <Icon name="shield" className="h-4 w-4" />
            New Payment
          </Link>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Protected Payments", value: stats.total, icon: "shield", color: "text-emerald-400" },
          { label: "Pending Claims", value: stats.pending, icon: "history", color: "text-amber-400" },
          { label: "Completed", value: stats.completed, icon: "check", color: "text-cyan-400" },
          { label: "Refundable Escrows", value: stats.refundable, icon: "lock", color: "text-rose-400" }
        ].map(item => (
          <div key={item.label} className="card relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{item.label}</p>
                <p className="mt-3 text-3xl font-bold text-white">{item.value}</p>
              </div>
              <span className={`rounded-xl bg-white/[0.03] p-2 ${item.color}`}>
                <Icon name={item.icon as any} className="h-5 w-5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Panel */}
      <div className="mt-10">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/pay" className="card group flex items-start gap-4 hover:border-emerald-500/40">
            <span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
              <Icon name="shield" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors">Protected Payment</h3>
              <p className="muted mt-1 text-xs leading-relaxed">Lock tokens in safe escrow for specific users or identities.</p>
            </div>
          </Link>
          <Link href="/batch" className="card group flex items-start gap-4 hover:border-cyan-500/40">
            <span className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-400 transition-colors group-hover:bg-cyan-500/20">
              <Icon name="layers" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors">Batch Payment</h3>
              <p className="muted mt-1 text-xs leading-relaxed">Execute atomic token payments to multiple addresses concurrently.</p>
            </div>
          </Link>
          <Link href="/agent" className="card group flex items-start gap-4 hover:border-emerald-500/40">
            <span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
              <Icon name="spark" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors">HashGuard Agent</h3>
              <p className="muted mt-1 text-xs leading-relaxed">Deploy secure transaction scripts via natural language.</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Activity Log */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Recent Activity</h2>
          <Link href="/payments" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
            View All History
          </Link>
        </div>
        <div className="card divide-y divide-white/[0.04] p-0 overflow-hidden">
          {recentActivity.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">No protected payment actions found on this account yet.</p>
              <Link href="/pay" className="mt-3 inline-flex text-xs font-semibold text-emerald-400 hover:text-emerald-300">
                Send your first protected payment
              </Link>
            </div>
          ) : (
            recentActivity.map(({ id, escrow }) => {
              const isSender = escrow.sender.toLowerCase() === address?.toLowerCase();
              const actionLabel = isSender ? "Payment Protected" : "Payment Pending Claim";
              const dateStr = new Date(Number(escrow.expiry) * 1000).toLocaleDateString();
              const amountStr = escrow.token === "0x0000000000000000000000000000000000000000"
                ? `${Number(formatEther(escrow.amount)).toLocaleString()} HSK`
                : `${escrow.amount.toString()} tokens`;
              
              const statusLabels = ["Locked", "Claimed", "Refunded"];
              const statusColors = ["bg-amber-400/15 text-amber-300", "bg-emerald-400/15 text-emerald-300", "bg-gray-500/15 text-gray-400"];

              return (
                <div key={id} className="flex items-center justify-between p-5 hover:bg-white/[0.01] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-xl p-2 bg-white/[0.03] ${isSender ? "text-rose-400" : "text-emerald-400"}`}>
                      <Icon name={isSender ? "arrow" : "shield"} className="h-4.5 w-4.5 rotate-[-45deg]" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white">{actionLabel}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {isSender ? `To: ${shortAddress(escrow.recipient)}` : `From: ${shortAddress(escrow.sender)}`} · Expiry {dateStr}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{amountStr}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[escrow.status]}`}>
                      {statusLabels[escrow.status]}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}

export default function Dashboard() {
  return (
    <AccessGuard>
      <DashboardContent />
    </AccessGuard>
  );
}
