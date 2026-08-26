"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RecurringForm } from "@/components/recurring-form";
import { AccessGuard } from "@/components/access-guard";

function RecurringContent() {
  const query = useSearchParams();
  return (
    <main className="shell max-w-2xl py-12">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Automated Scheduled Payments</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Recurring Payments</h1>
        <p className="text-sm text-gray-400 mt-1">
          Set up automated token or stablecoin payment schedules on HSKChain.
        </p>
      </div>
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
