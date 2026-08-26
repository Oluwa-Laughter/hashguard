"use client";

import Link from "next/link";
import { formatEther, zeroAddress, type Address } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { erc20Abi, hashGuardAbi, hashGuardAddress } from "@/lib/contracts";
import { shortAddress } from "@/lib/utils";
import { TransactionState } from "@/components/transaction-state";
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

export function EscrowCard({ id, escrow }: { id: number; escrow: Escrow }) {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

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
  const canClaim = address?.toLowerCase() === escrow.recipient.toLowerCase() && escrow.status === 0;
  const canRefund = address?.toLowerCase() === escrow.sender.toLowerCase() && escrow.status === 0 && expired;

  const action = canClaim
    ? () => writeContract({ address: hashGuardAddress!, abi: hashGuardAbi, functionName: "claim", args: [BigInt(id)] })
    : canRefund
    ? () => writeContract({ address: hashGuardAddress!, abi: hashGuardAbi, functionName: "refund", args: [BigInt(id)] })
    : undefined;

  return (
    <article className="card border border-white/[0.06] bg-slate-950/70 p-5 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold tracking-widest text-emerald-400">ESCROW #{id}</p>
            <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
              {tokenSymbol}
            </span>
          </div>
          <p className="mt-2 text-xl font-extrabold text-white font-mono">{formattedAmount}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            escrow.status === 0
              ? "bg-amber-400/15 text-amber-300 border border-amber-400/30"
              : escrow.status === 1
              ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30"
              : "bg-gray-400/15 text-gray-300 border border-gray-400/30"
          }`}
        >
          {labels[escrow.status] || "Unknown"}
        </span>
      </div>

      <div className="mt-4 grid gap-1.5 text-xs text-gray-400 border-t border-white/[0.04] pt-3">
        <p className="flex justify-between">
          <span>From</span>
          <span className="font-mono text-white">{shortAddress(escrow.sender)}</span>
        </p>
        <p className="flex justify-between">
          <span>To</span>
          <span className="font-mono text-white">{shortAddress(escrow.recipient)}</span>
        </p>
        <p className="flex justify-between">
          <span>Expiry</span>
          <span className="font-mono text-white">{new Date(Number(escrow.expiry) * 1000).toLocaleString()}</span>
        </p>
      </div>

      <div className="mt-5 flex gap-2.5">
        <Link href={`/pay/${id}`} className="button button-secondary flex-1 text-xs text-center py-2">
          Details
        </Link>
        {action && (
          <button
            className="button button-primary flex-1 text-xs py-2"
            disabled={isPending || receipt.isLoading}
            onClick={action}
          >
            {isPending ? "Awaiting wallet…" : receipt.isLoading ? "Confirming…" : canClaim ? "Claim Payment" : "Refund Escrow"}
          </button>
        )}
      </div>

      <TransactionState
        state={
          hash
            ? receipt.isSuccess
              ? "Confirmed ✓"
              : receipt.isLoading
              ? "Confirming on HSK Chain…"
              : "Awaiting confirmation…"
            : undefined
        }
        hash={hash}
      />
    </article>
  );
}
