"use client";

import Link from "next/link";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { hskConfigured } from "@/lib/chains";

const links = [["Dashboard", "/dashboard"], ["Pay", "/pay"], ["Batch", "/batch"], ["Payments", "/payments"], ["Agent", "/agent"]] as const;
const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export function Header() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  return <header className="border-b border-emerald-100/10 bg-[#07110f]/90"><div className="shell flex min-h-16 items-center justify-between gap-5">
    <Link href="/" className="font-bold tracking-tight"><span className="text-emerald-400">Hash</span>Guard</Link>
    <nav className="hidden gap-4 text-sm text-emerald-50/65 md:flex">{links.map(([label, href]) => <Link key={href} href={href} className="hover:text-emerald-300">{label}</Link>)}</nav>
    {isConnected ? <button className="button-secondary text-sm" onClick={() => disconnect()}>{short(address!)}</button> : <button className="button text-sm" disabled={!hskConfigured || isPending} onClick={() => connect({ connector: connectors[0] })}>{hskConfigured ? "Connect wallet" : "HSK config required"}</button>}
  </div></header>;
}

