"use client";

import { useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect } from "wagmi";
import { hskChain, hskConfigured } from "@/lib/chains";
import { shortAddress } from "@/lib/utils";
import { Icon } from "@/components/icons";

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
  const [showModal, setShowModal] = useState(false);

  const wrongNetwork = isConnected && hskConfigured && chainId !== hskChain.id;

  if (isConnected) {
    return (
      <button
        className={`wallet-control ${className}`}
        title="Disconnect wallet"
        onClick={() => disconnect()}
      >
        <span className={`status-dot ${wrongNetwork ? "status-warning" : ""}`} />
        <span>{wrongNetwork ? "Switch to HSK" : shortAddress(address)}</span>
      </button>
    );
  }

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

      {/* Explicitly Centered Modal Overlay */}
      {showModal && (
        <div className="fixed top-0 left-0 w-full h-full min-h-screen z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute top-0 left-0 w-full h-full bg-black/80 backdrop-blur-md transition-opacity"
            onClick={() => setShowModal(false)}
          />
          
          {/* Modal Container */}
          <div className="relative w-full max-w-md rounded-2xl border border-white/[0.06] bg-slate-950/95 p-8 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 text-center z-10">
            {/* Close Button */}
            <button
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-white/[0.04] hover:text-white transition-colors"
              onClick={() => setShowModal(false)}
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header Content */}
            <div className="flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <Icon name="wallet" className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-extrabold text-white mt-4">
                Connect Wallet
              </h3>
              <p className="text-xs text-gray-400 mt-2 max-w-xs leading-relaxed mx-auto">
                Securely connect your on-chain wallet to interact with HashGuard smart contracts.
              </p>
            </div>

            {/* Connector List */}
            <div className="mt-6 space-y-3">
              {connectors.length === 0 ? (
                <p className="text-sm text-amber-300 bg-amber-500/10 rounded-xl p-3 border border-amber-500/25">
                  No compatible wallet extensions found. Please install MetaMask or Coinbase Wallet.
                </p>
              ) : (
                connectors.map((connector) => {
                  const name = connector.name;
                  const isMetaMask = name.toLowerCase().includes("metamask");
                  const isCoinbase = name.toLowerCase().includes("coinbase");
                  const isRainbow = name.toLowerCase().includes("rainbow");

                  return (
                    <button
                      key={connector.uid}
                      disabled={isPending}
                      className="w-full flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] hover:border-emerald-500/30 p-4 text-left transition-all duration-200 group disabled:opacity-50"
                      onClick={() => {
                        connect({ connector });
                        setShowModal(false);
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
              <p className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
                {connectError.message || "Failed to connect wallet."}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
