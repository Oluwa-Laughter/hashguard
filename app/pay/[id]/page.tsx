"use client";

import { useParams } from "next/navigation";
import { useReadContract } from "wagmi";
import { hashGuardAbi, hashGuardAddress } from "@/lib/contracts";
import { EscrowCard, type Escrow } from "@/components/escrow-card";

export const dynamic = "force-dynamic";

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>(); 
  const id = Number(params.id); 
  const result = useReadContract({ 
    address: hashGuardAddress, 
    abi: hashGuardAbi, 
    functionName: "getEscrow", 
    args: [BigInt(Number.isSafeInteger(id) && id >= 0 ? id : 0)], 
    query: { enabled: Boolean(hashGuardAddress && Number.isSafeInteger(id) && id >= 0) } 
  });
  
  return (
    <main className="shell max-w-xl py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Protected Payment</h1>
        <a href={`/claim?id=${id}`} className="text-xs font-bold text-emerald-400 hover:underline">
          Open Claim Portal →
        </a>
      </div>
      {result.isLoading && <p className="muted">Loading payment…</p>}
      {result.data && (
        <div className="space-y-4">
          <EscrowCard id={id} escrow={result.data as Escrow} />
          <a
            href={`/claim?id=${id}`}
            className="button button-secondary w-full text-center block text-xs font-bold"
          >
            Switch to Recipient Claim Experience →
          </a>
        </div>
      )}
      {result.isError && <p className="text-rose-200">This escrow could not be found.</p>}
    </main>
  );
}
