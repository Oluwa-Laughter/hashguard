"use client";

import { useEffect, useState, useCallback } from "react";
import { cleanUsername } from "./utils";

export interface ResolvedUser {
  found: boolean;
  username?: string;
  address?: string;
  source?: "contract" | "supabase" | "local" | "none";
}

/**
 * Resolves a username (e.g. "@alice") to an address.
 * Queries /api/username (Supabase + local store).
 */
export async function resolveUsernameApi(rawUsername: string): Promise<ResolvedUser> {
  const clean = cleanUsername(rawUsername);
  if (!clean) return { found: false };

  try {
    const res = await fetch(`/api/username?username=${encodeURIComponent(clean)}`);
    if (!res.ok) return { found: false };
    const data = await res.json();
    return data as ResolvedUser;
  } catch (err) {
    console.warn("Failed to resolve username via API:", err);
    return { found: false };
  }
}

/**
 * Reverse lookup: Resolves a wallet address to its assigned username.
 */
export async function getUsernameByAddressApi(address: string): Promise<ResolvedUser> {
  if (!address || !address.startsWith("0x")) return { found: false };

  try {
    const res = await fetch(`/api/username?address=${encodeURIComponent(address)}`);
    if (!res.ok) return { found: false };
    const data = await res.json();
    return data as ResolvedUser;
  } catch (err) {
    console.warn("Failed to get username by address via API:", err);
    return { found: false };
  }
}

/**
 * Checks if a username is available.
 */
export async function checkUsernameAvailableApi(rawUsername: string): Promise<{ available: boolean; error?: string }> {
  const clean = cleanUsername(rawUsername);
  if (!clean || clean.length < 3) return { available: false, error: "Must be at least 3 characters." };

  try {
    const res = await fetch(`/api/username?check=${encodeURIComponent(clean)}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("Failed to check username availability via API:", err);
    return { available: false, error: "Network error checking availability." };
  }
}

/**
 * Assigns a username to a wallet address.
 */
export async function assignUsernameApi(
  rawUsername: string,
  walletAddress: string
): Promise<{ success: boolean; username?: string; address?: string; error?: string }> {
  const clean = cleanUsername(rawUsername);

  try {
    const res = await fetch("/api/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: clean, address: walletAddress }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Failed to assign username." };
    }
    return { success: true, username: data.username, address: data.address };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error assigning username.",
    };
  }
}

/**
 * React Hook: Reads and manages the current user's registered username.
 */
export function useUserUsername(walletAddress?: string) {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUsername = useCallback(async () => {
    if (!walletAddress) {
      setUsername(null);
      return;
    }
    setLoading(true);
    try {
      const res = await getUsernameByAddressApi(walletAddress);
      if (res.found && res.username) {
        setUsername(res.username);
      } else {
        setUsername(null);
      }
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchUsername();
  }, [fetchUsername]);

  return { username, loading, refresh: fetchUsername };
}
