"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { hskChain, hskConfigured } from "@/lib/chains";
import { shortAddress } from "@/lib/utils";
import { Icon } from "@/components/icons";
import { useUserUsername } from "@/lib/username-client";

// Real-brand SVGs
const MetaMaskIcon = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M29.8 4.3l-8.7 7.2-2.1-5.1 10.8-2.1z" fill="#E2761B"/>
    <path d="M2.2 4.3l8.7 7.2 2.1-5.1L2.2 4.3z" fill="#E4761B"/>
    <path d="M25.3 22.8l-4.2-3.1 3.5-3.5.7 6.6z" fill="#E4761B"/>
    <path d="M6.7 22.8l4.2-3.1-3.5-3.5-.7 6.6z" fill="#E4761B"/>
    <path d="M19 12.8l2.1-1.3-4.5 1.5 2.4-.2z" fill="#E4761B"/>
    <path d="M13 12.8l-2.1-1.3 4.5 1.5-2.4-.2z" fill="#E4761B"/>
    <path d="M16 13.5l3.2-4.5h-6.4l3.2 4.5z" fill="#E4761B"/>
    <path d="M16 19.5c-1.5 0-2.8-.8-3.5-2l3.5-5.5 3.5 5.5c-.7 1.2-2 2-3.5 2z" fill="#E4761B"/>
    <path d="M21.1 11.5l8.7-7.2-3.6 8.7-5.1-1.5z" fill="#D7C1B3"/>
    <path d="M10.9 11.5L2.2 4.3l3.6 8.7 5.1-1.5z" fill="#D7C1B3"/>
    <path d="M21.1 11.5l5.1 1.5-4.1 3.2-1-4.7z" fill="#FF8F00"/>
    <path d="M10.9 11.5l-5.1 1.5 4.1 3.2 1-4.7z" fill="#FF8F00"/>
    <path d="M16 19.5l3.5-2 1.6 5.3-5.1-3.3z" fill="#D7C1B3"/>
    <path d="M16 19.5l-3.5-2-1.6 5.3 5.1-3.3z" fill="#D7C1B3"/>
    <path d="M16 23.5c-2.3 0-4.3-1.1-5.5-2.8l1.6-5.3 3.9 2.5 3.9-2.5 1.6 5.3c-1.2 1.7-3.2 2.8-5.5 2.8z" fill="#FF8F00"/>
    <path d="M21.1 16.2l4.2-3.2.7 6.6-4.9-3.4z" fill="#FF8F00"/>
    <path d="M10.9 16.2l-4.2-3.2-.7 6.6 4.9-3.4z" fill="#FF8F00"/>
  </svg>
);

const CoinbaseIcon = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="16" fill="#0052FF"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M16 23.5c4.142 0 7.5-3.358 7.5-7.5s-3.358-7.5-7.5-7.5-7.5 3.358-7.5 7.5 3.358 7.5 7.5 7.5zm0-3c2.485 0 4.5-2.015 4.5-4.5s-2.015-4.5-4.5-4.5-4.5 2.015-4.5 4.5 2.015 4.5 4.5 4.5z" fill="white"/>
  </svg>
);

const RainbowIcon = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="16" fill="#0E1118"/>
    <path d="M6 16c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="#FF4A4A" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M9 16c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#FFA700" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M12 16c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="#1AE5A1" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M15 16c0-.552.448-1 1-1s1 .448 1 1" stroke="#00A3FF" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const TrustWalletIcon = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="16" fill="#0500FF"/>
    <path d="M16 7.5s5.5 3 5.5 6.5v5.5c0 2.5-3 5-5.5 6-2.5-1-5.5-3.5-5.5-6V14c0-3.5 5.5-6.5 5.5-6.5z" fill="white"/>
  </svg>
);

const PhantomIcon = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="16" fill="#AB9FF2"/>
    <path d="M16 8c-4 0-7.5 3-7.5 7v4.5c0 .3.2.5.5.5h14c.3 0 .5-.2.5-.5V15c0-4-3.5-7-7.5-7z" fill="white"/>
  </svg>
);

const OkxIcon = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="16" fill="#000000"/>
    <path d="M8 8h6v6H8V8zm10 0h6v6h-6V8zm0 10h6v6h-6v-6zm-10 0h6v6H8v-6z" fill="white"/>
  </svg>
);

const RabbyIcon = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="16" fill="#7088FA"/>
    <path d="M10 10h12v12H10V10z" fill="white"/>
  </svg>
);

const GenericWalletIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M12 2v9" />
    <path d="M8 5h8" />
  </svg>
);

