"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatEther, zeroAddress, type Address } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { erc20Abi, hashGuardAbi, hashGuardAddress } from "@/lib/contracts";
import { hskChain } from "@/lib/chains";
import { shortAddress } from "@/lib/utils";
import { TransactionState } from "@/components/transaction-state";
import { CopyButton } from "@/components/copy-button";
import { ShareModal } from "@/components/share-modal";
import { Icon } from "@/components/icons";
import { formatTokenBalance, isNativeToken } from "@/lib/tokens";

export type Escrow = {
  sender: Address;
  recipient: Address;
  token: Address;
  amount: bigint;
  expiry: bigint;
  status: number;
};

const labels = ["Pending", "Claimed", "Refunded"];

export function EscrowCard({
  id,
  escrow,
  onActionSuccess,
}: {
  id: number;
  escrow: Escrow;
  onActionSuccess?: () => void;
}) {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const [showShareModal, setShowShareModal] = useState(false);

  // Local status state that immediately locks in upon successful transaction
  const [localStatus, setLocalStatus] = useState<number>(escrow.status);

  useEffect(() => {
    setLocalStatus(escrow.status);
  }, [escrow.status]);

  const { writeContract, data: hash, isPending, error: writeError, reset: resetWrite } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash, chainId: hskChain.id });

  const isNative = isNativeToken(escrow.token);

  // Read ERC-20 symbol and decimals if not native
  const symbolQuery = useReadContract({
    address: !isNative ? escrow.token : zeroAddress,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: !isNative && Boolean(escrow.token && escrow.token !== zeroAddress) },
  });

  const decimalsQuery = useReadContract({
    address: !isNative ? escrow.token : zeroAddress,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: !isNative && Boolean(escrow.token && escrow.token !== zeroAddress) },
  });

  const tokenSymbol = isNative ? "HSK" : symbolQuery.data || "TOKEN";
  const tokenDecimals = isNative ? 18 : Number(decimalsQuery.data ?? 18);

  const formattedAmount = isNative
    ? `${Number(formatEther(escrow.amount)).toLocaleString()} HSK`
    : `${formatTokenBalance(escrow.amount, tokenDecimals)} ${tokenSymbol}`;

  const expired = Number(escrow.expiry) <= Math.floor(Date.now() / 1000);

  // Determine permissions based on effective local status
  const canClaim =
    address?.toLowerCase() === escrow.recipient.toLowerCase() &&
    localStatus === 0 &&
    !receipt.isSuccess;

  const canRefund =
    address?.toLowerCase() === escrow.sender.toLowerCase() &&
    localStatus === 0 &&
    expired &&
    !receipt.isSuccess;

  // React immediately upon confirmed transaction
  useEffect(() => {
    if (receipt.isSuccess) {
      if (canClaim) setLocalStatus(1);
      if (canRefund) setLocalStatus(2);

      queryClient.invalidateQueries();
      if (onActionSuccess) onActionSuccess();

      const timer = setTimeout(() => {
        queryClient.invalidateQueries();
        if (onActionSuccess) onActionSuccess();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [receipt.isSuccess, canClaim, canRefund, queryClient, onActionSuccess]);

  function handleClaim() {
    if (!hashGuardAddress) return;
    resetWrite();
    writeContract({
      chainId: hskChain.id,
      address: hashGuardAddress,
      abi: hashGuardAbi,
      functionName: "claim",
      args: [BigInt(id)],
    });
  }

  function handleRefund() {
    if (!hashGuardAddress) return;
    resetWrite();
    writeContract({
      chainId: hskChain.id,
      address: hashGuardAddress,
      abi: hashGuardAbi,
      functionName: "refund",
      args: [BigInt(id)],
    });
  }

  return (
    <>
      <article className="card border border-white/[0.06] bg-slate-950/70 p-5 backdrop-blur-md relative group hover:border-emerald-500/30 transition-all duration-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold tracking-widest text-emerald-400">ESCROW #{id}</p>
              <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
                {tokenSymbol}
              </span>
            </div>
            <p className="mt-2 text-xl font-extrabold text-white font-mono truncate">{formattedAmount}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-gray-400 hover:text-emerald-400 hover:bg-white/[0.06] transition-all"
              title="Share claim link"
              aria-label="Share escrow link"
            >
              <Icon name="share" className="h-3.5 w-3.5" />
            </button>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                localStatus === 0
                  ? "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                  : localStatus === 1
                  ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30"
                  : "bg-gray-400/15 text-gray-300 border border-gray-400/30"
              }`}
            >
              {labels[localStatus] || "Unknown"}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-1.5 text-xs text-gray-400 border-t border-white/[0.04] pt-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">From</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-white">{shortAddress(escrow.sender)}</span>
              <CopyButton text={escrow.sender} iconOnly title="Copy sender address" />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">To</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-white">{shortAddress(escrow.recipient)}</span>
              <CopyButton text={escrow.recipient} iconOnly title="Copy recipient address" />
            </div>
          </div>
          <p className="flex justify-between items-center gap-2">
            <span className="text-gray-500 shrink-0">Expiry</span>
            <span className="font-mono text-white text-right truncate text-[11px] sm:text-xs">
              {new Date(Number(escrow.expiry) * 1000).toLocaleString(undefined, {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
          </p>
        </div>

        <div className="mt-5 flex gap-2">
          <Link href={`/pay/${id}`} className="button button-secondary flex-1 text-xs text-center py-2 px-2 truncate">
            Details
          </Link>

          {/* Claim / Refund Buttons */}
          {localStatus === 1 ? (
            <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-300 text-center flex-1 truncate cursor-default">
              Claimed ✓
            </span>
          ) : localStatus === 2 ? (
            <span className="rounded-xl border border-gray-500/30 bg-gray-500/15 px-3 py-2 text-xs font-bold text-gray-300 text-center flex-1 truncate cursor-default">
              Refunded ✓
            </span>
          ) : canClaim ? (
            <button
              type="button"
              className="button button-primary flex-1 text-xs py-2 px-2 truncate"
              disabled={isPending || receipt.isLoading || receipt.isSuccess}
              onClick={handleClaim}
            >
              {isPending
                ? "Awaiting wallet…"
                : receipt.isLoading
                ? "Claiming on chain…"
                : receipt.isSuccess
                ? "Claimed ✓"
                : "Claim Payment"}
            </button>
          ) : canRefund ? (
            <button
              type="button"
              className="button button-primary flex-1 text-xs py-2 px-2 truncate"
              disabled={isPending || receipt.isLoading || receipt.isSuccess}
              onClick={handleRefund}
            >
              {isPending
                ? "Awaiting wallet…"
                : receipt.isLoading
                ? "Refunding on chain…"
                : receipt.isSuccess
                ? "Refunded ✓"
                : "Refund Escrow"}
            </button>
          ) : null}
        </div>

        <TransactionState
          state={
            hash
              ? receipt.isSuccess
                ? "Confirmed on HSKChain ✓"
                : receipt.isLoading
                ? "Confirming on HSKChain…"
                : "Awaiting confirmation…"
              : undefined
          }
          hash={hash}
        />

        {writeError && (
          <p className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-[11px] text-rose-300">
            {writeError.message.includes("EscrowNotPending")
              ? "This escrow has already been claimed on-chain."
              : writeError.message.includes("User rejected")
              ? "Transaction was canceled in your wallet."
              : writeError.message.slice(0, 120)}
          </p>
        )}
      </article>

      {/* Share Escrow Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        escrowId={id}
        recipient={escrow.recipient}
        amount={formattedAmount.split(" ")[0]}
        tokenSymbol={tokenSymbol}
      />
    </>
  );
}
