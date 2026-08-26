import { NextRequest, NextResponse } from "next/server";
import {
  resolveUsername,
  getUsernameByAddress,
  isUsernameAvailable,
  assignUsername,
  normalizeUsername,
  validateUsername,
} from "@/lib/username-service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const address = searchParams.get("address");
  const check = searchParams.get("check");

  // Availability check
  if (check) {
    const clean = normalizeUsername(check);
    const validation = validateUsername(clean);
    if (!validation.valid) {
      return NextResponse.json({ available: false, error: validation.error });
    }
    const available = await isUsernameAvailable(clean);
    return NextResponse.json({ available, username: clean });
  }

  // Reverse lookup: Address -> Username
  if (address) {
    const result = await getUsernameByAddress(address);
    return NextResponse.json(result);
  }

  // Forward lookup: Username -> Address
  if (username) {
    const result = await resolveUsername(username);
    return NextResponse.json(result);
  }

  return NextResponse.json(
    { error: "Provide either ?username=, ?address=, or ?check=" },
    { status: 400 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { username?: string; address?: string };
    const { username, address } = body;

    if (!username || !address) {
      return NextResponse.json(
        { error: "Both username and wallet address are required." },
        { status: 400 }
      );
    }

    const result = await assignUsername(username, address);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/username error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to assign username." },
      { status: 500 }
    );
  }
}
