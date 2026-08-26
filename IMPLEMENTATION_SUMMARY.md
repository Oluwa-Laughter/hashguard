# HashGuard implementation summary

## Overview

HashGuard was built from an empty repository as a hackathon-ready Web3 payment MVP. It provides protected payments on HSK Chain through smart-contract escrow, username-based recipient resolution, atomic batches, and an AI-assisted intent interface.

The core security boundary is preserved throughout the implementation:

```text
HashGuard Agent → validated payment intent → wallet signature → HashGuard contract → HSK Chain
```

- The agent interprets and prepares an action.
- The connected wallet is the only component that requests transaction signatures.
- The `HashGuard` contract holds funds and enforces claim/refund rules.
- No private keys, seed phrases, wallet passwords, or signing credentials are collected or stored by the app.

## Repository structure

```text
app/                  Next.js App Router screens and API route
components/           Wallet, payment, batch, transaction-state UI
contracts/            Solidity contracts, utilities, ERC-20 interface/mock
lib/                  HSK configuration, contract ABI bindings, agent logic
script/               Foundry deployment script
test/                 Foundry contract tests
.env.example          Explicit runtime configuration template
README.md             Setup, configuration, security, and demo guide
```

## Smart contracts

### `HashGuard.sol`

The `HashGuard` contract implements a non-custodial protected-payment escrow protocol for native HSK and ERC-20 tokens.

Each escrow stores:

```solidity
struct Escrow {
    address sender;
    address recipient;
    address token;
    uint256 amount;
    uint256 expiry;
    Status status;
}
```

`address(0)` denotes native HSK. Escrows use the lifecycle `PENDING → CLAIMED` or `PENDING → REFUNDED`.

Implemented functions:

- `createNativeEscrow(recipient, expiry)` deposits HSK into the contract.
- `createTokenEscrow(token, recipient, amount, expiry)` pulls an approved ERC-20 amount into the contract.
- `claim(escrowId)` allows only the recorded recipient to receive a pending escrow.
- `refund(escrowId)` allows only the sender to recover a pending escrow once its expiry has passed.
- `getEscrow(escrowId)` returns the escrow state.
- `batchNativePayment(recipients, amounts)` transfers HSK atomically to multiple recipients.
- `batchTokenPayment(token, recipients, amounts)` transfers a single ERC-20 atomically to multiple recipients.

Events emitted for indexing and history:

- `EscrowCreated`
- `EscrowClaimed`
- `EscrowRefunded`
- `BatchPayment`

Security controls include:

- Reentrancy guard around all fund-moving operations.
- Safe ERC-20 transfer wrappers that handle false/no-return tokens.
- Checks-effects-interactions ordering for claim/refund.
- Zero recipient, zero amount, invalid expiry, invalid batch, missing escrow, invalid status, unauthorized caller, and premature-refund checks.
- A maximum batch size of 100 recipients.
- Atomic batch semantics: any invalid payment reverts the whole operation.

### `UsernameRegistry.sol`

The registry maps an on-chain normalized username to a wallet address and maintains the inverse wallet-to-username mapping.

Implemented functions:

- `registerUsername(username)` registers or changes the caller's username.
- `resolveUsername(username)` returns the associated wallet or `address(0)` if unregistered.
- `isUsernameAvailable(username)` reports availability.
- `getUsername(user)` returns the caller's recorded normalized username.

Username behavior:

- Leading `@` is accepted for user-friendly input.
- Values are normalized to lowercase.
- Valid characters are lowercase letters, digits, and `_`.
- Length is restricted to 3–32 characters.
- Duplicate ownership is rejected.
- When a user changes their username, their prior mapping is released.

### Contract utilities and test asset

The contracts include a compact OpenZeppelin-compatible `ReentrancyGuard` and `SafeERC20` implementation plus a `MockERC20` used solely by Foundry tests.

## Contract tests

Foundry tests are present in `test/HashGuard.t.sol` and `test/UsernameRegistry.t.sol`.

The successful suite covers:

- Native escrow creation and recipient claim.
- ERC-20 escrow creation and recipient claim.
- Unauthorized claim rejection.
- Refund rejection before expiry and success after expiry.
- Double claim rejection.
- Claim after refund rejection.
- Invalid recipient, amount, and expiry checks.
- Native batch payments.
- ERC-20 batch payments.
- Invalid/mismatched batch arrays.
- Username registration and normalized resolution.
- Duplicate username rejection.
- Invalid username rejection.
- Username changes and ownership mapping updates.

Latest verification result:

```text
12 tests passed, 0 failed
```

## Frontend implementation

The frontend uses Next.js, TypeScript, Tailwind CSS, wagmi, viem, and TanStack Query.

### Network and contract configuration

`lib/chains.ts` defines the HSK chain from environment variables only. It does not fabricate a chain ID, RPC URL, explorer URL, token address, or deployed contract address.

`lib/contracts.ts` contains typed ABI bindings and reads:

- `NEXT_PUBLIC_HASHGUARD_ADDRESS`
- `NEXT_PUBLIC_USERNAME_REGISTRY_ADDRESS`
- `NEXT_PUBLIC_USDC_ADDRESS`

