"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, useDisconnect } from "wagmi";
import { usePathname } from "next/navigation";
import { WalletButton } from "@/components/wallet-button";
import { Icon } from "@/components/icons";
import { hskChain } from "@/lib/chains";
import { shortAddress } from "@/lib/utils";

const navLinks = [
  ["Dashboard", "/dashboard"],
  ["Protected Pay", "/pay"],
  ["Claim", "/claim"],
  ["Batch Pay", "/batch"],
  ["Recurring Payments", "/recurring"],
  ["Payment History", "/payments"],
  ["AI Agent", "/agent"],
] as const;

function getIconForLink(label: string) {
  if (label.includes("Dashboard")) return "user";
  if (label.includes("Protected")) return "shield";
  if (label.includes("Claim")) return "check";
  if (label.includes("Batch")) return "layers";
  if (label.includes("Recurring")) return "history";
  if (label.includes("Payment") || label.includes("History")) return "lock";
  return "spark";
}

/** Gates workspace routes while preserving current context and providing HSK onboarding utilities. */
export function AccessGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const pathname = usePathname();
  const [addStatus, setAddStatus] = useState<string | null>(null);

  if (isConnected) {
    return (
      <div className="flex min-h-screen bg-[#07090e] text-white">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col justify-between border-r border-white/[0.06] bg-slate-950/45 p-6 flex-shrink-0 sticky top-0 h-screen">
          <div className="space-y-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight transition hover:opacity-90">
              <span className="brand-mark">
                <Icon name="shield" className="h-4 w-4" />
              </span>
              <span className="text-base font-extrabold tracking-tight text-white">
                <span className="text-emerald-400">Hash</span>Guard
              </span>
            </Link>

            {/* Nav links */}
            <nav className="flex flex-col space-y-1.5 text-sm font-medium text-gray-400">
              {navLinks.map(([label, href]) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                      active
                        ? "bg-emerald-500/10 text-emerald-400 font-bold border-l-2 border-emerald-400"
                        : "hover:bg-white/[0.03] hover:text-white"
                    }`}
                  >
                    <Icon name={getIconForLink(label) as any} className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom Account details */}
          <div className="border-t border-white/[0.06] pt-4">
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-xs mb-3">
              <p className="text-gray-500 font-semibold uppercase tracking-wider text-[9px]">Connected Wallet</p>
              <p className="font-mono text-gray-300 mt-1 font-bold">{address ? shortAddress(address) : "—"}</p>
            </div>
            <button
              onClick={() => disconnect()}
              className="w-full button button-secondary py-2 text-xs text-rose-400 border-rose-500/20 hover:bg-rose-500/5"
            >
              Disconnect
            </button>
          </div>
        </aside>

        {/* Content Viewport */}
        <div className="flex-grow flex flex-col min-h-screen min-w-0">
          <div className="flex-1 w-full">
            {children}
          </div>
        </div>
      </div>
    );
  }

  async function handleAddHskChain() {
    if (typeof window === "undefined" || !(window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum) {
      setAddStatus("No EVM wallet detected. Please install MetaMask, OKX Wallet, or Rabby.");
      return;
    }

    try {
      setAddStatus("Prompting wallet to activate HSKChain...");
      const ethereum = (window as unknown as { ethereum: { request: (args: unknown) => Promise<unknown> } }).ethereum;
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${hskChain.id.toString(16)}` }],
        });
        setAddStatus(`Switched to ${hskChain.name}! Click Connect Wallet.`);
      } catch (switchErr: unknown) {
        if ((switchErr as any)?.code === 4902 || String(switchErr).includes("4902") || String(switchErr).includes("Unrecognized")) {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${hskChain.id.toString(16)}`,
                chainName: hskChain.name,
                nativeCurrency: hskChain.nativeCurrency,
                rpcUrls: hskChain.rpcUrls.default.http,
                blockExplorerUrls: hskChain.blockExplorers ? [hskChain.blockExplorers.default.url] : undefined,
              },
            ],
          });
          setAddStatus(`${hskChain.name} registered and activated! Click Connect Wallet.`);
        } else {
          throw switchErr;
        }
      }
    } catch (err) {
      setAddStatus(err instanceof Error ? err.message : "Failed to activate network in wallet.");
    }
  }

  return (
    <main className="connection-gate">
      <div className="connection-gate-orb" />
      <section className="connection-card border border-white/[0.06] bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex justify-center">
          <div className="shield-lock flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Icon name="lock" className="h-6 w-6" />
          </div>
        </div>

        <p className="eyebrow mt-6 text-emerald-400">HASHGUARD ACCESS</p>
        <h1 className="text-white">Your protected dashboard is waiting.</h1>
        <p className="text-gray-400">
          Connect your wallet to access secure escrow payments, batch transfers, verified usernames, and the HashGuard AI Agent.
        </p>

        {/* Improved Button Hierarchy */}
        <div className="mt-8 flex flex-col gap-3">
          {/* Primary Action: Full-Width Connect Wallet */}
          <WalletButton className="w-full py-3.5 text-sm font-bold shadow-lg shadow-emerald-500/20 justify-center rounded-xl" />

          {/* Secondary Actions: Equal 2-Column Balance */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleAddHskChain}
              className="button button-secondary py-2.5 px-3 text-xs font-semibold justify-center flex items-center gap-1.5"
              title="Automatically register HSKChain in MetaMask, OKX, or Rabby"
            >
              <Icon name="spark" className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
              <span>Add {hskChain.name}</span>
            </button>
            <Link
              href="/"
              className="button button-secondary py-2.5 px-3 text-xs font-semibold justify-center flex items-center gap-1.5"
            >
              <Icon name="arrow" className="h-3.5 w-3.5 rotate-180 text-gray-400 flex-shrink-0" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>

        {addStatus && (
          <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-300">
            {addStatus}
          </p>
        )}

        {/* Network & Onboarding Details */}
        <div className="mt-8 border-t border-white/[0.06] pt-6 text-left">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="status-dot h-1.5 w-1.5 bg-emerald-400" />
              Target Network: {hskChain.name}
            </span>
            <span className="font-mono text-emerald-400">Chain ID: {hskChain.id}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-400">
            <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
              <p className="text-gray-500 font-semibold uppercase tracking-wider text-[10px]">RPC URL</p>
              <p className="mt-0.5 font-mono text-gray-300 truncate" title={hskChain.rpcUrls.default.http[0]}>
                {hskChain.rpcUrls.default.http[0]}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
              <p className="text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Currency</p>
              <p className="mt-0.5 font-mono text-gray-300">{hskChain.nativeCurrency.symbol} (18 Decimals)</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 text-xs text-gray-400">
            <a
              href="https://bridge.hsk.xyz"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
            >
              HSK Bridge & Faucet <Icon name="arrow" className="h-3 w-3" />
            </a>
            {hskChain.blockExplorers?.default?.url && (
              <a
                href={hskChain.blockExplorers.default.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-gray-400 hover:text-white"
              >
                Explorer <Icon name="link" className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
