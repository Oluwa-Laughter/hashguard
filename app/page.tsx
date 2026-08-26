import Link from "next/link";

export default function Home() {
  return <main className="shell py-20"><div className="max-w-3xl"><p className="text-sm font-bold tracking-[0.2em] text-emerald-400">HSK CHAIN · AI × WEB3</p><h1 className="mt-4 text-5xl font-bold tracking-tight sm:text-7xl">Payments with a <span className="text-emerald-400">safety window.</span></h1><p className="mt-6 max-w-2xl text-lg leading-8 text-emerald-50/65">HashGuard turns natural-language payment intent into secure, programmable payments. Your wallet authorizes; the contract protects; the recipient claims.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/pay" className="button">Send protected payment</Link><Link href="/agent" className="button-secondary">Ask HashGuard Agent</Link></div></div>
  <div className="mt-20 grid gap-4 md:grid-cols-3">{[["1. Intent", "Say who, how much, and how long the payment should stay protected."], ["2. Verify", "Resolve the on-chain username and review the transaction before your wallet opens."], ["3. Settle", "The recipient claims, or you refund unclaimed funds after expiry."]].map(([title, text]) => <section key={title} className="card"><p className="font-semibold text-emerald-300">{title}</p><p className="mt-2 text-sm leading-6 text-emerald-50/60">{text}</p></section>)}</div>
  </main>;
}

