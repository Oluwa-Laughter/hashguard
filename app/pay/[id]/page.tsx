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
      <h1 className="mb-6 text-3xl font-bold">Protected payment</h1>
      {result.isLoading && <p className="muted">Loading payment…</p>}
      {result.data && <EscrowCard id={id} escrow={result.data as Escrow} />}
      {result.isError && <p className="text-rose-200">This escrow could not be found.</p>}
    </main>
  );
}
