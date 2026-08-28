"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { CopyButton } from "@/components/copy-button";
import { shortAddress } from "@/lib/utils";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  escrowId: number;
  recipient: string;
  recipientHandle?: string | null;
  amount: string;
  tokenSymbol: string;
}

export function ShareModal({
  isOpen,
  onClose,
  escrowId,
  recipient,
  recipientHandle,
  amount,
  tokenSymbol,
}: ShareModalProps) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const claimUrl = `${origin}/claim?id=${escrowId}`;
  const paymentUrl = `${origin}/pay/${escrowId}`;
  const recipientDisplay = recipientHandle ? `@${recipientHandle}` : shortAddress(recipient);

  const handleNativeShare = async () => {
    if (navigator?.share) {
      try {
        await navigator.share({
          title: `Claim ${amount} ${tokenSymbol} on HashGuard`,
          text: `You have an incoming protected payment of ${amount} ${tokenSymbol} on HSKChain! Claim it safely:`,
          url: claimUrl,
        });
      } catch {
        // User cancelled
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-slate-950/95 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl z-10 animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 bg-white/[0.05] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.1] transition-all"
          aria-label="Close"
        >
          <Icon name="x" className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Icon name="share" className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Share Protected Payment</h3>
            <p className="text-xs text-gray-400">Send this claim link directly to the recipient</p>
          </div>
        </div>

        {/* Escrow Preview Card */}
        <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-emerald-400">ESCROW #{escrowId}</span>
            <span className="font-mono text-sm font-bold text-white">
              {amount} {tokenSymbol}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            Designated Recipient: <strong className="text-emerald-300 font-semibold">{recipientDisplay}</strong>
          </p>
        </div>

        {/* Claim Link Section */}
        <div className="mt-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1.5">
              Direct Claim Portal Link (for Recipient)
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-slate-900/80 p-2.5">
              <input
                type="text"
                readOnly
                value={claimUrl}
                className="w-full bg-transparent text-xs font-mono text-emerald-300 outline-none truncate"
              />
              <CopyButton text={claimUrl} label="Copy Link" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1.5">
              Payment Details View (Public Overview)
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-slate-900/80 p-2.5">
              <input
                type="text"
                readOnly
                value={paymentUrl}
                className="w-full bg-transparent text-xs font-mono text-gray-300 outline-none truncate"
              />
              <CopyButton text={paymentUrl} label="Copy Link" />
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div className="mt-6 flex gap-3">
          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="button button-primary flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2"
            >
              <Icon name="share" className="h-3.5 w-3.5" />
              <span>Share via Apps</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="button button-secondary flex-1 py-2.5 text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
