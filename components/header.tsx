"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Icon } from "@/components/icons";
import { WalletButton } from "@/components/wallet-button";

const publicLinks = [
  ["How it works", "/#how-it-works"],
  ["Features", "/#features"],
  ["Security", "/#security"],
  ["AI Agent", "/#agent"]
] as const;

export function Header() {
  const { isConnected } = useAccount();

  return (
    <header className="app-header sticky top-0 z-50 w-full border-b border-white/[0.06] bg-slate-950/70 backdrop-blur-md">
      <div className="shell flex min-h-[70px] items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight transition hover:opacity-90">
          <span className="brand-mark">
            <Icon name="shield" className="h-4 w-4" />
          </span>
          <span className="text-base font-extrabold tracking-tight text-white sm:text-lg">
            <span className="text-emerald-400">Hash</span>Guard
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-gray-400 lg:flex">
          {publicLinks.map(([label, href]) => (
            <Link key={href} href={href} className="transition-colors hover:text-emerald-400">
              {label}
            </Link>
          ))}
        </nav>

        {/* Actions / Wallet Status */}
        <div className="flex items-center gap-4">
          {isConnected && (
            <Link
              className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-2 text-xs font-semibold text-emerald-400 transition-all hover:bg-emerald-500/10 hover:border-emerald-500/40"
              href="/dashboard"
            >
              Workspace
            </Link>
          )}
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
