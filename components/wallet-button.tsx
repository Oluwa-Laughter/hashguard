"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain, type Connector } from "wagmi";
import { hskChain, hskConfigured } from "@/lib/chains";
import { shortAddress } from "@/lib/utils";
import { Icon } from "@/components/icons";

// ============================================================================
// Brand Icons
// ============================================================================

const MetaMaskIcon = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M29.8 4.3l-8.7 7.2-2.1-5.1 10.8-2.1z" fill="#E2761B" />
    <path d="M2.2 4.3l8.7 7.2 2.1-5.1L2.2 4.3z" fill="#E4761B" />
    <path d="M25.3 22.8l-4.2-3.1 3.5-3.5.7 6.6z" fill="#E4761B" />
    <path d="M6.7 22.8l4.2-3.1-3.5-3.5-.7 6.6z" fill="#E4761B" />
    <path d="M19 12.8l2.1-1.3-4.5 1.5 2.4-.2z" fill="#E4761B" />
    <path d="M13 12.8l-2.1-1.3 4.5 1.5-2.4-.2z" fill="#E4761B" />
    <path d="M16 13.5l3.2-4.5h-6.4l3.2 4.5z" fill="#E4761B" />
    <path d="M16 19.5c-1.5 0-2.8-.8-3.5-2l3.5-5.5 3.5 5.5c-.7 1.2-2 2-3.5 2z" fill="#E4761B" />
    <path d="M21.1 11.5l8.7-7.2-3.6 8.7-5.1-1.5z" fill="#D7C1B3" />
    <path d="M10.9 11.5L2.2 4.3l3.6 8.7 5.1-1.5z" fill="#D7C1B3" />
    <path d="M21.1 11.5l5.1 1.5-4.1 3.2-1-4.7z" fill="#FF8F00" />
    <path d="M10.9 11.5l-5.1 1.5 4.1 3.2 1-4.7z" fill="#FF8F00" />
    <path d="M16 19.5l3.5-2 1.6 5.3-5.1-3.3z" fill="#D7C1B3" />
    <path d="M16 19.5l-3.5-2-1.6 5.3 5.1-3.3z" fill="#D7C1B3" />
    <path d="M16 23.5c-2.3 0-4.3-1.1-5.5-2.8l1.6-5.3 3.9 2.5 3.9-2.5 1.6 5.3c-1.2 1.7-3.2 2.8-5.5 2.8z" fill="#FF8F00" />
    <path d="M21.1 16.2l4.2-3.2.7 6.6-4.9-3.4z" fill="#FF8F00" />
    <path d="M10.9 16.2l-4.2-3.2-.7 6.6 4.9-3.4z" fill="#FF8F00" />
  </svg>
);

const PhantomIcon = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="16" fill="#AB9FF2" />
    <path d="M16 8c-4 0-7.5 3-7.5 7v4.5c0 .3.2.5.5.5h14c.3 0 .5-.2.5-.5V15c0-4-3.5-7-7.5-7z" fill="white" />
  </svg>
);

const OkxIcon = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="16" fill="#000000" />
    <path d="M8 8h6v6H8V8zm10 0h6v6h-6V8zm0 10h6v6h-6v-6zm-10 0h6v6H8v-6z" fill="white" />
  </svg>
);

const CoinbaseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="16" fill="#0052FF" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M16 23.5c4.142 0 7.5-3.358 7.5-7.5s-3.358-7.5-7.5-7.5-7.5 3.358-7.5 7.5 3.358 7.5 7.5 7.5zm0-3c2.485 0 4.5-2.015 4.5-4.5s-2.015-4.5-4.5-4.5-4.5 2.015-4.5 4.5 2.015 4.5 4.5 4.5z"
      fill="white"
    />
  </svg>
);

const RabbyIcon = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="16" fill="#7088FA" />
    <path d="M10 10h12v12H10V10z" fill="white" />
  </svg>
);

const TrustWalletIcon = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="16" fill="#0500FF" />
    <path d="M16 7.5s5.5 3 5.5 6.5v5.5c0 2.5-3 5-5.5 6-2.5-1-5.5-3.5-5.5-6V14c0-3.5 5.5-6.5 5.5-6.5z" fill="white" />
  </svg>
);

const GenericWalletIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M12 2v9" />
    <path d="M8 5h8" />
  </svg>
);

function getWalletIcon(id: string, name: string) {
  const key = `${id} ${name}`.toLowerCase();
  if (key.includes("metamask")) return <MetaMaskIcon />;
  if (key.includes("phantom")) return <PhantomIcon />;
  if (key.includes("okx")) return <OkxIcon />;
  if (key.includes("coinbase")) return <CoinbaseIcon />;
  if (key.includes("rabby")) return <RabbyIcon />;
  if (key.includes("trust")) return <TrustWalletIcon />;
  return <GenericWalletIcon />;
}

// Download / install links
const WALLET_DOWNLOADS: Record<string, { name: string; url: string }> = {
  metamask: { name: "MetaMask", url: "https://metamask.io/download/" },
  phantom: { name: "Phantom", url: "https://phantom.app/download" },
  okx: { name: "OKX Wallet", url: "https://www.okx.com/web3" },
  coinbase: { name: "Coinbase Wallet", url: "https://www.coinbase.com/wallet" },
  rabby: { name: "Rabby Wallet", url: "https://rabby.io" },
  trust: { name: "Trust Wallet", url: "https://trustwallet.com/browser-extension" },
};

// ============================================================================
// Types
// ============================================================================

interface DetectedExtension {
  id: string;
  name: string;
  isAvailable: boolean;
  connectorId?: string;
  icon: () => React.ReactNode;
}

interface EIP6963ProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider: any;
}

