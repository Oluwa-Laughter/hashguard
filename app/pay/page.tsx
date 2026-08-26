"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PaymentForm } from "@/components/payment-form";
import { AccessGuard } from "@/components/access-guard";

function PayContent() {
  const query = useSearchParams();
  return (
    <main className="shell max-w-2xl py-12">
      <PaymentForm
        initial={{
          recipient: query.get("recipient") || undefined,
          amount: query.get("amount") || undefined,
          days: query.get("days") || undefined,
          token: query.get("token") === "token" ? "token" : "native",
          tokenSymbol: query.get("symbol") || undefined,
        }}
      />
    </main>
  );
}

export default function PayPage() {
  return (
    <AccessGuard>
      <Suspense>
        <PayContent />
      </Suspense>
    </AccessGuard>
  );
}
