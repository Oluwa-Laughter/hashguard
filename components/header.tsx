"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { usePathname } from "next/navigation";
import { hskChain } from "@/lib/chains";
import { Icon } from "@/components/icons";
import { WalletButton } from "@/components/wallet-button";

const workspaceLinks = [
  ["Dashboard", "/dashboard"],
  ["Protected Pay", "/pay"],
  ["Claim", "/claim"],
  ["Batch Pay", "/batch"],
  ["Recurring Payments", "/recurring"],
  ["Payment History", "/payments"],
  ["AI Agent", "/agent"],
] as const;

// Informational anchors for the landing page
const landingLinks = [
  ["How it works", "#how-it-works"],
  ["Security Mode", "#security"],
  ["HSK Chain", "#hsk"],
] as const;

export function Header() {
  const { isConnected } = useAccount();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLanding = pathname === "/";
  const navLinks = isLanding ? landingLinks : workspaceLinks;

  // Close mobile menu on page transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className={`app-header sticky top-0 z-50 w-full border-b border-white/[0.06] bg-slate-950/80 backdrop-blur-md ${isLanding ? "" : "lg:hidden"}`}>
      <div className="shell flex min-h-[70px] items-center justify-between gap-4">
        
        {/* Brand Logo & Network */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight transition hover:opacity-90">
            <span className="brand-mark">
              <Icon name="shield" className="h-4 w-4" />
            </span>
            <span className="text-base font-extrabold tracking-tight text-white sm:text-lg">
              <span className="text-emerald-400">Hash</span>Guard
            </span>
          </Link>

          {/* Network Badge */}
          <div className="hidden xs:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
            <span className="status-dot h-1.5 w-1.5 bg-emerald-400 animate-pulse" />
            <span>{hskChain.name}</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden items-center gap-6 lg:gap-8 text-sm font-medium text-gray-400 lg:flex">
          {navLinks.map(([label, href]) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`transition-colors hover:text-emerald-400 ${active ? "text-emerald-400 font-bold" : ""}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            className="hidden sm:inline-flex rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-400"
            href="/dashboard"
          >
            {isConnected ? "Dashboard" : "Launch App"}
          </Link>
          <WalletButton className="text-xs py-2 px-3 sm:px-4" />
          
          {/* Hamburger Menu Toggle Button */}
          <button
            type="button"
            className="rounded-xl p-2 bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06] lg:hidden flex items-center justify-center transition-all"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-[71px] left-0 w-full border-b border-white/[0.06] bg-slate-950/95 backdrop-blur-xl animate-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col p-5 space-y-4 text-sm font-semibold">
            {navLinks.map(([label, href]) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`py-1 transition-colors hover:text-emerald-400 ${
                    active ? "text-emerald-400 border-l-2 border-emerald-400 pl-3.5" : "text-gray-400 pl-3.5"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            
            {/* Launch App for mobile screen size */}
            <div className="border-t border-white/[0.06] pt-4 flex flex-col gap-2">
              <Link
                className="button button-primary w-full text-center py-2.5 text-xs font-bold"
                href="/dashboard"
              >
                {isConnected ? "Dashboard" : "Launch App"}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
