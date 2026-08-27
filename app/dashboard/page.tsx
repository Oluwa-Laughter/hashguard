"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { formatEther, zeroAddress } from "viem";
import { useAccount, useBalance, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { hskChain, hskConfigured } from "@/lib/chains";
import {
  hashGuardAbi,
  hashGuardAddress,
  scheduledPaymentAddress,
  scheduledPaymentAbi
} from "@/lib/contracts";
import { AccessGuard } from "@/components/access-guard";
import { Icon } from "@/components/icons";
import { shortAddress } from "@/lib/utils";
import { useUserUsername } from "@/lib/username-client";
import type { Escrow } from "@/components/escrow-card";

type ScheduleData = {
  sender: string;
  recipient: string;
  token: string;
  amountPerPeriod: bigint;
  interval: bigint;
  totalPeriods: bigint;
  periodsPaid: bigint;
  nextPaymentTime: bigint;
  status: number;
};

function DashboardContent() {
  const { address } = useAccount();
  const { username } = useUserUsername(address);
  const balance = useBalance({ address, query: { enabled: Boolean(address && hskConfigured) } });
  const [now, setNow] = useState<number>(Math.floor(Date.now() / 1000));

  const { writeContract, data: txHash } = useWriteContract();
  const txReceipt = useWaitForTransactionReceipt({ hash: txHash });

  // Update current timestamp periodically for execution check countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 5000);
    return () => clearInterval(timer);
  }, []);

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

  // Read active schedules for this user
  const schedulesCount = useReadContract({
    address: scheduledPaymentAddress,
    abi: scheduledPaymentAbi,
    functionName: "getSchedulesBySender",
    args: [address ?? zeroAddress],
    query: { enabled: Boolean(scheduledPaymentAddress && address) }
  });

  const scheduleIds = useMemo(() => {
    return (schedulesCount.data || []) as bigint[];
  }, [schedulesCount.data]);

  const scheduleContracts = useMemo(() => {
    return scheduleIds.map(id => ({
      address: scheduledPaymentAddress!,
      abi: scheduledPaymentAbi,
      functionName: "getSchedule" as const,
      args: [id]
    }));
  }, [scheduleIds]);

  const scheduleReads = useReadContracts({
    contracts: scheduleContracts,
    query: { enabled: Boolean(scheduledPaymentAddress && scheduleContracts.length) }
  });

  const userSchedules = useMemo(() => {
    if (!scheduleReads.data) return [];
    return scheduleReads.data
      .map((result, idx) => ({
        id: Number(scheduleIds[idx]),
        schedule: result.result as ScheduleData
      }))
      .filter(item => item.schedule);
  }, [scheduleReads.data, scheduleIds]);

  // Compute metrics
  const stats = useMemo(() => {
    let pending = 0;
    let completed = 0;
    let refundable = 0;

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
  }, [userItems, address, now]);

  const recentActivity = useMemo(() => {
    return [...userItems].reverse().slice(0, 5);
  }, [userItems]);

  const networkName = hskChain.name;

  return (
    <main className="shell py-12 sm:py-16">
      {/* Top Welcome Panel */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-white/[0.06] pb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="status-dot" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Connected</span>
            <span className="text-xs text-gray-500">·</span>
            <span className="text-xs text-gray-400">{networkName}</span>
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Welcome back, {username ? `@${username}` : (address ? shortAddress(address) : "User")}
            </h1>
            {username ? (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-bold text-emerald-300">
                Verified Handle
              </span>
            ) : (
              <Link
                href="/username"
                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-0.5 text-xs font-bold text-cyan-300 transition-colors flex items-center gap-1"
              >
                <Icon name="spark" className="h-3 w-3" />
                Claim @username →
              </Link>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Monitor and execute protected payments and scheduled payments in real-time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-5 py-3 text-right w-full sm:w-auto">
            <p className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">Wallet Balance</p>
            <p className="text-lg font-bold text-white mt-0.5">
              {balance.data ? `${Number(formatEther(balance.data.value)).toFixed(4)} HSK` : "— HSK"}
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Link href="/claim" className="button button-secondary flex-1 sm:flex-none justify-center items-center gap-1.5">
              <Icon name="spark" className="h-4 w-4 text-emerald-400" />
              Claim Payments
            </Link>
            <Link href="/pay" className="button button-primary flex-1 sm:flex-none justify-center">
              <Icon name="shield" className="h-4 w-4" />
              New Payment
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Protected Payments", value: stats.total, icon: "shield", color: "text-emerald-400" },
          { label: "Pending Claims", value: stats.pending, icon: "history", color: "text-amber-400" },
          { label: "Completed Payments", value: stats.completed, icon: "check", color: "text-cyan-400" },
          { label: "Scheduled Payments", value: userSchedules.filter(s => s.schedule.status === 0).length, icon: "layers", color: "text-rose-400" }
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

      {/* Scheduled Payments Section */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Your Scheduled Payments</h2>
          <div className="flex items-center gap-3">
            <Link href="/recurring" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
              Recurring Payments Form →
            </Link>
            <span className="text-gray-600">·</span>
            <Link href="/agent" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300">
              Create via AI
            </Link>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {userSchedules.length === 0 ? (
            <div className="card text-center py-8 col-span-2">
              <p className="text-sm text-gray-500">No scheduled payments created yet.</p>
              <Link href="/agent" className="mt-3 inline-flex text-xs font-semibold text-emerald-400 hover:text-emerald-300">
                Tell the agent: &quot;Send Bob 5 USDC weekly for 4 weeks&quot;
              </Link>
            </div>
          ) : (
            userSchedules.map(({ id, schedule }) => {
              const statusText = schedule.status === 0 ? "Active" : schedule.status === 1 ? "Cancelled" : "Completed";
              const statusColor = schedule.status === 0 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : schedule.status === 1 ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : "text-gray-400 bg-gray-500/10 border-gray-500/20";
              const isDue = schedule.status === 0 && now >= (Number(schedule.nextPaymentTime) + 15) && Number(schedule.periodsPaid) < Number(schedule.totalPeriods);
              const tokenSymbol = schedule.token === zeroAddress ? "HSK" : "USDC";

              return (
                <div key={id} className="card flex flex-col justify-between gap-4 border border-white/[0.05]">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500 uppercase">Schedule #{id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                        {statusText}
                      </span>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-semibold">Recipient</p>
                        <p className="text-white font-bold mt-0.5">{shortAddress(schedule.recipient)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-semibold">Amount / Period</p>
                        <p className="text-white font-bold mt-0.5">
                          {schedule.token === zeroAddress 
                            ? `${Number(formatEther(schedule.amountPerPeriod)).toFixed(2)} HSK`
                            : `${Number(schedule.amountPerPeriod) / 10**6} USDC`}
                        </p>
                      </div>
                      <div className="mt-1">
                        <p className="text-[10px] text-gray-500 uppercase font-semibold">Progress</p>
                        <p className="text-white font-bold mt-0.5">{Number(schedule.periodsPaid)} / {Number(schedule.totalPeriods)} paid</p>
                      </div>
                      <div className="mt-1">
                        <p className="text-[10px] text-gray-500 uppercase font-semibold">Next Release</p>
                        <p className="text-white font-bold mt-0.5">
                          {schedule.status === 0 
                            ? new Date(Number(schedule.nextPaymentTime) * 1000).toLocaleString()
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Timeline Collapsible details list */}
                    <div className="mt-4 border-t border-white/[0.04] pt-3">
                      <details className="group">
                        <summary className="text-[10px] font-bold text-cyan-400 uppercase cursor-pointer select-none list-none flex items-center justify-between hover:text-cyan-300">
                          <span>View Release Timeline</span>
                          <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="mt-2 space-y-1.5 text-xs max-h-32 overflow-y-auto pr-1">
                          {Array.from({ length: Number(schedule.totalPeriods) }).map((_, idx) => {
                            const p = idx + 1;
                            const isPaid = p <= Number(schedule.periodsPaid);
                            
                            // Calculate timestamps dynamically relative to schedule state
                            let releaseTime = 0n;
                            if (isPaid) {
                              releaseTime = schedule.nextPaymentTime - BigInt(Number(schedule.periodsPaid) - p + 1) * schedule.interval;
                            } else {
                              releaseTime = schedule.nextPaymentTime + BigInt(p - Number(schedule.periodsPaid) - 1) * schedule.interval;
                            }
                            
                            const releaseDateStr = new Date(Number(releaseTime) * 1000).toLocaleString();
                            
                            return (
                              <div key={idx} className="flex justify-between items-center py-0.5 border-b border-white/[0.02] last:border-0">
                                <span className={isPaid ? "text-gray-500 line-through" : "text-gray-400 font-semibold"}>
                                  Period #{p} Payout
                                </span>
                                <span className={`font-mono font-semibold ${isPaid ? "text-emerald-400" : "text-white"}`}>
                                  {isPaid ? "Paid ✓" : releaseDateStr}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    </div>
                  </div>

                  <div className="flex gap-2.5 mt-2">
                    {schedule.status === 0 && (
                      <button
                        className="button button-secondary flex-1 py-2 text-xs text-rose-400 border-rose-500/20 hover:bg-rose-500/5"
                        onClick={() => writeContract({
                          address: scheduledPaymentAddress!,
                          abi: scheduledPaymentAbi,
                          functionName: "cancelSchedule",
                          args: [BigInt(id)]
                        })}
                      >
                        Cancel Schedule
                      </button>
                    )}
                    {isDue && (
                      <button
                        className="button button-primary flex-1 py-2 text-xs"
                        onClick={() => writeContract({
                          address: scheduledPaymentAddress!,
                          abi: scheduledPaymentAbi,
                          functionName: "executePayment",
                          args: [BigInt(id)]
                        })}
                      >
                        Execute Due Period
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
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
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Recent Escrows Activity</h2>
          <Link href="/payments" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
            View Payment History →
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
                      <Icon name={isSender ? "arrow" : "shield"} className="h-4 w-4 rotate-[-45deg]" />
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
