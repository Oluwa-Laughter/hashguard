"use client";

import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { hskChain } from "@/lib/chains";
import { shortAddress } from "@/lib/utils";
import { Icon } from "@/components/icons";

export function WalletButton({ className = "" }: { className?: string }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const wrongNetwork = isConnected && chainId !== hskChain.id;

  if (isConnected && wrongNetwork) {
    return (
      <button
        className={`wallet-control border-amber-500/40 text-amber-300 hover:border-amber-400 ${className}`}
        title={`Switch wallet network to ${hskChain.name} (${hskChain.id})`}
        onClick={() => switchChain?.({ chainId: hskChain.id })}
      >
        <span className="status-dot status-warning" />
        <span>Switch to {hskChain.name}</span>
      </button>
    );
  }

  if (isConnected) {
    return (
      <button
        className={`wallet-control ${className}`}
        title="Click to disconnect wallet"
        onClick={() => disconnect()}
      >
        <span className="status-dot" />
        <span className="font-mono">{shortAddress(address)}</span>
      </button>
    );
  }

  return (
    <button
      className={`button button-primary ${className}`}
      disabled={isPending || !connectors.length}
      onClick={() => connect({ connector: connectors[0] })}
    >
      <Icon name="wallet" className="h-4 w-4" />
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
