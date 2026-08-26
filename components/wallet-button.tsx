"use client";

import { useAccount, useChainId, useConnect, useDisconnect } from "wagmi";
import { hskChain, hskConfigured } from "@/lib/chains";
import { shortAddress } from "@/lib/utils";
import { Icon } from "@/components/icons";

export function WalletButton({ className = "" }: { className?: string }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const wrongNetwork = isConnected && hskConfigured && chainId !== hskChain.id;
  if (isConnected) return <button className={`wallet-control ${className}`} title="Disconnect wallet" onClick={() => disconnect()}><span className={`status-dot ${wrongNetwork ? "status-warning" : ""}`} /><span>{wrongNetwork ? "Switch to HSK" : shortAddress(address)}</span></button>;
  return <button className={`button button-primary ${className}`} disabled={!hskConfigured || isPending || !connectors[0]} onClick={() => connect({ connector: connectors[0] })}><Icon name="wallet" className="h-4 w-4" />{isPending ? "Connecting…" : hskConfigured ? "Connect Wallet" : "HSK setup needed"}</button>;
}

