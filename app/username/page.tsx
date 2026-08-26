"use client";

import { useState } from "react";
import { zeroAddress } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { usernameRegistryAbi, usernameRegistryAddress } from "@/lib/contracts";
import { cleanUsername } from "@/lib/utils";
import { TransactionState } from "@/components/transaction-state";
import { AccessGuard } from "@/components/access-guard";

function UsernameContent() {
  const { address, isConnected } = useAccount();
  const [username, setUsername] = useState("");
  const clean = cleanUsername(username);

  const availability = useReadContract({
    address: usernameRegistryAddress ?? zeroAddress,
    abi: usernameRegistryAbi,
    functionName: "isUsernameAvailable",
    args: [clean],
    query: { enabled: clean.length >= 3 && Boolean(usernameRegistryAddress) }
  });

  const current = useReadContract({
    address: usernameRegistryAddress ?? zeroAddress,
    abi: usernameRegistryAbi,
    functionName: "getUsername",
    args: [address ?? zeroAddress],
    query: { enabled: Boolean(address && usernameRegistryAddress) }
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const error = !usernameRegistryAddress
    ? "Username Registry address is not configured."
    : !isConnected
    ? "Connect a wallet to register your username."
    : undefined;

  function register() {
    if (!error && clean.length >= 3) {
      writeContract({
        address: usernameRegistryAddress!,
        abi: usernameRegistryAbi,
        functionName: "registerUsername",
        args: [clean]
      });
    }
  }

  return (
    <main className="shell max-w-2xl py-12">
      <div className="card">
        <p className="text-sm font-bold tracking-widest text-emerald-400">IDENTITY</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Your HashGuard username</h1>
        <p className="muted mt-2">
          Usernames are normalized to lowercase and stored on-chain. Letters, numbers, and underscores only.
        </p>
        {current.data && (
          <p className="mt-5 rounded-xl bg-emerald-400/10 p-4 border border-emerald-400/20 text-sm">
            Your current username: <strong className="text-emerald-300">@{current.data}</strong>
          </p>
        )}
        <label className="label mt-6 block">
          Username
          <input
            className="field"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="alice"
          />
        </label>
        {clean.length >= 3 && usernameRegistryAddress && (
          <p className="mt-2 text-sm">
            {availability.isLoading ? (
              "Checking availability…"
            ) : availability.data ? (
              <span className="text-emerald-400 font-medium">@{clean} is available</span>
            ) : (
              <span className="text-rose-400 font-medium">@{clean} is already registered</span>
            )}
          </p>
        )}
        {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}
        <button
          className="button button-primary mt-6 w-full"
          disabled={Boolean(error) || availability.data === false || isPending || receipt.isLoading || clean.length < 3}
          onClick={register}
        >
          {isPending ? "Awaiting wallet…" : receipt.isLoading ? "Confirming…" : "Register username"}
        </button>
        <TransactionState
          state={hash ? (receipt.isSuccess ? "Username registered ✓" : "Confirming registration…") : undefined}
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
