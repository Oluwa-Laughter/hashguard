"use client";
import Link from "next/link";
import { formatEther } from "viem";
import { useAccount, useBalance } from "wagmi";
import { hskConfigured } from "@/lib/chains";

export default function Dashboard() {
  const { address } = useAccount(); const balance = useBalance({ address, query: { enabled: Boolean(address && hskConfigured) } });
  return <main className="shell py-10"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-sm font-bold tracking-widest text-emerald-400">DASHBOARD</p><h1 className="mt-2 text-3xl font-bold">Your payment control center</h1></div><Link href="/pay" className="button">Send protected payment</Link></div>
    <div className="mt-8 grid gap-4 md:grid-cols-4">{[["Wallet", address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not connected"], ["HSK balance", balance.data ? `${Number(formatEther(balance.data.value)).toFixed(4)} HSK` : "—"], ["Protected payments", "View activity"], ["Agent", "Ready to prepare"]].map(([label,value]) => <div key={label} className="card"><p className="muted">{label}</p><p className="mt-2 font-semibold">{value}</p></div>)}</div>
    <div className="mt-8 grid gap-4 md:grid-cols-2"><Link href="/username" className="card hover:border-emerald-400/40"><h2 className="font-semibold">Claim your @username</h2><p className="muted mt-2">Make future payments address-free and verifiable on-chain.</p></Link><Link href="/agent" className="card hover:border-emerald-400/40"><h2 className="font-semibold">HashGuard Agent</h2><p className="muted mt-2">Prepare a protected payment using natural language.</p></Link></div>
  </main>;
}

