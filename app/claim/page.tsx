"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ClaimPortal } from "@/components/claim-portal";
import { AccessGuard } from "@/components/access-guard";

function ClaimContent() {
  const searchParams = useSearchParams();
  const rawId = searchParams.get("id");
  const parsedId = rawId !== null && !isNaN(Number(rawId)) ? Number(rawId) : undefined;

  return (
    <main className="shell max-w-4xl py-12">
      <ClaimPortal initialEscrowId={parsedId} />
    </main>
  );
}

export default function ClaimPage() {
  return (
    <AccessGuard>
      <Suspense
        fallback={
          <main className="shell max-w-4xl py-12">
            <div className="card text-center py-16 text-gray-400">Loading claim portal…</div>
          </main>
        }
      >
        <ClaimContent />
      </Suspense>
    </AccessGuard>
  );
}