export function WalletButton({ className = "" }: { className?: string }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [eip6963Providers, setEip6963Providers] = useState<EIP6963ProviderDetail[]>([]);

  // Environment detection
  const isMobile = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
  }, []);

  const isInAppBrowser = useMemo(() => {
    if (typeof window === "undefined") return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Boolean((window as any).ethereum && isMobile);
  }, [isMobile]);

  // Mounted & EIP-6963 listener
  useEffect(() => {
    setMounted(true);

    // Listen for EIP-6963 providers announced by extensions
    const handleAnnounce = (event: Event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customEvent = event as CustomEvent<EIP6963ProviderDetail>;
      if (customEvent.detail && customEvent.detail.info) {
        setEip6963Providers((prev) => {
          if (prev.some((p) => p.info.uuid === customEvent.detail.info.uuid)) return prev;
          return [...prev, customEvent.detail];
        });
      }
    };

    window.addEventListener("eip6963:announceProvider", handleAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    return () => {
      window.removeEventListener("eip6963:announceProvider", handleAnnounce);
    };
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal]);

  // Check which wallets are currently installed and active on machine/browser/phone
  const detectedWallets = useMemo<DetectedExtension[]>(() => {
    if (!mounted || typeof window === "undefined") return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const list: DetectedExtension[] = [];

    // Check MetaMask
    const hasMetaMask = Boolean(win.ethereum?.isMetaMask && !win.ethereum?.isPhantom && !win.ethereum?.isBraveWallet);
    if (hasMetaMask) {
      list.push({ id: "metaMask", name: "MetaMask", isAvailable: true, connectorId: "metaMask", icon: MetaMaskIcon });
    }

    // Check Phantom
    const hasPhantom = Boolean(win.phantom?.ethereum || win.ethereum?.isPhantom);
    if (hasPhantom) {
      list.push({ id: "phantom", name: "Phantom", isAvailable: true, connectorId: "phantom", icon: PhantomIcon });
    }

    // Check OKX Wallet
    const hasOkx = Boolean(win.okxwallet || win.ethereum?.isOkxWallet);
    if (hasOkx) {
      list.push({ id: "okx", name: "OKX Wallet", isAvailable: true, connectorId: "okx", icon: OkxIcon });
    }

    // Check Rabby
    const hasRabby = Boolean(win.rabby || win.ethereum?.isRabby);
    if (hasRabby) {
      list.push({ id: "rabby", name: "Rabby Wallet", isAvailable: true, connectorId: "rabby", icon: RabbyIcon });
    }

    // Check Coinbase Wallet
    const hasCoinbase = Boolean(win.coinbaseWalletExtension || win.ethereum?.isCoinbaseWallet);
    if (hasCoinbase) {
      list.push({ id: "coinbaseWallet", name: "Coinbase Wallet", isAvailable: true, connectorId: "coinbaseWallet", icon: CoinbaseIcon });
    }

    // Check Trust Wallet
    const hasTrust = Boolean(win.trustwallet || win.ethereum?.isTrust);
    if (hasTrust) {
      list.push({ id: "trust", name: "Trust Wallet", isAvailable: true, connectorId: "trust", icon: TrustWalletIcon });
    }

    // Check In-App mobile browser or generic injected
    if (list.length === 0 && Boolean(win.ethereum)) {
      list.push({
        id: "injected",
        name: isInAppBrowser ? "Active Mobile In-App Wallet" : "Browser Injected Wallet",
        isAvailable: true,
        connectorId: "injected",
        icon: GenericWalletIcon,
      });
    }

    return list;
  }, [mounted, isInAppBrowser]);

  // Connect Handler
  const handleConnect = useCallback(
    async (connector: Connector) => {
      setErrorMsg(null);
      setConnectingId(connector.uid);

      try {
        // Awaken browser wallet extension
        if (typeof window !== "undefined") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const eth = (window as any).ethereum;
          if (eth && typeof eth.request === "function") {
            eth.request({ method: "eth_requestAccounts" }).catch(() => {});
          }
        }

        await connectAsync({ connector });
        setShowModal(false);
      } catch (err: unknown) {
        console.warn("Wallet connect attempt:", err);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = (err as any)?.message || String(err);

        if (msg.includes("rejected") || msg.includes("User rejected")) {
          setErrorMsg("Connection request was cancelled in your wallet.");
        } else if (msg.includes("not found") || msg.includes("Connector not found") || msg.includes("target")) {
          setErrorMsg(
            `${connector.name} is not installed on this browser. Click "Get ${connector.name}" below to install.`
          );
        } else {
          setErrorMsg(msg);
        }
      } finally {
        setConnectingId(null);
      }
    },
    [connectAsync]
  );

  // Fast direct browser trigger
  const handleDirectBrowserConnect = useCallback(async () => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eth = (window as any).ethereum;

    if (!eth) {
      setErrorMsg("No Web3 wallet detected on this browser/machine. Please install MetaMask, Phantom, or OKX Wallet.");
      return;
    }

    setErrorMsg(null);
    setConnectingId("direct");

    try {
      await eth.request({ method: "eth_requestAccounts" });
      const fallbackConnector = connectors.find((c) => c.id === "injected") || connectors[0];
      if (fallbackConnector) {
        await connectAsync({ connector: fallbackConnector });
      }
      setShowModal(false);
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.message || String(err);
      if (msg.includes("rejected") || msg.includes("User rejected")) {
        setErrorMsg("Connection request was cancelled in your wallet.");
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setConnectingId(null);
    }
  }, [connectors, connectAsync]);

  // Handle EIP-6963 announced provider connection
  const handleEIP6963Connect = useCallback(
    async (detail: EIP6963ProviderDetail) => {
      setErrorMsg(null);
      setConnectingId(detail.info.uuid);

      try {
        await detail.provider.request({ method: "eth_requestAccounts" });
        const fallbackConnector = connectors.find((c) => c.id === "injected") || connectors[0];
        if (fallbackConnector) {
          await connectAsync({ connector: fallbackConnector });
        }
        setShowModal(false);
      } catch (err: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = (err as any)?.message || String(err);
        setErrorMsg(msg.includes("rejected") ? "Connection cancelled in wallet." : msg);
      } finally {
        setConnectingId(null);
      }
    },
    [connectors, connectAsync]
  );

  // When wallet is connected
  if (isConnected) {
    const wrongNetwork = hskConfigured && chainId !== hskChain.id;

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
          title="Click to disconnect"
          onClick={() => disconnect()}
        >
          <span className={`status-dot ${wrongNetwork ? "status-warning" : "bg-emerald-400"}`} />
          <span className="font-mono text-xs font-semibold">{shortAddress(address)}</span>
        </button>
      </div>
    );
  }

  // Deduplicate connectors by ID
  const displayConnectors = connectors.filter(
    (connector, index, self) => index === self.findIndex((c) => c.id === connector.id)
  );

  return (
    <>
      <button
        className={`button button-primary ${className}`}
        disabled={!hskConfigured}
        onClick={() => {
          setErrorMsg(null);
          setShowModal(true);
        }}
      >
        <Icon name="wallet" className="h-4 w-4" />
        Connect Wallet
      </button>

      {/* Guaranteed Viewport-Centered Modal portaled directly to document.body */}
      {mounted && showModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto min-h-screen">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
            onClick={() => setShowModal(false)}
          />

          {/* Modal Container — Centered, Elevated & Responsive */}
          <div className="relative my-auto w-full max-w-md rounded-3xl border border-white/[0.1] bg-slate-950/98 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 z-10 text-left flex flex-col max-h-[92vh]">
            {/* Close Button */}
            <button
              className="absolute right-5 top-5 rounded-full p-2 bg-white/[0.05] border border-white/[0.08] text-gray-300 hover:text-white hover:bg-white/[0.12] active:scale-95 transition-all z-20"
              onClick={() => setShowModal(false)}
              aria-label="Close modal"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>

            {/* Header Content */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-inner">
                <Icon name="wallet" className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white tracking-tight">Connect Wallet</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Connect to HashGuard on {hskChain.name} (Chain {hskChain.id})
                </p>
              </div>
            </div>

            {/* Connecting State Banner */}
            {connectingId && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 animate-pulse">
                <span className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
                <span>Calling wallet popup… Please approve the connection in your wallet extension.</span>
              </div>
            )}

            {/* Scrollable Connectors Area */}
            <div className="mt-5 overflow-y-auto max-h-[460px] pr-1.5 space-y-4 flex-grow scrollbar-thin">
              {/* SECTION 1: DETECTED WALLETS ON THIS DEVICE */}
              {detectedWallets.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Detected On This {isMobile ? "Device" : "Machine"}
                    </span>
                    <span className="text-[10px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full font-medium">
                      Installed & Ready
                    </span>
                  </div>

                  <div className="space-y-2">
                    {detectedWallets.map((wallet) => {
                      const matchingConnector = connectors.find((c) => c.id === wallet.connectorId) || connectors[0];
                      const isConnecting = connectingId === wallet.id || connectingId === matchingConnector?.uid;

                      return (
                        <button
                          key={wallet.id}
                          disabled={Boolean(connectingId)}
                          onClick={() => {
                            if (wallet.id === "injected") {
                              handleDirectBrowserConnect();
                            } else if (matchingConnector) {
                              handleConnect(matchingConnector);
                            } else {
                              handleDirectBrowserConnect();
                            }
                          }}
                          className="w-full flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 p-3.5 text-left transition-all duration-200 group shadow-lg shadow-emerald-950/20"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/80 border border-emerald-500/20">
                              <wallet.icon />
                            </span>
                            <div>
                              <p className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                                {wallet.name}
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              </p>
                              <p className="text-[10px] text-emerald-300/80">
                                {isConnecting ? "Waiting for wallet approval…" : "Click to connect instantly"}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-lg bg-emerald-400/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300 group-hover:bg-emerald-400/30 transition-all">
                            {isConnecting ? "Connecting…" : "Connect →"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 2: EIP-6963 ANNOUNCED WALLETS */}
              {eip6963Providers.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-2">
                    EIP-6963 Detected Wallets
                  </p>
                  <div className="space-y-2">
                    {eip6963Providers.map((detail) => (
                      <button
                        key={detail.info.uuid}
                        disabled={Boolean(connectingId)}
                        onClick={() => handleEIP6963Connect(detail)}
                        className="w-full flex items-center justify-between rounded-2xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 p-3.5 text-left transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={detail.info.icon}
                            alt={detail.info.name}
                            className="h-8 w-8 rounded-lg object-contain bg-white/5 p-1"
                          />
                          <div>
                            <p className="font-bold text-sm text-white group-hover:text-cyan-300">
                              {detail.info.name}
                            </p>
                            <p className="text-[10px] text-cyan-200/70">Announced by browser extension</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-cyan-400">Connect →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 3: DIRECT BROWSER POPUP TRIGGER */}
              <div>
                <button
                  type="button"
                  disabled={Boolean(connectingId)}
                  onClick={handleDirectBrowserConnect}
                  className="w-full flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-emerald-500/30 p-3.5 text-left transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Icon name="spark" className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                        Direct Browser Extension
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Trigger active extension popup (MetaMask, OKX, Phantom, etc.)
                      </p>
                    </div>
                  </div>
                  <Icon name="arrow" className="h-4 w-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                </button>
              </div>

              {/* SECTION 4: ALL SUPPORTED WALLETS */}
              <div>
                <div className="relative my-3 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/[0.06]" />
                  </div>
                  <span className="relative bg-slate-950 px-3 text-[10px] uppercase font-bold tracking-wider text-gray-500">
                    All Compatible Wallets
                  </span>
                </div>

                <div className="space-y-2">
                  {displayConnectors.map((connector) => {
                    const isConnecting = connectingId === connector.uid;
                    const name = connector.name === "Injected" ? "Default Browser Wallet" : connector.name;
                    const idLower = connector.id.toLowerCase();
                    const downloadInfo = WALLET_DOWNLOADS[idLower];

                    return (
                      <div
                        key={connector.uid}
                        className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] p-3 transition-all"
                      >
                        <button
                          disabled={Boolean(connectingId)}
                          className="flex items-center gap-3 text-left flex-grow mr-2 disabled:opacity-50"
                          onClick={() => handleConnect(connector)}
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.03]">
                            {getWalletIcon(connector.id, connector.name)}
                          </span>
                          <div>
                            <p className="font-bold text-sm text-white hover:text-emerald-400 transition-colors">
                              {name}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {isConnecting ? "Calling wallet…" : "Standard Web3 connection"}
                            </p>
                          </div>
                        </button>

                        <div className="flex items-center gap-2">
                          {isConnecting ? (
                            <span className="text-xs text-emerald-400 font-semibold animate-pulse">Connecting…</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleConnect(connector)}
                              className="rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-300 px-3 py-1 text-xs font-semibold text-gray-300 transition-all"
                            >
                              Connect
                            </button>
                          )}
                          {downloadInfo && (
                            <a
                              href={downloadInfo.url}
                              target="_blank"
                              rel="noreferrer"
                              title={`Install ${downloadInfo.name} extension`}
                              className="rounded-lg p-1.5 text-gray-500 hover:text-white hover:bg-white/[0.05] transition-colors text-[10px]"
                            >
                              <Icon name="link" className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MOBILE APP DEEP LINKS (If on phone) */}
              {isMobile && !isInAppBrowser && (
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4">
                  <p className="text-xs font-bold text-cyan-300">Using a mobile device?</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Open directly in your mobile wallet app browser for instant, seamless signing:
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <a
                      href={`https://metamask.app.link/dapp/${typeof window !== "undefined" ? window.location.host : ""}`}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-center text-xs font-bold text-white hover:bg-white/[0.08] transition"
                    >
                      Open in MetaMask
                    </a>
                    <a
                      href={`https://phantom.app/ul/browse/${typeof window !== "undefined" ? encodeURIComponent(window.location.href) : ""}`}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-center text-xs font-bold text-white hover:bg-white/[0.08] transition"
                    >
                      Open in Phantom
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message Display */}
            {errorMsg && (
              <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/25 p-3.5 text-xs text-rose-300 leading-relaxed flex-shrink-0">
                <p className="font-semibold text-rose-200">{errorMsg}</p>
                <div className="mt-2.5 flex flex-wrap gap-2 pt-2 border-t border-rose-500/20 text-[11px]">
                  <span className="text-gray-400">Need a wallet?</span>
                  <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="underline text-rose-300 hover:text-white">
                    MetaMask
                  </a>
                  <span>·</span>
                  <a href="https://phantom.app/download" target="_blank" rel="noreferrer" className="underline text-rose-300 hover:text-white">
                    Phantom
                  </a>
                  <span>·</span>
                  <a href="https://www.okx.com/web3" target="_blank" rel="noreferrer" className="underline text-rose-300 hover:text-white">
                    OKX Wallet
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
