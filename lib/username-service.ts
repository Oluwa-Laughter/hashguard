import { createClient } from "@supabase/supabase-js";
import { cleanUsername } from "./utils";

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Normalizes username according to HashGuard specifications:
 * - Strips leading '@'
 * - Converts to lowercase
 * - Allowed chars: a-z, 0-9, underscore
 * - Length: 3-32 characters
 */
export function normalizeUsername(raw: string): string {
  return cleanUsername(raw);
}

export function validateUsername(username: string): { valid: boolean; error?: string } {
  const clean = normalizeUsername(username);
  if (!clean || clean.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters long." };
  }
  if (clean.length > 32) {
    return { valid: false, error: "Username cannot exceed 32 characters." };
  }
  if (!/^[a-z0-9_]+$/.test(clean)) {
    return { valid: false, error: "Username can only contain lowercase letters, numbers, and underscores." };
  }
  return { valid: true };
}

/**
 * Resolves a username (e.g. "alice" or "@alice") directly from the database.
 */
export async function resolveUsername(rawUsername: string): Promise<{
  found: boolean;
  address?: string;
  username: string;
  source: "supabase" | "none";
}> {
  const clean = normalizeUsername(rawUsername);
  if (!clean) return { found: false, username: clean, source: "none" };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("wallet_address, username")
        .ilike("username", clean)
        .maybeSingle();

      if (error) {
        console.error("Supabase error querying profiles in resolveUsername:", error.message);
      } else if (data?.wallet_address) {
        return {
          found: true,
          address: data.wallet_address,
          username: data.username,
          source: "supabase",
        };
      }
      return { found: false, username: clean, source: "supabase" };
    } catch (err) {
      console.error("Exception in Supabase resolveUsername:", err);
    }
  }

  return { found: false, username: clean, source: "none" };
}

/**
 * Reverse lookup: Resolves a wallet address to its assigned username from the database.
 */
export async function getUsernameByAddress(walletAddress: string): Promise<{
  found: boolean;
  username?: string;
  address: string;
  source: "supabase" | "none";
}> {
  if (!walletAddress || !walletAddress.startsWith("0x")) {
    return { found: false, address: walletAddress, source: "none" };
  }
  const lowerAddress = walletAddress.toLowerCase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, wallet_address")
        .ilike("wallet_address", lowerAddress)
        .maybeSingle();

      if (error) {
        console.error("Supabase error in getUsernameByAddress:", error.message);
      } else if (data?.username) {
        return {
          found: true,
          username: data.username,
          address: data.wallet_address || walletAddress,
          source: "supabase",
        };
      }
      return { found: false, address: walletAddress, source: "supabase" };
    } catch (err) {
      console.error("Exception in Supabase getUsernameByAddress:", err);
    }
  }

  return { found: false, address: walletAddress, source: "none" };
}

/**
 * Checks if a username is available in the database.
 */
export async function isUsernameAvailable(rawUsername: string): Promise<boolean> {
  const res = await resolveUsername(rawUsername);
  return !res.found;
}

/**
 * Assigns & registers a username to a wallet address directly in the Supabase database.
 */
export async function assignUsername(
  rawUsername: string,
  walletAddress: string
): Promise<{
  success: boolean;
  username?: string;
  address?: string;
  error?: string;
  source: "supabase" | "none";
}> {
  const validation = validateUsername(rawUsername);
  if (!validation.valid) {
    return { success: false, error: validation.error, source: "none" };
  }

  if (!walletAddress || !walletAddress.startsWith("0x") || walletAddress.length !== 42) {
    return { success: false, error: "Invalid EVM wallet address.", source: "none" };
  }

  const clean = normalizeUsername(rawUsername);
  const lowerAddress = walletAddress.toLowerCase();

  // Strict rule: A created username CANNOT be changed or updated!
  const existingForWallet = await getUsernameByAddress(lowerAddress);
  if (existingForWallet.found && existingForWallet.username) {
    if (existingForWallet.username.toLowerCase() !== clean) {
      return {
        success: false,
        error: `This wallet address already has an immutable username (@${existingForWallet.username}) assigned. Usernames on HashGuard cannot be changed or updated.`,
        source: existingForWallet.source,
      };
    }
    return {
      success: true,
      username: clean,
      address: walletAddress,
      source: existingForWallet.source,
    };
  }

  // Check if username is already claimed by another wallet
  const currentResolution = await resolveUsername(clean);
  if (
    currentResolution.found &&
    currentResolution.address &&
    currentResolution.address.toLowerCase() !== lowerAddress
  ) {
    return {
      success: false,
      error: `@${clean} is already claimed by another wallet (${currentResolution.address.slice(0, 6)}...${currentResolution.address.slice(-4)}).`,
      source: "supabase",
    };
  }

  if (supabase) {
    try {
      // Check if username is taken by a different address (case-insensitive)
      const { data: existingUser, error: checkError } = await supabase
        .from("profiles")
        .select("wallet_address, username")
        .ilike("username", clean)
        .maybeSingle();

      if (!checkError && existingUser && existingUser.wallet_address.toLowerCase() !== lowerAddress) {
        return {
          success: false,
          error: `@${clean} is already registered to another wallet address.`,
          source: "supabase",
        };
      }

      // Upsert the profile in Supabase
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            wallet_address: lowerAddress,
            username: clean,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "wallet_address" }
        );

      if (upsertError) {
        console.error("Supabase upsert failed:", upsertError.message);
        return {
          success: false,
          error: `Supabase database error: ${upsertError.message}`,
          source: "supabase",
        };
      }

      return {
        success: true,
        username: clean,
        address: walletAddress,
        source: "supabase",
      };
    } catch (err) {
      console.error("Supabase exception in assignUsername:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to save username to Supabase database.",
        source: "supabase",
      };
    }
  }

  return {
    success: false,
    error: "Supabase database client is not configured.",
    source: "none",
  };
}
