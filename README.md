# HashGuard

> **Programmable, Protected Payments on HashKey Chain (HSK).**  
> Non-custodial escrow timelocks, immutable handles, atomic batch payments, automated schedules, and autonomous AI-assisted execution.

---

## Live Deployed & Verified Contracts (HSKChain Testnet - Chain ID 133)

All HashGuard core smart contracts are deployed on **HSKChain Testnet** and verified with open-source bytecode on the **Blockscout Explorer**:

| Contract Name | Deployed Address | Verification Status | Explorer Link |
| :--- | :--- | :--- | :--- |
| **`HashGuard`** | `0xd10A0fEc90775204AA9f0af7b99f89f6a6Eb97e5` | **Pass - Verified** | [Inspect `HashGuard` on HSK Explorer](https://testnet-explorer.hskchain.net/address/0xd10a0fec90775204aa9f0af7b99f89f6a6eb97e5#code) |
| **`UsernameRegistry`** | `0xB7A020081950c5a146006E2611D6EF0E6f7f1140` | **Pass - Verified** | [Inspect `UsernameRegistry` on HSK Explorer](https://testnet-explorer.hskchain.net/address/0xb7a020081950c5a146006e2611d6ef0e6f7f1140#code) |
| **`ScheduledPayment`** | `0xA93552100B7Ce71D76606145313D5Fd4DA117eFB` | **Pass - Verified** | [Inspect `ScheduledPayment` on HSK Explorer](https://testnet-explorer.hskchain.net/address/0xa93552100b7ce71d76606145313d5fd4da117efb#code) |

---

## Executive Overview

HashGuard eliminates the risk of lost crypto transfers, wrong addresses, and counterparty defaults. By coupling **time-locked smart contract escrows** with **human-readable usernames** and an **autonomous AI payment agent**, HashGuard turns loose payment intent into protected, verifiable on-chain execution.

### The Core Security Boundary

```text
User Intent → Mistral AI Structured Action → User Wallet Signature → HashGuard Smart Contract → HSKChain Settlement
```

1. **The AI Agent** only interprets natural language and structures typed calldata payloads. It never holds private keys, cannot sign transactions, and has zero custody over user capital.
2. **The User Wallet** (MetaMask, OKX, Phantom, Rabby) is the sole cryptographic authorizer.
3. **The Smart Contracts** enforce mathematical custody, timelock rules, recipient authorization, and sender refund guarantees on HSKChain.

---

## Key Features

### 1. Protected Escrow Payments (`/pay`)
- **Non-Custodial Time-Locks**: Deposit native HSK or any ERC-20 token into an escrow locked until the named recipient claims.
- **Fail-Safe Sender Refunds**: Senders define a custom protection period (e.g. 1 day, 7 days, 30 days). If the recipient leaves funds unclaimed past the expiration timestamp, the sender can trigger an immediate 100% refund.
- **Explicit Two-Step ERC-20 Protection**: For token escrows, users explicitly approve the exact allowance before executing `createTokenEscrow`.

### 2. Recipient Claim Portal (`/claim` & `/claim/[id]`)
- **Recipient Inbox**: Connected wallets automatically view incoming escrows awaiting their claim.
- **One-Click Settlement**: Authorized recipients execute `claim(escrowId)` to settle funds directly into their address.
- **Shareable Direct Links**: Send `/claim/42` or `/claim?id=42` directly to payees for seamless web claims.

### 3. Atomic Multi-Recipient Batch Payments (`/batch`)
- **Gas-Optimized Multi-Pay**: Distribute native HSK or ERC-20 stablecoins to up to 100 recipients simultaneously.
- **All-or-Nothing Atomicity**: If any recipient address or balance fails, the entire transaction reverts automatically, preventing partial disbursement errors.

### 4. Automated Scheduled Payments (`/recurring`)
- **Programmable Subscriptions & Payroll**: Create recurring payment schedules for retainers, SaaS subscriptions, or recurring DAO payroll.
- **Interval Execution**: Set recurring intervals (daily, weekly, monthly, custom seconds) with a fixed period count.
- **Sender Cancellation**: Senders retain the right to cancel active schedules and reclaim remaining unspent escrow funds at any time.

### 5. Immutable Decentralized Usernames (`/username`)
- **Human-Readable Handles**: Pay `@alice` instead of copying a 42-character hex address (`0x742d...8f44`).
- **1-to-1 Permanent Binding**: Usernames on HashGuard are permanently bound to a single wallet address. Usernames cannot be transferred, edited, or reassigned.
- **Dual-Layer Architecture**: Recorded on-chain in `UsernameRegistry.sol` for trustless settlement and indexed in Supabase (`public.profiles`) for instant autocomplete and search.

### 6. Global Stablecoins & Multi-Token Suite
- **Global Dollar Standards**: Built-in first-class support for **USDT**, **USDC**, **DAI**, **EURC**, **PYUSD**, and **FDUSD**.
- **Crypto Assets**: Native HSK, WETH, WBTC, and WHSK.
- **Custom Tokens**: Enter any custom ERC-20 contract address on HSKChain with automatic on-chain symbol and decimal discovery.
- **SafeERC20 Protection**: Standardized transfer protections handling non-standard and fee-on-transfer tokens safely.

### 7. HashGuard AI Agent (`/agent`)
- **Natural Language Parsing**: Understands conversational intent (e.g. *"Send 5 USDT to @alice for 7 days"*, *"Schedule 10 USDC to @bob monthly for 3 months"*).
- **Automated Validation**: Verifies username availability, resolves recipient addresses, checks token balances, and prepares execution modals.
- **Deterministic Safe Fallback**: If LLM endpoints are offline, a robust regex/keyword parser deterministically handles standard payment intents.

---

## Technical Stack

| Layer | Technologies |
| :--- | :--- |
| **Smart Contracts** | Solidity `^0.8.24`, Foundry, OpenZeppelin (`SafeERC20`, `ReentrancyGuard`) |
| **Blockchain** | HashKey Chain Testnet (Chain ID `133`, EVM-compatible) |
| **Frontend Framework** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling & Design** | Vanilla CSS, Tailwind CSS, Glassmorphism, Dark Mode |
| **Web3 Client** | wagmi v2, viem v2, TanStack Query |
| **Backend & Indexing** | Supabase (PostgreSQL `public.profiles`), Next.js Server Route Handlers |
| **AI Intelligence** | Mistral AI API (`mistral-small-latest`) with deterministic fallback |

---

## Repository Structure

```text
├── app/                      # Next.js App Router
│   ├── agent/                # HashGuard AI Agent interface
│   ├── api/                  # API routes (username lookup, Mistral agent)
│   ├── batch/                # Atomic multi-pay batch builder
│   ├── claim/                # Recipient claim portal & inbox
│   ├── dashboard/            # Overview, stats, metrics, active schedules
│   ├── pay/                  # Protected single escrow payment
│   ├── payments/             # On-chain escrow history & refund manager
│   ├── recurring/            # Automated scheduled payments
│   └── username/             # Username claiming & verification
├── components/               # UI components (Header, Forms, Modals, Icons)
├── contracts/                # Production Solidity smart contracts
│   ├── HashGuard.sol         # Protected escrow & atomic batch contract
│   ├── ScheduledPayment.sol  # Recurring subscription schedule contract
│   └── UsernameRegistry.sol  # Immutable decentralized username registry
├── lib/                      # Configuration, ABIs, token definitions, services
├── script/                   # Foundry deployment scripts (Deploy.s.sol)
├── test/                     # Foundry comprehensive test suites
├── foundry.toml              # Foundry compiler & Blockscout verifier config
├── .env.example              # Environment variables template
└── README.md                 # Complete documentation
```

---

## Getting Started

### 1. Prerequisites
- **Node.js**: `v18.18.0` or higher
- **Foundry**: `forge` and `cast` installed ([foundry.paradigm.xyz](https://getfoundry.sh/))
- **Browser Wallet**: MetaMask, OKX Wallet, Phantom, or Rabby

### 2. Installation
```bash
git clone https://github.com/Oluwa-Laughter/hashguard.git
cd hashguard
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your parameters:
```env
NEXT_PUBLIC_CHAIN_ID=133
NEXT_PUBLIC_RPC_URL=https://testnet.hsk.xyz
NEXT_PUBLIC_EXPLORER_URL=https://testnet-explorer.hskchain.net

# Live Deployed Contracts on HSK Testnet
NEXT_PUBLIC_HASHGUARD_ADDRESS=0xd10A0fEc90775204AA9f0af7b99f89f6a6Eb97e5
NEXT_PUBLIC_USERNAME_REGISTRY_ADDRESS=0xB7A020081950c5a146006E2611D6EF0E6f7f1140
NEXT_PUBLIC_SCHEDULED_PAYMENT_ADDRESS=0xA93552100B7Ce71D76606145313D5Fd4DA117eFB

# Supabase (For instant autocomplete & handle indexing)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Mistral AI (For conversational agent)
MISTRAL_API_KEY=your-mistral-key
```

### 4. Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Smart Contract Testing & Verification

### Running the Foundry Test Suite
The contract suite contains 23 comprehensive tests covering native escrows, token approvals, authorization guards, batch reverts, recurring schedules, and immutable handle bindings:

```bash
forge test
```

Output:
```text
Ran 3 test suites: 23 tests passed, 0 failed, 0 skipped
- UsernameRegistryTest: 4 passed
- ScheduledPaymentTest: 11 passed
- HashGuardTest:        8 passed
```

### Deploying & Verifying Contracts
To deploy your own instance to HSKChain:

```bash
# 1. Deploy all contracts
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://testnet.hsk.xyz \
  --account <YOUR_KEYSTORE_ACCOUNT> \
  --broadcast

# 2. Verify on HSK Blockscout
forge verify-contract <HASHGUARD_ADDRESS> contracts/HashGuard.sol:HashGuard \
  --verifier blockscout \
  --verifier-url https://testnet-explorer.hskchain.net/api \
  --watch
```

---

## Production Build & Static Validation

Verify TypeScript types and build the Next.js production bundle:

```bash
npm run typecheck
npm run build
```

All 14 application routes compile with zero type errors and zero build warnings.

---

## License

This project is licensed under the **MIT License**.
