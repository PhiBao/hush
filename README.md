# Hush — Confidential Creator Subscriptions

**Earn from your audience. Privately.**

Subscription payments your subscribers can trust and nobody else can see. Built on Zama's fhEVM using Fully Homomorphic Encryption.

## How it works

- **Creators** register a profile, create subscription tiers, and share their Hush link
- **Subscribers** pay confidentially — payment amounts are encrypted onchain via FHE
- **Only the creator** can decrypt their total earnings. Individual subscriber amounts remain private forever

## Project structure

```
hush/
├── contracts/          # Solidity smart contract (Hush.sol)
│   ├── contracts/
│   ├── test/           # 10 passing tests
│   ├── scripts/        # Deploy scripts
│   └── hardhat.config.ts
├── frontend/           # Next.js application
│   ├── app/            # Pages (landing, create, dashboard, [creatorId])
│   ├── components/     # React components
│   └── lib/            # Contract ABI and helpers
└── pnpm-workspace.yaml
```

## Quick start

### Prerequisites

- Node.js >= 20
- pnpm >= 11
- A Sepolia RPC URL (e.g., Infura)
- A funded Sepolia wallet

### Install

```bash
pnpm install
```

### Deploy contract to Sepolia

```bash
# Set your RPC URL
export SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"

# Set your mnemonic (use hardhat vars)
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY YOUR_KEY

# Deploy
cd contracts
pnpm deploy:sepolia
```

### Configure frontend

Copy the deployed contract address into `frontend/.env.local`:

```
NEXT_PUBLIC_HUSH_CONTRACT=0xYourDeployedAddress
```

### Run frontend

```bash
cd frontend
pnpm dev
```

### Test contracts locally

```bash
cd contracts
pnpm test
```

## Smart contract

`Hush.sol` uses Zama's fhEVM to encrypt subscription payment amounts onchain:

- **Encrypted amounts** — All payments are `euint64` encrypted values. The contract adds them to creator earnings without ever seeing plaintext.
- **ACL-based decryption** — Only the respective creator can decrypt their accumulated earnings via `FHE.allow()`.
- **Plaintext subscription tracking** — Subscription expiry is stored in plaintext for efficient access checks.

### Contract API

| Function | Description |
|---|---|
| `registerCreator(name, bio)` | Register as a creator |
| `addTier(name, price, duration, description)` | Add a subscription tier |
| `search(creator, tierIndex, encryptedAmount, inputProof)` | Subscribe with encrypted payment |
| `isSubscribed(creator, subscriber)` | Check subscription status |
| `getCreatorEarnings(creator)` | Get encrypted earnings handle |
| `getTiers(creator)` | Get all tiers for a creator |

## Frontend

- **Landing page** — Product overview with feature cards
- **Creator onboarding** (`/create`) — 3-step guided flow
- **Creator public page** (`/[creatorId]`) — Tier cards + subscribe button
- **Creator dashboard** (`/dashboard`) — Earnings, tiers, share link
- **Gated content** (`/[creatorId]/content`) — Subscriber-only page

### Tech stack

- Next.js (App Router), React 18, TypeScript
- RainbowKit + wagmi + viem for wallet connection
- Tailwind CSS for styling
- Zama relayer HTTP API for FHE encryption

## Encryption flow

1. Subscriber enters the payment amount in the UI
2. Frontend sends the amount to Zama's relayer (`/encrypt` endpoint)
3. Relayer returns encrypted handle + ZK input proof
4. Frontend calls `Hush.subscribe()` with the encrypted values
5. Contract adds the encrypted amount to creator's earnings (FHE addition)
6. Only the creator can decrypt their total via ACL

## Demo video notes

For the 3-minute pitch:

1. **0:00-0:30** — The problem: creator income is public onchain, Patreon takes 10%
2. **0:30-1:30** — Creator flow: register → create tiers → share link
3. **1:30-2:30** — Subscriber flow: visit page → subscribe → encrypted payment
4. **2:30-3:00** — Creator decrypts earnings, show Etherscan ciphertext

## Security

- Payment amounts are encrypted before leaving the browser
- Only the creator address can decrypt their total earnings (ACL)
- Individual subscriber amounts are never exposed
- Contract uses OpenZeppelin patterns for access control
- No admin keys — the contract has no owner

## Built for

Zama Developer Program Mainnet Season 3 — Builder Track
"Composable Privacy is the Key"

## License

MIT
