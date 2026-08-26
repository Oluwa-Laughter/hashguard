"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { hskChain } from "@/lib/chains";
import { Icon } from "@/components/icons";
import { WalletButton } from "@/components/wallet-button";

const navLinks = [
  ["Dashboard", "/dashboard"],
  ["Protected Pay", "/pay"],
  ["Batch Pay", "/batch"],
  ["Recurring", "/recurring"],
  ["Payments", "/payments"],
  ["AI Agent", "/agent"],
] as const;

export function Header() {
  const { isConnected } = useAccount();

  return (
    <header className="app-header sticky top-0 z-50 w-full border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-md">
      <div className="shell flex min-h-[70px] items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight transition hover:opacity-90">
            <span className="brand-mark">
              <Icon name="shield" className="h-4 w-4" />
            </span>
            <span className="text-base font-extrabold tracking-tight text-white sm:text-lg">
              <span className="text-emerald-400">Hash</span>Guard
            </span>
          </Link>

          {/* Network Badge */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
            <span className="status-dot h-1.5 w-1.5 bg-emerald-400 animate-pulse" />
            <span>{hskChain.name}</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-400 md:flex">
          {navLinks.map(([label, href]) => (
            <Link key={href} href={href} className="transition-colors hover:text-emerald-400">
              {label}
            </Link>
          ))}
        </nav>

        {/* Actions / Wallet Status */}
        <div className="flex items-center gap-3">
          <Link
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-400"
            href="/dashboard"
          >
            {isConnected ? "Workspace" : "Launch App →"}
          </Link>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