export function WalletButton({ className = "" }: { className?: string }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { username } = useUserUsername(address);
  const [showModal, setShowModal] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const wrongNetwork = isConnected && hskConfigured && chainId !== hskChain.id;

  // Set client flag for portal rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auto-close modal when wallet connects
  useEffect(() => {
    if (isConnected) {
      setShowModal(false);
    }
  }, [isConnected]);

  function handleConnect(connector: (typeof connectors)[number]) {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eth = (window as any).ethereum;
      if (eth?.request) {
        eth.request({ method: "eth_requestAccounts" }).catch(() => {});
      }
    }
    connect({ connector });
  }

  const uniqueConnectors = useMemo(() => {
    const filtered = connectors.filter(
      (connector, index, self) =>
        self.findIndex((c) => c.name.toLowerCase() === connector.name.toLowerCase()) === index
    );

    const hasSpecific = filtered.some((c) => c.name.toLowerCase() !== "injected");
    if (hasSpecific) {
      return filtered.filter((c) => c.name.toLowerCase() !== "injected");
    }
    return filtered;
  }, [connectors]);

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        {wrongNetwork && (
          <button
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all flex items-center gap-1.5 shadow-sm"
            title="Click to switch network to HSKChain"
            onClick={() => switchChain({ chainId: hskChain.id })}
          >
            <span className="status-dot status-warning" />
            Switch to {hskChain.name}
          </button>
        )}
        <button
          className={`wallet-control ${className}`}
          title={username ? `@${username} (${shortAddress(address)}) · Click to disconnect` : `${shortAddress(address)} · Click to disconnect`}
          onClick={() => disconnect()}
        >
          <span className={`status-dot ${wrongNetwork ? "status-warning" : "bg-emerald-400"}`} />
          <span className="font-semibold text-xs text-white flex items-center gap-1.5">
            {username ? (
              <>
                <span className="text-emerald-400 font-bold">@{username}</span>
                <span className="text-[10px] text-gray-500 font-mono hidden sm:inline">({shortAddress(address)})</span>
              </>
            ) : (
              <span className="font-mono">{shortAddress(address)}</span>
            )}
          </span>
        </button>
      </div>
    );
  }

  // Define modal markup to render via Portal
  const modalContent = showModal && (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto min-h-screen">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={() => setShowModal(false)}
      />
      
      {/* Modal Container */}
      <div className="relative my-auto w-full max-w-md rounded-2xl border border-white/[0.08] bg-slate-950/98 p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 text-left z-10 flex flex-col max-h-[90vh]">
        {/* Highly Visible Close Button */}
        <button
          className="absolute right-5 top-5 rounded-full p-2 bg-white/[0.05] border border-white/[0.08] text-white hover:bg-white/[0.12] active:scale-95 transition-all z-20 flex items-center justify-center"
          onClick={() => setShowModal(false)}
          aria-label="Close modal"
        >
          <Icon name="x" className="h-4 w-4" />
        </button>

        {/* Header Content */}
        <div className="flex flex-col items-center mt-2 flex-shrink-0 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Icon name="wallet" className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-extrabold text-white mt-4">
            Connect Wallet
          </h3>
          <p className="text-xs text-gray-400 mt-2 max-w-xs leading-relaxed mx-auto">
            Choose your preferred wallet to connect to HashGuard on {hskChain.name}.
          </p>
        </div>

        {/* Connector List (Scrollable Area) */}
        <div className="overflow-y-auto max-h-[340px] pr-1.5 space-y-2.5 scrollbar-thin flex-grow mt-6">
          {uniqueConnectors.length === 0 ? (
            <p className="text-sm text-amber-300 bg-amber-500/10 rounded-xl p-3 border border-amber-500/25">
              No compatible wallet extensions found. Please install MetaMask or Coinbase Wallet.
            </p>
          ) : (
            uniqueConnectors.map((connector) => {
              const name = connector.name;
              const isMetaMask = name.toLowerCase().includes("metamask");
              const isCoinbase = name.toLowerCase().includes("coinbase");
              const isRainbow = name.toLowerCase().includes("rainbow");
              const isTrust = name.toLowerCase().includes("trust");
              const isPhantom = name.toLowerCase().includes("phantom");
              const isOkx = name.toLowerCase().includes("okx");
              const isRabby = name.toLowerCase().includes("rabby");

              return (
                <button
                  key={connector.uid}
                  disabled={isPending}
                  className="w-full flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] hover:border-emerald-500/30 p-4 text-left transition-all duration-200 group disabled:opacity-50"
                  onClick={() => {
                    connect({ connector });
                  }}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.03] transition-colors group-hover:bg-white/[0.06]">
                      {isMetaMask ? (
                        <MetaMaskIcon />
                      ) : isCoinbase ? (
                        <CoinbaseIcon />
                      ) : isRainbow ? (
                        <RainbowIcon />
                      ) : isTrust ? (
                        <TrustWalletIcon />
                      ) : isPhantom ? (
                        <PhantomIcon />
                      ) : isOkx ? (
                        <OkxIcon />
                      ) : isRabby ? (
                        <RabbyIcon />
                      ) : (
                        <GenericWalletIcon />
                      )}
                    </span>
                    <div>
                      <p className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                        {name}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Connect standard Web3 address
                      </p>
                    </div>
                  </div>
                  <Icon name="arrow" className="h-4 w-4 text-gray-600 group-hover:text-emerald-400 transition-colors rotate-[-45deg]" />
                </button>
              );
            })
          )}
        </div>

        {connectError && (
          <p className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300 flex-shrink-0">
            {connectError.message || "Failed to connect wallet."}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        className={`button button-primary ${className}`}
        disabled={!hskConfigured}
        onClick={() => setShowModal(true)}
      >
        <Icon name="wallet" className="h-4 w-4" />
        Connect Wallet
      </button>
      {isClient && typeof document !== "undefined"
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
}