The UI clearly prevents wallet actions until the required HSK and contract configuration values are supplied.

### Wallet integration

The shared providers configure wagmi with an injected wallet connector. The header supports connection and disconnection, while screens use the connected address for reads and contract writes.

The wallet remains responsible for all signing. The application never accesses private key material.

### Routes and screens

- `/` — product landing page and value proposition.
- `/dashboard` — wallet status, HSK balance, and primary product navigation.
- `/pay` — protected native HSK/ERC-20 payment form and confirmation review.
- `/batch` — atomic native HSK batch payment builder and review.
- `/username` — username availability, registration, and current username display.
- `/payments` — direct-contract escrow history, filtered to the connected account when available.
- `/pay/[id]` — individual escrow details and contextual claim/refund action.
- `/agent` — HashGuard Agent interface.

### Protected payment flow

The payment form supports either `@username` or a direct EVM address.

For usernames, it resolves the recipient with `UsernameRegistry.resolveUsername` before enabling payment review. The review displays recipient, resolved address, amount, protection duration, and the refund condition.

Native HSK payments submit `createNativeEscrow` with the selected amount as transaction value.

ERC-20 payments use two explicit wallet-authorized steps:

1. Approve the exact payment amount to the HashGuard contract.
2. After approval receipt confirmation, submit `createTokenEscrow`.

This is intentionally explicit; a token approval does not itself lock funds. The UI only creates the escrow on the second confirmed wallet action.

### Claim and refund experience

Payment cards are based on direct `getEscrow` contract reads. The interface determines which button to offer from real contract state and connected account ownership:

- A pending recipient sees **Claim payment**.
- The sender sees **Refund** only for a pending expired escrow.
- Claimed/refunded escrows show a final status with no financial action.

### Batch payment experience

The batch page allows adding and removing recipients, resolving usernames, validating positive amounts, calculating a total, showing a review, and submitting one `batchNativePayment` transaction.

The agent can pass a parsed batch directly to this review screen through its route query parameters.

### Transaction history

For the MVP, transaction history reads contract state directly rather than creating an off-chain database or indexer. It reads `nextEscrowId`, fetches escrow records, and filters them to sender/recipient when a wallet is connected.

This preserves blockchain state as the source of truth. Event logs are emitted by the contracts and can be added as a richer indexed history source later.

## HashGuard Agent

The agent is a transaction-aware intent layer, not an autonomous wallet or generic chatbot.

Its declared tool boundary is documented in `lib/agent.ts`:

- `resolve_username`
- `get_wallet_balance`
- `get_token_balance`
- `prepare_protected_payment`
- `prepare_batch_payment`
- `get_payment_history`
- `get_escrow_details`
- `explain_payment`

The browser performs relevant blockchain reads and transaction preparation. No tool is capable of signing or broadcasting independently.

### Intent handling

`POST /api/agent` uses `MISTRAL_API_KEY` only on the server. When it is configured, the route asks Mistral for strict JSON actions only. The system prompt explicitly forbids fabricated addresses, balances, hashes, and transaction execution claims.

Recognized actions include:

- `protected_transfer`
- `batch_payment`
- `wallet_balance`
- `payment_history`
- `explain_payment`
- `unknown`

If Mistral is unavailable or not configured, a deterministic local parser safely handles the core demonstrated commands. This preserves the manual and AI-assisted payment flow without pretending an unavailable model responded.

The agent presents a structured payment preview, resolves usernames on-chain, and routes the user to a second review page before any wallet request. It never signs or auto-submits a transaction.

## Deployment support

`script/Deploy.s.sol` deploys both contracts in one Foundry broadcast:

```bash
forge script script/Deploy.s.sol:Deploy --rpc-url "$HSK_RPC_URL" --broadcast
```

Deployment was not attempted because this repository did not contain a real HSK chain ID, RPC URL, explorer URL, funded deployer, or contract addresses. The application deliberately leaves these values blank in `.env.example` rather than inventing them.

After deployment, put actual values in `.env.local`:

```env
NEXT_PUBLIC_CHAIN_ID=
NEXT_PUBLIC_RPC_URL=
NEXT_PUBLIC_EXPLORER_URL=
NEXT_PUBLIC_HASHGUARD_ADDRESS=
NEXT_PUBLIC_USERNAME_REGISTRY_ADDRESS=
NEXT_PUBLIC_USDC_ADDRESS=
MISTRAL_API_KEY=
```

`MISTRAL_API_KEY` is server-only and must never receive a `NEXT_PUBLIC_` prefix.

## Final verification

The implementation was verified after the final ERC-20 approval/deposit flow adjustment.

```text
forge test         ✓ 12 passed, 0 failed
npm run typecheck  ✓ passed
npm run build      ✓ passed
```

The production build successfully generated all application routes and the server-side agent API route.

## Remaining external step

The only required step to execute against HSK testnet is environment/deployment configuration with real HSK values. Once those values and a funded deployer are available, deploy the contracts, set the resulting addresses, start the frontend, and complete the documented Bob → Alice protected-payment demo flow.
