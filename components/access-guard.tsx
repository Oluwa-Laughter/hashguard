"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { WalletButton } from "@/components/wallet-button";
import { Icon } from "@/components/icons";
import { hskChain } from "@/lib/chains";

/** Gates workspace routes while preserving current context and providing HSK onboarding utilities. */
export function AccessGuard({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const [addStatus, setAddStatus] = useState<string | null>(null);

  if (isConnected) return <>{children}</>;

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
        // Code 4902 indicates chain is not yet registered in wallet
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        <p className="eyebrow mt-6 text-emerald-400">HASHGUARD WORKSPACE</p>
        <h1 className="text-white">Your protected workspace is waiting.</h1>
        <p className="text-gray-400">
          Connect your wallet to access secure escrow payments, batch transfers, verified usernames, and the HashGuard AI Agent.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3.5 sm:flex-row">
          <WalletButton className="w-full sm:w-auto" />
          <button
            type="button"
            onClick={handleAddHskChain}
            className="button button-secondary w-full sm:w-auto text-xs"
            title="Automatically register HSKChain in MetaMask or OKX"
          >
            <Icon name="spark" className="h-3.5 w-3.5 text-emerald-400" />
            Add {hskChain.name}
          </button>
          <Link href="/" className="button button-secondary w-full sm:w-auto">
            Back to Home
          </Link>
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
