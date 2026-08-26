"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { AnimatedShield } from "@/components/animated-shield";
import { Icon, type IconName } from "@/components/icons";
import { ScrollReveal } from "@/components/scroll-reveal";
import { WalletButton } from "@/components/wallet-button";

const features: Array<{ icon: IconName; title: string; text: string; tone: string }> = [
  { icon: "shield", title: "Protected Payments", text: "Lock funds in smart-contract escrow until your recipient claims.", tone: "Escrow guarantee" },
  { icon: "user", title: "Human-Readable Payments", text: "Pay @username instead of copying a 42-character hex address.", tone: "Identity verified" },
  { icon: "layers", title: "Batch Payments", text: "Settle payments to multiple recipients in a single atomic transaction.", tone: "Gas-optimized" },
  { icon: "spark", title: "HashGuard Agent", text: "Describe your payment intent in plain English and sign instantly.", tone: "Intent-based" },
  { icon: "link", title: "Payment Links", text: "Generate secure, shareable web links for quick claims.", tone: "Shareable settlement" },
  { icon: "history", title: "On-Chain Verifiability", text: "Track the status of all escrows transparently in real-time.", tone: "Fully public ledger" }
];

const flow = [
  ["USER", "Send 1 HSK to @alice", "Your intent in natural language."],
  ["HASHGUARD AI", "Intent understood · recipient resolved", "Resolves @alice to 0x742d...8f44 on-chain."],
  ["WALLET", "Confirm transaction", "Your signature authorizes the escrow lock."],
  ["HASHGUARD CONTRACT", "Funds protected", "Tokens enter secure decentralized custody."],
  ["RECIPIENT", "Claim payment", "Settled instantly, or refunded after expiry."]
];

