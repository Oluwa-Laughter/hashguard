# HashGuard

Intelligent, protected payments on HSK Chain. HashGuard locks native HSK or ERC-20 funds in a smart-contract escrow until the named recipient claims. If an escrow expires unclaimed, only its sender can refund it.

## What is implemented

- Non-custodial native and ERC-20 protected escrows: create, claim, refund after expiry.
- On-chain normalized usernames (`@alice` → wallet address).
- Atomic native and ERC-20 batch payments.
- Wallet-facing Next.js payment, claim/refund, username, batch, and contract-state history screens.
- HashGuard Agent, with explicit intent/tool boundaries, Mistral server route, and a deterministic fallback for essential payment commands.

The agent only prepares an intent and transaction review. It cannot sign, custody funds, invent addresses/balances, or submit a transaction. The connected wallet is the final authorizer and the contracts enforce all custody rules.

## Local verification

```bash
forge test
npm install
npm run typecheck
npm run build
```

## Configure HSK

Copy `.env.example` to `.env.local` and fill every `NEXT_PUBLIC_*` value from official HSK documentation and the contracts you deploy. HashGuard intentionally does not ship invented chain IDs, RPCs, explorers, tokens, or contract addresses.

```bash
cp .env.example .env.local
```

Deploy both contracts once HSK RPC and a funded deployer are configured:

```bash
forge script script/Deploy.s.sol:Deploy --rpc-url "$HSK_RPC_URL" --broadcast
```

Set the emitted deployment addresses as `NEXT_PUBLIC_HASHGUARD_ADDRESS` and `NEXT_PUBLIC_USERNAME_REGISTRY_ADDRESS`, then run `npm run dev`.

For ERC-20 support, set `NEXT_PUBLIC_USDC_ADDRESS` to the actual HSK testnet token address. Token escrow deliberately uses an explicit wallet approval before the escrow deposit request.

## Demo flow

1. Connect Bob, register `@bob`; connect Alice, register `@alice`.
2. As Bob, enter `Send 1 HSK to @alice as a protected payment for 7 days.` in `/agent`.
3. The agent resolves Alice on-chain, renders a review, and routes to the wallet-confirmed escrow transaction.
4. As Alice, open `/payments` or `/pay/<id>` and claim.
5. Create another escrow, wait through expiry, and refund it as Bob.
6. Ask the agent for a multi-recipient payment and confirm the prepared atomic batch.

## Security model

`Agent → validated intent → wallet signature → HashGuard contract → HSK Chain`

Blockchain contract state/events are the payment source of truth. The web app does not store private keys, seed phrases, or payment custody information. The app’s history view reads escrow state directly from the configured contract.
