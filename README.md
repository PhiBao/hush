# Hush

**Creator subscriptions that respect your privacy.**

Hush lets creators earn from their audience through subscription payments that are encrypted onchain. Subscribers can support creators they value — without broadcasting how much they paid to the entire world. Creators can prove their income without exposing individual supporter amounts.

Built on the Zama Protocol using Fully Homomorphic Encryption (FHE).

---

## Why Hush exists

Today's creator monetization tools have a privacy problem:

- **Patreon and Substack** publish subscriber counts and make earnings easy to estimate. They take 8–12% of your revenue and own the relationship with your audience.
- **Direct crypto tips** are permanently visible on Etherscan. Everyone can see who paid whom and how much — forever.
- **Ad-based models** track your audience and sell their attention to advertisers.

Hush is different. Payment amounts are encrypted before they touch the blockchain. Only the creator can decrypt their total earnings. Individual subscriber amounts are invisible to everyone — including the platform itself.

---

## How it works

### For creators
1. Connect your wallet and create a profile
2. Set up subscription tiers with prices and benefits
3. Publish posts for your subscribers
4. Share your Hush link with your audience
5. Earn privately — decrypt your earnings anytime, only you can see them

### For subscribers
1. Browse the feed to discover creators
2. Visit a creator's page to see their tiers and post previews
3. Subscribe to a tier — your payment is encrypted onchain
4. Read subscriber-only content
5. Your support stays private — nobody sees how much you paid

### Under the hood

Hush uses **Fully Homomorphic Encryption (FHE)** via the Zama Protocol. When you subscribe:

1. Your browser encrypts the payment amount locally
2. The encrypted value is sent to the smart contract
3. The contract adds it to the creator's earnings — all while the data stays encrypted
4. The contract never sees the plaintext amount. Onchain observers only see ciphertext
5. Only the creator can decrypt their total earnings using their wallet

This means payments are **verifiable** (the math adds up onchain) but **private** (amounts are encrypted).

---

## Architecture

```
Browser (Next.js)
  ├── Wallet connection (RainbowKit + wagmi)
  ├── FHE encryption (Zama RelayerWeb SDK)
  └── Content storage (Supabase)

Blockchain (Sepolia)
  └── Hush.sol — encrypted subscription logic

Zama Protocol
  ├── fhEVM — executes encrypted operations onchain
  └── Relayer — handles client-side encryption + decryption
```

**Smart contract** (`contracts/Hush.sol`):
- `registerCreator` / `updateCreator` — creator profiles
- `addTier` / `removeTier` — subscription tier management
- `subscribe` — accepts encrypted payment, records subscription expiry + tier
- `isSubscribed` / `getSubscriptionTier` — access control
- `getCreatorEarnings` — returns encrypted earnings handle (decryptable only by creator)

**Content** is stored in Supabase. Posts are associated with tiers. The contract verifies subscription status — not a platform key.

---

## Running locally

### Prerequisites
- Node.js >= 20
- pnpm >= 11

### Install

```bash
pnpm install
```

### Deploy the contract

You need a Sepolia RPC URL and a funded wallet.

```bash
cd contracts
cp .env.example .env
# Edit .env with your RPC URL and mnemonic
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY your_key
pnpm deploy:sepolia
```

### Set up Supabase

Create a Supabase project and run this SQL in the SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  creator_address TEXT NOT NULL,
  creator_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tier_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Creators can insert posts" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Creators can update posts" ON posts FOR UPDATE USING (true);
CREATE POLICY "Creators can delete posts" ON posts FOR DELETE USING (true);
```

### Configure frontend

```bash
cd frontend
cp ../.env.example .env.local
# Edit .env.local with your contract address and Supabase keys
```

### Run

```bash
cd frontend
pnpm dev
```

Visit `http://localhost:3000`.

### Test contracts

```bash
cd contracts
pnpm test
```

---

## Project structure

```
hush/
├── contracts/           # Solidity smart contract
│   ├── contracts/
│   │   └── Hush.sol     # Core contract (encrypted subscriptions)
│   ├── test/
│   │   └── Hush.test.ts # 12 tests (all passing)
│   └── scripts/         # Deploy scripts
├── frontend/            # Next.js application
│   ├── app/             # Pages (feed, create, dashboard, creator, content)
│   ├── components/      # React components (TierCard, SubscribeModal, EarningsCard)
│   └── lib/             # Contract ABI, Supabase client
├── .env.example         # Environment variables template
└── README.md
```

---

## Tech

| Layer | Technology |
|---|---|
| Smart contract | Solidity + fhEVM library (Zama Protocol) |
| Encryption | FHE via Zama Relayer (Web Worker + WASM) |
| Confidential tokens | ERC-7984 standard |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Wallet | RainbowKit + wagmi + viem |
| Content | Supabase (PostgreSQL + RLS) |
| Testing | Hardhat + Chai |

---

## Security

- Payment amounts are encrypted client-side before touching the chain
- Only the designated creator can decrypt their total earnings (onchain ACL)
- Individual subscriber contributions are never decryptable by anyone
- Smart contract uses access control with no admin keys or backdoors
- Content is protected by onchain subscription verification, not a platform key
