"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RecurringForm } from "@/components/recurring-form";
import { AccessGuard } from "@/components/access-guard";

function RecurringContent() {
  const query = useSearchParams();
  return (
    <main className="shell max-w-2xl py-12">
      <RecurringForm
        initial={{
          recipient: query.get("recipient") || undefined,
          amount: query.get("amount") || undefined,
          interval: query.get("interval") || undefined,
          periods: query.get("periods") || undefined,
          token: query.get("token") === "token" ? "token" : "native"
        }}
      />
    </main>
  );
}

export default function RecurringPage() {
  return (
    <AccessGuard>
      <Suspense>
        <RecurringContent />
      </Suspense>
    </AccessGuard>
  );
}
