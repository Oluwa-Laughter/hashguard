"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { WalletButton } from "@/components/wallet-button";
import { Icon } from "@/components/icons";

/** Gates workspace routes while preserving the current URL for automatic continuation after connection. */
export function AccessGuard({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();

  if (isConnected) return <>{children}</>;

  return (
    <main className="connection-gate">
      <div className="connection-gate-orb" />
      <section className="connection-card border border-white/[0.06] bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex justify-center">
          <div className="shield-lock flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Icon name="lock" className="h-6 w-6" />
          </div>
        </div>
        <p className="eyebrow mt-6">HASHGUARD WORKSPACE</p>
        <h1 className="text-white">Your protected workspace is waiting.</h1>
        <p className="text-gray-400">
          Connect your wallet to access secure escrow payments, batch transactions, verified usernames, and the HashGuard Agent console.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3.5 sm:flex-row">
          <WalletButton className="w-full sm:w-auto" />
          <Link href="/" className="button button-secondary w-full sm:w-auto">
            Back to HashGuard
          </Link>
        </div>
      </section>
    </main>
  );
}
