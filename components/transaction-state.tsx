export function TransactionState({ state, hash }: { state?: string; hash?: string }) {
  if (!state) return null;
  return <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
    <strong>{state}</strong>{hash && <span className="ml-2 break-all text-emerald-50/65">{hash}</span>}
  </div>;
}