export function LandingPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) {
      router.push("/dashboard");
    }
  }, [isConnected, router]);

  return (
    <main className="relative z-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/[0.04]">
        <div className="hero-grid pointer-events-none absolute inset-0" />
        <div className="hero-glow pointer-events-none absolute -right-32 top-0 h-[680px] w-[680px]" />
        
        <div className="shell grid min-h-[calc(100vh-70px)] items-center gap-10 py-16 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
          <div className="relative z-10 text-left">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-950/20 px-3.5 py-1.5 text-xs font-semibold text-cyan-400">
                <span className="status-dot h-1.5 w-1.5 bg-cyan-400" />
                Built for HSK Chain
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={100}>
              <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.05]">
                Payments, <br />
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">protected</span> by design.
              </h1>
            </ScrollReveal>
            
            <ScrollReveal delay={200}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-400">
                Send crypto with confidence. HashGuard turns payment intent into protected on-chain execution on HSK Chain.
              </p>
            </ScrollReveal>
            
            <ScrollReveal delay={300}>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/dashboard" className="button button-primary">
                  Launch App <Icon name="arrow" className="h-4 w-4" />
                </Link>
                <WalletButton />
                <Link href="#how-it-works" className="button button-secondary">
                  How it works
                </Link>
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={400}>
              <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/[0.06] pt-8 text-sm text-gray-500">
                <span className="flex items-center gap-2.5">
                  <Icon name="shield" className="h-5 w-5 text-emerald-400" />
                  Smart-contract escrow
                </span>
                <span className="flex items-center gap-2.5">
                  <Icon name="spark" className="h-5 w-5 text-cyan-400" />
                  AI-prepared execution
                </span>
              </div>
            </ScrollReveal>
          </div>
          
          <div className="relative flex justify-center lg:justify-end">
            <ScrollReveal delay={200}>
              <AnimatedShield />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Trust & Capability Tags */}
      <section className="border-b border-white/[0.04] bg-white/[0.005]">
        <div className="shell grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Native HSK", "On-chain protection", "shield"],
            ["ERC-20 Support", "Standard tokens", "layers"],
            ["Escrow Lock", "Safe decentralized custody", "lock"],
            ["AI-Assisted", "Intent to signature", "spark"],
            ["Atomic Payments", "Multi-pay or revert", "user"]
          ].map(([title, copy, icon], i) => (
            <ScrollReveal key={title} delay={i * 80} className="flex items-center gap-3.5">
              <span className="rounded-lg bg-white/[0.03] p-2 text-emerald-400">
                <Icon name={icon as any} className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{copy}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Built for HSK Chain Section */}
      <section className="shell section-space" id="hsk">
        <ScrollReveal className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow text-cyan-400">BUILT FOR HSK CHAIN</p>
            <h2 className="section-title">Intelligent payment infrastructure.</h2>
            <p className="mt-5 max-w-xl leading-relaxed text-gray-400">
              HashGuard brings intelligent, programmable payments to HSK Chain. We build custom logic on top of the native chain mechanics to keep your funds safe without taking custody.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["AI Agents", "Natural language input", "spark"],
              ["AI × Web3", "Protected transactions", "user"],
              ["Payments", "Escrow-locked settlement", "shield"]
            ].map(([title, copy, icon]) => (
              <div className="glass-card p-6" key={title}>
                <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Icon name={icon as IconName} className="h-5 w-5" />
                </span>
                <p className="mt-6 font-bold text-white text-base">{title}</p>
                <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{copy}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* Flow Section */}
      <section id="how-it-works" className="border-y border-white/[0.04] bg-slate-950/40">
        <div className="shell section-space">
          <ScrollReveal className="text-center">
            <p className="eyebrow text-emerald-400">FROM INTENT TO SETTLEMENT</p>
            <h2 className="section-title mx-auto">Crypto payments shouldn&apos;t feel irreversible.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-gray-400">
              HashGuard maps out a transparent route for every asset transfer: understand the destination, secure the tokens, and sign to execute.
            </p>
          </ScrollReveal>
          
          <div className="mt-16 grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-1">
              {flow.map(([label, title, copy], index) => (
                <ScrollReveal key={label} delay={index * 80}>
                  <div className="flow-step group">
                    <p className="text-[10px] font-extrabold tracking-widest text-cyan-400 uppercase">{label}</p>
                    <p className="mt-1 font-bold text-white text-base group-hover:text-cyan-300 transition-colors">{title}</p>
                    <p className="mt-1 text-sm text-gray-500">{copy}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
            
            <ScrollReveal delay={150}>
              <div className="glass-card relative overflow-hidden p-8 sm:p-10 border border-emerald-500/10 bg-emerald-950/[0.01]">
                <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-500/[0.04] blur-3xl" />
                <div className="flex items-center justify-between">
                  <p className="eyebrow text-emerald-400">Escrow Security State</p>
                  <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    Live
                  </span>
                </div>
                <div className="mt-8 grid gap-4">
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.03] p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-400">Recipient Address</span>
                      <span className="font-bold text-white text-sm">
                        @alice <Icon name="check" className="ml-1.5 inline h-4 w-4 text-emerald-400" />
                      </span>
                    </div>
                    <div className="mt-4 flex items-end justify-between border-t border-white/[0.04] pt-4">
                      <span className="text-2xl font-black text-white">1.00 HSK</span>
                      <span className="text-xs text-gray-500 font-semibold">Resolved On-chain</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
                      <span className="text-gray-500 font-medium block">Intent</span>
                      <strong className="text-white mt-1 block">Verified</strong>
                    </div>
                    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
                      <span className="text-gray-500 font-medium block">Escrow</span>
                      <strong className="text-emerald-400 mt-1 block">Locked</strong>
                    </div>
                    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
                      <span className="text-gray-500 font-medium block">Refund window</span>
                      <strong className="text-cyan-400 mt-1 block">7 days</strong>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Escrow Mechanism Explainer Section */}
      <section className="shell section-space">
        <ScrollReveal className="text-center">
          <p className="eyebrow text-emerald-400">PROTECTION ARCHITECTURE</p>
          <h2 className="section-title mx-auto">Your payments don&apos;t disappear into the blockchain.</h2>
        </ScrollReveal>
        
        <div className="mt-16 grid gap-6 md:grid-cols-[1fr_auto_1fr] items-center">
          <ScrollReveal>
            <div className="glass-card p-8 h-full">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Step 1: Escrow Lock</span>
              <h3 className="mt-3 text-xl font-bold text-white">You create a protected payment</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">
                Funds leave your wallet and are deposited securely inside the decentralized HashGuard smart contract escrow.
              </p>
            </div>
          </ScrollReveal>
          <div className="hidden items-center justify-center text-emerald-400 md:flex">
            <Icon name="arrow" className="h-8 w-8" />
          </div>
          <ScrollReveal delay={100}>
            <div className="glass-card p-8 h-full">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Step 2: Settlement Control</span>
              <h3 className="mt-3 text-xl font-bold text-white">The contract enforces the rules</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">
                The recipient claims the funds directly. If they remain unclaimed, you can easily refund the transaction after the protection period expires.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="border-t border-white/[0.04] bg-white/[0.005]">
        <div className="shell section-space">
          <ScrollReveal className="text-center">
            <p className="eyebrow text-cyan-400">PAYMENT PRIMITIVES</p>
            <h2 className="section-title mx-auto">Core security capabilities.</h2>
          </ScrollReveal>
          
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <ScrollReveal key={feature.title} delay={index * 50}>
                <article className="glass-card feature-card h-full flex flex-col justify-between">
                  <div>
                    <span className="feature-icon">
                      <Icon name={feature.icon} className="h-5 w-5" />
                    </span>
                    <h3 className="mt-6 text-lg font-bold text-white">{feature.title}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-gray-400">{feature.text}</p>
                  </div>
                  <p className="mt-6 text-xs font-bold text-emerald-400 tracking-wide uppercase">{feature.tone}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Agent Preview Section */}
      <section className="shell section-space" id="agent">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <ScrollReveal>
            <p className="eyebrow text-cyan-400">INTELLIGENT PAYMENTS</p>
            <h2 className="section-title">Meet your payment agent.</h2>
            <p className="mt-5 leading-relaxed text-gray-400">
              Tell HashGuard what you want to achieve. The agent resolves usernames to hex addresses, validates formats, and prepares the transactions. You review and sign from your own wallet.
            </p>
            <Link href="/agent" className="button button-secondary mt-8">
              Explore the Agent <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </ScrollReveal>
          
          <ScrollReveal delay={100}>
            <div className="terminal-window">
              <div className="terminal-top">
                <span className="terminal-dot bg-rose-500/60" />
                <span className="terminal-dot bg-amber-500/60" />
                <span className="terminal-dot bg-emerald-500/60" />
                <span className="ml-3 text-xs text-gray-500 font-semibold">hashguard-agent-console / hsk</span>
              </div>
              <div className="space-y-5 p-6 sm:p-8">
                <div className="chat-user max-w-[85%] text-sm font-semibold">
                  Send 2 HSK to @alice as protected payment for 7 days.
                </div>
                <div className="chat-agent max-w-[90%] border border-emerald-500/20 bg-emerald-950/10">
                  <p className="font-bold text-emerald-400 text-sm">Payment prepared.</p>
                  <div className="mt-4 grid gap-2.5 text-xs text-gray-400">
                    <div className="flex justify-between border-b border-white/[0.04] pb-2">
                      <span>Recipient</span>
                      <span className="font-semibold text-white">@alice <Icon name="check" className="ml-1 inline h-3.5 w-3.5 text-emerald-400" /></span>
                    </div>
                    <div className="flex justify-between border-b border-white/[0.04] pb-2">
                      <span>Resolved Address</span>
                      <span className="font-semibold text-white font-mono">0x742d…8f44 <Icon name="check" className="ml-1 inline h-3.5 w-3.5 text-emerald-400" /></span>
                    </div>
                    <div className="flex justify-between border-b border-white/[0.04] pb-2">
                      <span>Amount</span>
                      <span className="font-bold text-white">2 HSK</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Protection Days</span>
                      <span className="font-semibold text-white">7 days</span>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-white/[0.08] pt-4">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Ready for signing</span>
                    <span className="rounded-xl bg-emerald-500 px-4.5 py-2 text-xs font-extrabold text-emerald-950 shadow-lg shadow-emerald-500/20">
                      Confirm &amp; Sign
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Security Architectural Pillars */}
      <section id="security" className="border-t border-white/[0.04] bg-slate-950/40">
        <div className="shell section-space">
          <ScrollReveal className="text-center">
            <p className="eyebrow text-emerald-400">TRUST MECHANICS</p>
            <h2 className="section-title mx-auto">Your wallet. Your signature. Your funds.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              HashGuard decouples intelligence, authorization, and asset custody for robust Web3 architecture.
            </p>
          </ScrollReveal>
          
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              ["spark", "INTELLIGENT AGENT", "Translates language instructions into transaction payloads."],
              ["user", "USER WALLET", "Confirms and signs payloads to authorize transactions."],
              ["shield", "SMART CONTRACT", "Holds and settles funds autonomously on HSK Chain."]
            ].map(([icon, title, copy], i) => (
              <ScrollReveal key={title} delay={i * 100}>
                <div className="glass-card p-8 text-center flex flex-col items-center">
                  <span className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400 mb-6">
                    <Icon name={icon as any} className="h-6 w-6" />
                  </span>
                  <p className="text-xs font-extrabold tracking-widest text-cyan-400 uppercase">{title}</p>
                  <p className="mt-3 font-semibold text-white text-base leading-relaxed">{copy}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
          
          <ScrollReveal>
            <div className="mt-10 grid gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/5 p-6 text-center text-sm text-gray-300 sm:grid-cols-2">
              <p className="flex items-center justify-center gap-2">
                <Icon name="lock" className="h-4.5 w-4.5 text-emerald-400" />
                HashGuard never requests your private key.
              </p>
              <p className="flex items-center justify-center gap-2">
                <Icon name="shield" className="h-4.5 w-4.5 text-emerald-400" />
                All funds remain in decentralized smart contracts.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="shell section-space">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 via-slate-900 to-cyan-950/20 px-8 py-16 text-center sm:px-16">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-30">
            <AnimatedShield compact />
          </div>
          <div className="relative mx-auto max-w-2xl z-10">
            <p className="eyebrow text-emerald-400">GET STARTED</p>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl leading-tight text-white animate-pulse">
              Stop worrying about where your crypto is going.
            </h2>
            <p className="mt-4 text-gray-400">
              Start sending protected payments on HSK Chain today.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href="/dashboard" className="button button-primary">
                Launch App <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <WalletButton />
              <Link href="/agent" className="button button-secondary">
                Explore the Agent
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] bg-slate-950/60 py-16 text-sm text-gray-500">
        <div className="shell grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <p className="font-extrabold text-white text-base">
              <span className="text-emerald-400">Hash</span>Guard
            </p>
            <p className="mt-3 max-w-xs leading-relaxed text-gray-400">
              Intelligent, protected payments on HSK Chain.
            </p>
            <p className="mt-6 text-xs text-gray-600">
              Built for the HSK Chain ecosystem. All rights reserved.
            </p>
          </div>
          <div>
            <p className="font-bold text-white tracking-wider uppercase text-xs">Explore</p>
            <div className="mt-4 grid gap-2.5">
              <Link href="#how-it-works" className="hover:text-white transition-colors">How it works</Link>
              <Link href="/pay" className="hover:text-white transition-colors">Payments</Link>
              <Link href="/agent" className="hover:text-white transition-colors">Agent</Link>
              <Link href="#security" className="hover:text-white transition-colors">Security Mode</Link>
            </div>
          </div>
          <div>
            <p className="font-bold text-white tracking-wider uppercase text-xs">Network & Tech Stack</p>
            <p className="mt-4 text-gray-400">HSK Chain</p>
            <p className="mt-6 font-bold text-white tracking-wider uppercase text-xs">Built with</p>
            <p className="mt-2 text-gray-600">Solidity · Next.js · wagmi · viem · AI</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
