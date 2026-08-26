"use client";

import { useParams } from "next/navigation";
import { ClaimPortal } from "@/components/claim-portal";
import { AccessGuard } from "@/components/access-guard";

export const dynamic = "force-dynamic";

export default function DirectClaimIdPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const parsedId = Number.isSafeInteger(id) && id >= 0 ? id : undefined;

  return (
    <AccessGuard>
      <main className="shell max-w-4xl py-12">
        <ClaimPortal initialEscrowId={parsedId} />
      </main>
    </AccessGuard>
  );
}
