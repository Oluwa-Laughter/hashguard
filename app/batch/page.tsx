"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BatchForm } from "@/components/batch-form";
import { AccessGuard } from "@/components/access-guard";

function BatchContent() {
  const query = useSearchParams();
  return (
    <main className="shell max-w-3xl py-12">
      <BatchForm
        initial={query.get("payments") || undefined}
        initialSymbol={query.get("symbol") || undefined}
      />
    </main>
  );
}

export default function BatchPage() {
  return (
    <AccessGuard>
      <Suspense>
        <BatchContent />
      </Suspense>
    </AccessGuard>
  );
}
