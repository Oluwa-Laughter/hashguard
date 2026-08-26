"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { zeroAddress, type Address } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { usernameRegistryAbi, usernameRegistryAddress } from "@/lib/contracts";
import { cleanUsername, shortAddress } from "@/lib/utils";
import { TransactionState } from "@/components/transaction-state";
import { AccessGuard } from "@/components/access-guard";
import { Icon } from "@/components/icons";
import {
  checkUsernameAvailableApi,
  assignUsernameApi,
  getUsernameByAddressApi,
} from "@/lib/username-client";

function UsernameContent() {
  const { address, isConnected } = useAccount();
  const [usernameInput, setUsernameInput] = useState("");
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    checking: boolean;
    available?: boolean;
    error?: string;
  }>({ checking: false });
  const [assigning, setAssigning] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clean = useMemo(() => cleanUsername(usernameInput), [usernameInput]);

  // Read on-chain username if contract is deployed
  const onChainUsernameQuery = useReadContract({
    address: usernameRegistryAddress ?? zeroAddress,
    abi: usernameRegistryAbi,
    functionName: "getUsername",
    args: [address ?? zeroAddress],
    query: { enabled: Boolean(address && usernameRegistryAddress) },
  });

  // On-chain availability query
  const onChainAvailabilityQuery = useReadContract({
    address: usernameRegistryAddress ?? zeroAddress,
    abi: usernameRegistryAbi,
    functionName: "isUsernameAvailable",
    args: [clean],
    query: { enabled: clean.length >= 3 && Boolean(usernameRegistryAddress) },
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  // Fetch existing assigned username (from Supabase/API or contract)
  useEffect(() => {
    async function loadCurrent() {
      if (!address) {
        setCurrentUsername(null);
        return;
      }
      // Check on-chain first if available
      if (onChainUsernameQuery.data && onChainUsernameQuery.data.length > 0) {
        setCurrentUsername(onChainUsernameQuery.data);
        return;
      }
      // Fallback to API/Supabase store
      const res = await getUsernameByAddressApi(address);
      if (res.found && res.username) {
        setCurrentUsername(res.username);
      }
    }
    loadCurrent();
  }, [address, onChainUsernameQuery.data]);

  // Debounced real-time availability checking
  useEffect(() => {
    if (clean.length < 3) {
      setAvailabilityStatus({ checking: false });
      return;
    }

    setAvailabilityStatus({ checking: true });
    const timer = setTimeout(async () => {
      // Check API / Supabase
      const apiRes = await checkUsernameAvailableApi(clean);
      if (!apiRes.available) {
        setAvailabilityStatus({
          checking: false,
          available: false,
          error: apiRes.error || `@${clean} is already claimed.`,
        });
        return;
      }

      // If contract is configured, also check on-chain
      if (usernameRegistryAddress && onChainAvailabilityQuery.data === false) {
        setAvailabilityStatus({
          checking: false,
          available: false,
          error: `@${clean} is registered on-chain.`,
        });
        return;
      }

      setAvailabilityStatus({ checking: false, available: true });
    }, 300);

    return () => clearTimeout(timer);
  }, [clean, onChainAvailabilityQuery.data]);

  async function handleAssignUsername() {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isConnected || !address) {
      setErrorMsg("Please connect your wallet first.");
      return;
    }

    if (clean.length < 3) {
      setErrorMsg("Username must be at least 3 characters long.");
      return;
    }

    setAssigning(true);

    try {
      // 1. Assign in Supabase / Persistent Store
      const res = await assignUsernameApi(clean, address);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to assign username.");
        setAssigning(false);
        return;
      }

      setCurrentUsername(clean);
      setSuccessMsg(`Successfully assigned @${clean} to your wallet address!`);

      // 2. If UsernameRegistry smart contract is configured on-chain, trigger the on-chain registration as well
      if (usernameRegistryAddress) {
        try {
          writeContract({
            address: usernameRegistryAddress,
            abi: usernameRegistryAbi,
            functionName: "registerUsername",
            args: [clean],
          });
        } catch (onChainErr) {
          console.warn("On-chain registration prompt error:", onChainErr);
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error assigning username.");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <main className="shell max-w-2xl py-12">
      <div className="card">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Icon name="user" className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-bold tracking-widest text-emerald-400 uppercase">
              Decentralized Identity
            </p>
            <h1 className="text-2xl font-extrabold text-white">Assign Wallet Username</h1>
          </div>
        </div>

        <p className="muted mt-3 text-sm leading-relaxed">
          Link a human-readable <strong className="text-emerald-400">@username</strong> to your wallet address (
          <code className="text-xs text-gray-300 font-mono">{address ? shortAddress(address) : "0x..."}</code>
          ). Senders can pay you using your username across all payments, batch transfers, and AI Agent requests!
        </p>

        {/* Current Assigned Username Card */}
        {currentUsername ? (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Your Active HashGuard Handle
                </span>
                <p className="text-2xl font-extrabold text-white mt-1">@{currentUsername}</p>
              </div>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Icon name="check" className="h-3.5 w-3.5" />
                Assigned & Verified
              </span>
            </div>

            <div className="mt-4 border-t border-emerald-500/20 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-200/80">
              <span>Bound to: <strong className="font-mono text-white">{address ? shortAddress(address) : ""}</strong></span>
              <Link
                href={`/pay?recipient=@${currentUsername}`}
                className="underline hover:text-white flex items-center gap-1"
              >
                Test your payment link <Icon name="arrow" className="h-3 w-3" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/[0.06] bg-slate-900/40 p-4 text-xs text-gray-400">
            <p className="font-semibold text-white">No username assigned yet</p>
            <p className="mt-1">
              Claim an identity below so friends, clients, and partners can send you payments without needing your long 0x address.
            </p>
          </div>
        )}

        {/* Input & Form */}
        <div className="mt-6">
          <label className="label">
            {currentUsername ? "Change or Update Username" : "Choose Your Desired Username"}
          </label>
          <div className="relative mt-2">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">@</span>
            <input
              className="field pl-8 font-medium"
              value={usernameInput}
              onChange={(e) => {
                setUsernameInput(e.target.value);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              placeholder="e.g. alice, satoshi, dev_pro"
              maxLength={32}
            />
          </div>

          {/* Availability & Validation Feedback */}
          {clean.length > 0 && (
            <div className="mt-2.5 text-xs">
              {clean.length < 3 ? (
                <span className="text-gray-500">Must be at least 3 characters (letters, numbers, underscore).</span>
              ) : availabilityStatus.checking ? (
                <span className="text-gray-400 animate-pulse flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  Checking availability on HashGuard…
                </span>
              ) : availabilityStatus.available ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Icon name="check" className="h-3.5 w-3.5" />
                  @{clean} is available!
                </span>
              ) : (
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <Icon name="x" className="h-3.5 w-3.5" />
                  {availabilityStatus.error || `@${clean} is already claimed.`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Preview of Resolved Destination */}
        {clean.length >= 3 && availabilityStatus.available && (
          <div className="mt-4 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-xs text-gray-400">
            <span className="font-semibold text-gray-300">Preview Mapping:</span>
            <p className="mt-1 font-mono text-emerald-400">
              @{clean} ➔ {address || "Connect wallet"}
            </p>
          </div>
        )}

        {errorMsg && (
          <p className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3.5 text-xs text-rose-300">
            {errorMsg}
          </p>
        )}

        {successMsg && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
            <p className="font-semibold">{successMsg}</p>
            <p className="mt-1 text-[11px] text-emerald-200/80">
              Your handle is now active for payments, batch distributions, and AI Agent requests.
            </p>
          </div>
        )}

        <button
          className="button button-primary mt-6 w-full"
          disabled={
            !isConnected ||
            clean.length < 3 ||
            availabilityStatus.checking ||
            availabilityStatus.available === false ||
            assigning ||
            isPending ||
            receipt.isLoading
          }
          onClick={handleAssignUsername}
        >
          {assigning
            ? "Assigning username…"
            : isPending
            ? "Awaiting wallet confirmation…"
            : receipt.isLoading
            ? "Confirming on HSKChain…"
            : currentUsername
            ? `Update to @${clean}`
            : `Claim & Assign @${clean || "username"}`}
        </button>

        <TransactionState
          state={
            hash
              ? receipt.isSuccess
                ? "Registered on HSKChain ✓"
                : "Confirming on HSKChain…"
              : undefined
          }
          hash={hash}
        />
      </div>
    </main>
  );
}

export default function UsernamePage() {
  return (
    <AccessGuard>
      <UsernameContent />
    </AccessGuard>
  );
}
