"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatEther, zeroAddress, type Address } from "viem";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { erc20Abi, hashGuardAbi, hashGuardAddress } from "@/lib/contracts";
import { hskChain } from "@/lib/chains";
import { shortAddress } from "@/lib/utils";
import { formatTokenBalance, isNativeToken } from "@/lib/tokens";
import { Icon } from "@/components/icons";
import { TransactionState } from "@/components/transaction-state";
import { getUsernameByAddressApi, resolveUsernameApi, useUserUsername } from "@/lib/username-client";

export type EscrowItem = {
  id: number;
  sender: Address;
  recipient: Address;
  token: Address;
  amount: bigint;
  expiry: bigint;
  status: number; // 0 = Pending, 1 = Claimed, 2 = Refunded
};

const statusLabels = ["Pending", "Claimed", "Refunded"];

export function ClaimPortal({ initialEscrowId }: { initialEscrowId?: number }) {
  const { address, isConnected } = useAccount();
  const { username: currentUserHandle } = useUserUsername(address);

  // Search & active selection
  const [senderQuery, setSenderQuery] = useState("");
  const [resolvedFilterAddress, setResolvedFilterAddress] = useState<string>();
  const [selectedId, setSelectedId] = useState<number | undefined>(initialEscrowId);
  const [activeTab, setActiveTab] = useState<"claimable" | "all">("claimable");
  const [currentTime, setCurrentTime] = useState<number>(Math.floor(Date.now() / 1000));

  // Keep countdown updated
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Math.floor(Date.now() / 1000)), 5000);
    return () => clearInterval(timer);
  }, []);

  // Update selected if initialEscrowId changes
  useEffect(() => {
    if (initialEscrowId !== undefined) {
      setSelectedId(initialEscrowId);
    }
  }, [initialEscrowId]);

  // Resolve sender query to address
  useEffect(() => {
    const q = senderQuery.trim();
    if (!q) {
      setResolvedFilterAddress(undefined);
      return;
    }
    if (q.startsWith("0x")) {
      setResolvedFilterAddress(q.toLowerCase());
      return;
    }

    let active = true;
    resolveUsernameApi(q).then((res) => {
      if (active) {
        if (res.found && res.address) {
          setResolvedFilterAddress(res.address.toLowerCase());
        } else {
          // Try lookup with prefix fallback
          resolveUsernameApi("@" + q).then((r) => {
            if (active) {
              if (r.found && r.address) {
                setResolvedFilterAddress(r.address.toLowerCase());
              } else {
                setResolvedFilterAddress("not_found");
              }
            }
          });
        }
      }
    });

    return () => {
      active = false;
    };
  }, [senderQuery]);

  // Read nextEscrowId to know how many escrows exist
  const totalEscrowsQuery = useReadContract({
    address: hashGuardAddress,
    abi: hashGuardAbi,
    functionName: "nextEscrowId",
    query: { enabled: Boolean(hashGuardAddress), refetchInterval: 3000 },
  });

  const totalCount = Math.min(Number(totalEscrowsQuery.data || 0n), 100);

  // Batch query all escrows
  const escrowContracts = useMemo(
    () =>
      Array.from({ length: totalCount }, (_, id) => ({
        address: hashGuardAddress!,
        abi: hashGuardAbi,
        functionName: "getEscrow" as const,
        args: [BigInt(id)],
      })),
    [totalCount]
  );

  const escrowsQuery = useReadContracts({
    contracts: escrowContracts,
    query: { enabled: Boolean(hashGuardAddress && totalCount > 0), refetchInterval: 3000 },
  });

  // Parse all incoming escrows for connected wallet
  const allUserEscrows = useMemo<EscrowItem[]>(() => {
    if (!escrowsQuery.data) return [];
    return escrowsQuery.data
      .map((result, id) => {
        if (!result.result) return null;
        const e = result.result as {
          sender: Address;
          recipient: Address;
          token: Address;
          amount: bigint;
          expiry: bigint;
          status: number;
        };
        return {
          id,
          sender: e.sender,
          recipient: e.recipient,
          token: e.token,
          amount: e.amount,
          expiry: e.expiry,
          status: Number(e.status),
        };
      })
      .filter((item): item is EscrowItem => {
        if (!item) return false;
        if (!address) return true; // Show all if not connected
        return item.recipient.toLowerCase() === address.toLowerCase();
      })
      .reverse();
  }, [escrowsQuery.data, address]);

  // Apply filters
  const claimableEscrows = useMemo(() => {
    const active = allUserEscrows.filter((e) => e.status === 0);
    if (!resolvedFilterAddress) return active;
    return active.filter((e) => e.sender.toLowerCase() === resolvedFilterAddress);
  }, [allUserEscrows, resolvedFilterAddress]);

  const filteredAllEscrows = useMemo(() => {
    if (!resolvedFilterAddress) return allUserEscrows;
    return allUserEscrows.filter((e) => e.sender.toLowerCase() === resolvedFilterAddress);
  }, [allUserEscrows, resolvedFilterAddress]);

  const displayedEscrows = activeTab === "claimable" ? claimableEscrows : filteredAllEscrows;

  // Single escrow query for direct search/lookup
  const singleEscrowQuery = useReadContract({
    address: hashGuardAddress,
    abi: hashGuardAbi,
    functionName: "getEscrow",
    args: [BigInt(selectedId !== undefined && selectedId >= 0 ? selectedId : 0)],
    query: { enabled: Boolean(hashGuardAddress && selectedId !== undefined && selectedId >= 0), refetchInterval: 3000 },
  });

  const selectedEscrow = useMemo<EscrowItem | undefined>(() => {
    if (selectedId === undefined || !singleEscrowQuery.data) return undefined;
    const e = singleEscrowQuery.data as {
      sender: Address;
      recipient: Address;
      token: Address;
      amount: bigint;
      expiry: bigint;
      status: number;
    };
    return {
      id: selectedId,
      sender: e.sender,
      recipient: e.recipient,
      token: e.token,
      amount: e.amount,
      expiry: e.expiry,
      status: Number(e.status),
    };
  }, [selectedId, singleEscrowQuery.data]);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Icon name="shield" className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Recipient Claim Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1.5">
            Claim Your Protected Payments
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Funds held in trust on HashGuard. Release incoming payments directly to your wallet.
          </p>
        </div>

        {isConnected && (
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Ready to Claim
              </span>
              <p className="text-lg font-extrabold text-white">
                {claimableEscrows.length} {claimableEscrows.length === 1 ? "Payment" : "Payments"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filter by Sender bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-950/60 p-5 backdrop-blur-xl shadow-lg">
        <label className="label text-xs uppercase font-bold tracking-wider text-gray-300">
          Search Incoming Claims by Sender Username or Wallet Address
        </label>
        <div className="mt-2 flex gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              className="field font-medium text-sm"
              placeholder="e.g. @admin, @alice, or 0x..."
              value={senderQuery}
              onChange={(e) => setSenderQuery(e.target.value)}
            />
          </div>
          {senderQuery !== "" && (
            <button
              type="button"
              className="button button-secondary text-xs"
              onClick={() => {
                setSenderQuery("");
              }}
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* Featured Inspected Escrow Card (If user selected one) */}
      {selectedId !== undefined && (
        <div className="animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Icon name="shield" className="h-4 w-4" />
              Direct Payment View: Escrow #{selectedId}
            </span>
            <button
              type="button"
              className="text-xs text-gray-400 hover:text-white"
              onClick={() => setSelectedId(undefined)}
            >
              Close View
            </button>
          </div>

          {singleEscrowQuery.isLoading ? (
            <div className="card text-center py-10 text-gray-400 animate-pulse">
              Loading escrow #{selectedId} details from HSKChain…
            </div>
          ) : singleEscrowQuery.isError || !selectedEscrow ? (
            <div className="card border-rose-500/25 bg-rose-500/10 text-rose-300 p-6 text-sm">
              <p className="font-bold">Escrow #{selectedId} not found.</p>
              <p className="text-xs text-rose-200/80 mt-1">
                Please check the Escrow ID. It may not exist yet on {hashGuardAddress ? "HashGuard" : "HSKChain"}.
              </p>
            </div>
          ) : (
            <DirectClaimCard
              escrow={selectedEscrow}
              currentUserAddress={address}
              currentUserHandle={currentUserHandle}
              currentTime={currentTime}
              onClaimSuccess={() => {
                totalEscrowsQuery.refetch();
                escrowsQuery.refetch();
                singleEscrowQuery.refetch();
              }}
            />
          )}
        </div>
      )}

      {/* Recipient's Payment Inbox */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.04] pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Your Incoming Payments</h2>
            {isConnected && (
              <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-gray-300 font-mono">
                {displayedEscrows.length}
              </span>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-slate-900/60 p-1">
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === "claimable"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("claimable")}
            >
              Claimable ({claimableEscrows.length})
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === "all"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("all")}
            >
              All Incoming ({filteredAllEscrows.length})
            </button>
          </div>
        </div>

        {/* Not Connected Banner */}
        {!isConnected && (
          <div className="card text-center py-10 bg-slate-950/60 border border-white/[0.06]">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <Icon name="wallet" className="h-6 w-6" />
            </span>
            <h3 className="text-base font-bold text-white mt-4">Connect Wallet to View Payments</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Connect the wallet address or identity linked to your incoming payments to claim funds.
            </p>
          </div>
        )}

        {/* List of Escrows */}
        {isConnected && displayedEscrows.length === 0 ? (
          <div className="card text-center py-12 bg-slate-950/40 border border-white/[0.04]">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.02] text-gray-500 border border-white/[0.06]">
              <Icon name="check" className="h-6 w-6" />
            </span>
            <p className="font-bold text-white mt-4 text-base">
              {activeTab === "claimable" ? "All Caught Up!" : "No Incoming Payments Found"}
            </p>
            <p className="text-xs text-gray-400 mt-1.5 max-w-md mx-auto leading-relaxed">
              {activeTab === "claimable"
                ? "You have no unclaimed escrows waiting. New payments sent to your address or handle will appear here instantly."
                : "No escrows have been created for your wallet address yet. Senders can pay you using your address or @username."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {displayedEscrows.map((item) => (
              <InboxEscrowCard
                key={item.id}
                escrow={item}
                currentUserAddress={address}
                currentTime={currentTime}
                onSelect={() => setSelectedId(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Detailed Claim Card for a specific Escrow (Direct View)
 */
function DirectClaimCard({
  escrow,
  currentUserAddress,
  currentUserHandle,
  currentTime,
  onClaimSuccess,
}: {
  escrow: EscrowItem;
  currentUserAddress?: Address;
  currentUserHandle?: string | null;
  currentTime: number;
  onClaimSuccess?: () => void;
}) {
  const isNative = isNativeToken(escrow.token);

  // Query ERC-20 symbol and decimals if token
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

  // Reverse lookups for sender & recipient usernames
  const [senderHandle, setSenderHandle] = useState<string | null>(null);
  const [recipientHandle, setRecipientHandle] = useState<string | null>(null);

  useEffect(() => {
    getUsernameByAddressApi(escrow.sender).then((res) => {
      if (res.found && res.username) setSenderHandle(res.username);
    });
    getUsernameByAddressApi(escrow.recipient).then((res) => {
      if (res.found && res.username) setRecipientHandle(res.username);
    });
  }, [escrow.sender, escrow.recipient]);

  const queryClient = useQueryClient();
  const [claimedLocally, setClaimedLocally] = useState<boolean>(escrow.status === 1);

  useEffect(() => {
    setClaimedLocally(escrow.status === 1);
  }, [escrow.status]);

  // Transaction execution
  const { writeContract, data: hash, isPending, error: claimError, reset: resetWrite } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash, chainId: hskChain.id });

  // Trigger cache refetch upon successful claim
  useEffect(() => {
    if (receipt.isSuccess) {
      setClaimedLocally(true);
      queryClient.invalidateQueries();
      if (onClaimSuccess) onClaimSuccess();

      const timer = setTimeout(() => {
        queryClient.invalidateQueries();
        if (onClaimSuccess) onClaimSuccess();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [receipt.isSuccess, onClaimSuccess, queryClient]);

  const effectiveStatus = claimedLocally ? 1 : escrow.status;
  const isRecipient =
    currentUserAddress && currentUserAddress.toLowerCase() === escrow.recipient.toLowerCase();
  const isExpired = Number(escrow.expiry) <= currentTime;
  const isPendingStatus = effectiveStatus === 0;

  function handleClaim() {
    if (!hashGuardAddress) return;
    resetWrite();
    writeContract({
      chainId: hskChain.id,
      address: hashGuardAddress,
      abi: hashGuardAbi,
      functionName: "claim",
      args: [BigInt(escrow.id)],
    });
  }

  // Calculate human remaining time
  const remainingSeconds = Number(escrow.expiry) - currentTime;
  const remainingDays = Math.floor(remainingSeconds / 86400);
  const remainingHours = Math.floor((remainingSeconds % 86400) / 3600);

  return (
    <div className="card relative overflow-hidden border border-emerald-500/40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl">
      {/* Decorative Glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400">
              ESCROW #{escrow.id}
            </span>
            <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-xs text-gray-300">
              {tokenSymbol}
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Total Amount to Claim
            </span>
            <p className="text-3xl sm:text-4xl font-extrabold text-white font-mono mt-0.5">
              {formattedAmount}
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <span
          className={`self-start rounded-full px-3.5 py-1 text-xs font-bold flex items-center gap-1.5 ${
            escrow.status === 0
              ? isExpired
                ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
              : escrow.status === 1
              ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
              : "border border-gray-500/30 bg-gray-500/10 text-gray-400"
          }`}
        >
          {escrow.status === 0 ? (
            isExpired ? (
              <>
                <span className="status-dot status-warning" />
                Pending (Expired)
              </>
            ) : (
              <>
                <span className="status-dot h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Ready to Claim
              </>
            )
          ) : (
            statusLabels[escrow.status]
          )}
        </span>
      </div>

      {/* Escrow Parameters Table */}
      <div className="my-6 grid gap-3 text-xs sm:text-sm">
        <div className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 border border-white/[0.04]">
          <span className="text-gray-400">Sender:</span>
          <span className="font-semibold text-white flex items-center gap-2">
            {senderHandle && (
              <span className="text-emerald-400 font-bold">@{senderHandle}</span>
            )}
            <code className="text-xs text-gray-400 font-mono">{shortAddress(escrow.sender)}</code>
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 border border-white/[0.04]">
          <span className="text-gray-400">Designated Recipient:</span>
          <span className="font-semibold text-white flex items-center gap-2">
            {recipientHandle && (
              <span className="text-emerald-400 font-bold">@{recipientHandle}</span>
            )}
            <code className="text-xs text-gray-400 font-mono">
              {shortAddress(escrow.recipient)}
            </code>
            {isRecipient && (
              <span className="rounded bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 font-bold">
                You
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 border border-white/[0.04]">
          <span className="text-gray-400">Protection Window:</span>
          <span className="font-semibold text-white text-right">
            {isExpired ? (
              <span className="text-amber-400">Expired ({new Date(Number(escrow.expiry) * 1000).toLocaleDateString()})</span>
            ) : (
              <span className="text-emerald-300">
                {remainingDays > 0 ? `${remainingDays}d ` : ""}
                {remainingHours}h remaining ({new Date(Number(escrow.expiry) * 1000).toLocaleDateString()})
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Claim Action / Verification Notice */}
      {isPendingStatus && (
        <div className="mt-6 border-t border-white/[0.06] pt-6">
          {!currentUserAddress ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
              <p className="font-bold">Connect your wallet to claim this payment</p>
              <p className="mt-1 text-[11px] text-amber-200/80">
                This escrow can only be claimed by designated recipient{" "}
                <strong className="font-mono">{shortAddress(escrow.recipient)}</strong>.
              </p>
            </div>
          ) : !isRecipient ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
              <p className="font-bold">Wallet Mismatch</p>
              <p className="mt-1 text-[11px] text-rose-200/80">
                Your connected wallet (<code className="font-mono">{shortAddress(currentUserAddress)}</code>) is not
                the designated recipient (<code className="font-mono">{shortAddress(escrow.recipient)}</code>
                {recipientHandle ? ` / @${recipientHandle}` : ""}). Please switch to the correct recipient account in
                your wallet.
              </p>
            </div>
          ) : (
            <div>
              <button
                type="button"
                className="button button-primary w-full py-4 text-base font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01]"
                disabled={isPending || receipt.isLoading || receipt.isSuccess || claimedLocally}
                onClick={handleClaim}
              >
                {isPending
                  ? "Awaiting Wallet Signature…"
                  : receipt.isLoading
                  ? "Claiming on HSKChain…"
                  : receipt.isSuccess || claimedLocally
                  ? "Claimed ✓"
                  : `Claim ${formattedAmount} to Your Wallet`}
              </button>

              <TransactionState
                state={
                  hash
                    ? receipt.isSuccess
                      ? "Claimed & Transferred to Your Wallet ✓"
                      : "Confirming on HSKChain…"
                    : undefined
                }
                hash={hash}
              />

              {claimError && (
                <p className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {claimError.message.includes("EscrowNotPending")
                    ? "This escrow has already been claimed on-chain."
                    : claimError.message.includes("User rejected")
                    ? "Transaction was canceled in your wallet."
                    : claimError.message.slice(0, 140)}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Already Claimed State */}
      {effectiveStatus === 1 && (
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Icon name="check" className="h-4 w-4" />
            </span>
            <div>
              <p className="font-bold text-sm text-white">Payment Successfully Claimed</p>
              <p className="text-[11px] text-emerald-200/80">
                Funds have been successfully released to {shortAddress(escrow.recipient)}.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Escrow Card in the Recipient Inbox
 */
function InboxEscrowCard({
  escrow,
  currentUserAddress,
  currentTime,
  onSelect,
}: {
  escrow: EscrowItem;
  currentUserAddress?: Address;
  currentTime: number;
  onSelect: () => void;
}) {
  const isNative = isNativeToken(escrow.token);
  const tokenSymbol = isNative ? "HSK" : "TOKEN";
  const formattedAmount = isNative
    ? `${Number(formatEther(escrow.amount)).toFixed(4)} HSK`
    : `${Number(formatEther(escrow.amount)).toFixed(2)} ${tokenSymbol}`;

  const [senderHandle, setSenderHandle] = useState<string | null>(null);

  useEffect(() => {
    getUsernameByAddressApi(escrow.sender).then((res) => {
      if (res.found && res.username) setSenderHandle(res.username);
    });
  }, [escrow.sender]);

  const isPending = escrow.status === 0;

  return (
    <div
      onClick={onSelect}
      className={`card cursor-pointer border transition-all duration-200 hover:border-emerald-500/40 hover:bg-slate-900/80 p-5 ${
        isPending
          ? "border-emerald-500/20 bg-slate-950/70"
          : "border-white/[0.04] bg-slate-950/40 opacity-80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-emerald-400">
              #{escrow.id}
            </span>
            <span className="text-xs text-gray-400">
              From: {senderHandle ? <strong className="text-emerald-400">@{senderHandle}</strong> : shortAddress(escrow.sender)}
            </span>
          </div>
          <p className="mt-2 text-xl font-extrabold text-white font-mono">{formattedAmount}</p>
        </div>

        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            isPending
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : escrow.status === 1
              ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
              : "border border-gray-500/30 bg-gray-500/10 text-gray-400"
          }`}
        >
          {isPending ? "Claimable" : statusLabels[escrow.status]}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-3 text-xs text-gray-400">
        <span>Expires: {new Date(Number(escrow.expiry) * 1000).toLocaleDateString()}</span>
        <span className="text-emerald-400 font-semibold flex items-center gap-1 group">
          View & Claim <Icon name="arrow" className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}
