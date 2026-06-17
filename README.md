# Hush

**Confidential payroll for the creator economy.**

Hush lets creators earn from their audience through subscription payments that are **encrypted onchain**. Subscribers pay in real confidential tokens (cUSDT) — nobody can see how much they paid, not even Hush. Only the creator can decrypt their aggregate earnings.

Built on the [Zama Protocol](https://docs.zama.org) using Fully Homomorphic Encryption (FHE).

---

## Why Hush exists

Today's creator monetization has a privacy problem:

- **Patreon / Substack** hide earnings from the public but still see them themselves, take 8–12%, and own the audience relationship.
- **Onchain tips** are permanently visible on Etherscan — who paid whom and how much, forever.
- **Superfluid / Unlock** own recurring onchain payments but are fully transparent.

Hush occupies the empty quadrant: **recurring + amount-private + non-custodial**. Payment amounts are encrypted before they touch the blockchain. The contract moves real confidential cUSDT via `confidentialTransferFrom` and homomorphically accumulates earnings via `FHE.add` — all on ciphertext. Only the creator can decrypt their total.

---

## How it works

### The FHE proof

When a subscriber pays:

1. **Encrypt** — the browser encrypts the payment amount via the Zama relayer (TFHE + WASM worker).
2. **Transfer** — the Hush contract calls `confidentialTransferFrom` on the cUSDT token, pulling real encrypted tokens from the subscriber to the creator. The contract never sees the plaintext.
3. **Aggregate** — the contract homomorphically adds the encrypted amount to the creator's earnings counter (`FHE.add` on `euint64`).
4. **Decrypt** — the creator clicks "Decrypt my earnings" and signs an EIP-712 request. The Zama KMS re-encrypts the handle, and the creator sees the plaintext total.
5. **Verify** — the decrypted aggregate **equals** the creator's cUSDT confidential balance. That equality is the proof: the contract computed on ciphertext correctly.

Individual subscriber amounts are **never decryptable by anyone** — not the platform, not other users, not the contract. Only the aggregate is decryptable, and only by the creator (onchain ACL).

### Content access

Tier-gated content is enforced by **onchain subscription verification**, not a CSS blur. The Next.js API route reads `isSubscribed(creator, caller)` + `subscriptionTier` onchain before returning full post content. Unsubscribed callers receive only the public preview.

---

## Architecture

```
Browser (Next.js)
  ├── Wallet (RainbowKit + wagmi + viem)
  ├── FHE SDK (@zama-fhe/react-sdk + @zama-fhe/sdk)
  │    ├── ViemSigner — adapts wagmi/viem into the SDK's GenericSigner
  │    ├── RelayerWeb(SepoliaConfig) — client-side encryption + decryption
  │    ├── indexedDBStorage — persists FHE keypairs + EIP-712 sessions
  │    └── useUserDecrypt — the creator's decryption moment
  └── Content (Supabase, server-mediated, onchain-gated)

Blockchain (Sepolia)
  ├── Hush.sol — encrypted subscription logic + FHE aggregate
  └── cUSDT (ERC-7984) — confidential token, real encrypted payments

Zama Protocol
  ├── fhEVM — executes encrypted operations onchain
  ├── Relayer — handles client-side encryption + decryption
  └── KMS — threshold decryption network (creator authorizes via EIP-712)
```

**Smart contract** (`contracts/Hush.sol`):
- `registerCreator` / `updateCreator` / `addTier` / `removeTier`
- `subscribe` — pulls encrypted cUSDT via `confidentialTransferFrom`, adds to FHE aggregate, sets subscription expiry
- `isSubscribed` / `getSubscriptionTier` — access control
- `getCreatorEarnings` — returns encrypted earnings handle (decryptable only by creator)
- `activeSubscriberCount` — public count (amounts never exposed)

**Payment token**: Sepolia cUSDT (Mock) `0x4E7B06D78965594eB5EF5414c357ca21E1554491` — a live ERC-7984 confidential token.

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
```bash
cd contracts
# Set env: DEPLOYER_PK, SEPOLIA_RPC_URL
npx ts-node scripts/deploy.ts
```

### Set up Supabase
Create a Supabase project and run this SQL:
```sql
CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  creator_address TEXT NOT NULL,
  creator_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  preview TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  tier_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads previews" ON posts FOR SELECT USING (true);
```

### Configure frontend
```bash
cd frontend
cp ../.env.example .env.local
# Edit .env.local with your contract address + Supabase keys
```

### Run
```bash
cd frontend
pnpm dev
```

### Test contracts
```bash
cd contracts
pnpm test
```

---

## Project structure
```
hush/
├── contracts/
│   ├── contracts/
│   │   ├── Hush.sol              # Core contract (encrypted subscriptions + FHE aggregate)
│   │   ├── IConfidentialToken.sol # Minimal ERC-7984 interface
│   │   └── MockConfidentialToken.sol # Test-only FHE token
│   ├── test/Hush.test.ts         # 22 tests (all passing)
│   └── scripts/deploy.ts
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # Landing + feed (FHE story hero)
│   │   ├── [creatorId]/          # Creator page + gated content
│   │   ├── create/               # Creator onboarding
│   │   ├── dashboard/            # Creator dashboard (decrypt earnings)
│   │   ├── my-subs/              # Subscriber dashboard (renewals)
│   │   └── api/posts/[creatorId] # Server-side onchain content gating
│   ├── components/
│   │   ├── ZamaProvider.tsx      # Real SDK provider (ViemSigner + RelayerWeb)
│   │   ├── EarningsCard.tsx      # The decryption moment (useUserDecrypt)
│   │   └── SubscribeModal.tsx    # Multi-step: mint → shield → approve → encrypt → subscribe
│   └── lib/
│       ├── contract.ts           # ABI + cUSDT config
│       └── supabase.ts           # Public (anon) + server (service role) clients
└── .env.example
```

---

## Tech

| Layer | Technology |
|---|---|
| Smart contract | Solidity + fhEVM (Zama Protocol) |
| Payment token | ERC-7984 confidential cUSDT |
| FHE encryption | Zama RelayerWeb (TFHE + WASM worker) |
| FHE decryption | Zama KMS + EIP-712 user decryption |
| Frontend | Next.js, React, TypeScript, Tailwind |
| Wallet | RainbowKit + wagmi + viem |
| Content | Supabase (server-mediated, onchain-gated) |
| Testing | Hardhat + Chai (22 tests) |

---

## Security

- Payment amounts are encrypted client-side before touching the chain
- The contract moves real encrypted cUSDT — not a counter, actual tokens
- Only the creator can decrypt their aggregate earnings (onchain ACL)
- Individual subscriber contributions are never decryptable by anyone
- Content access is verified onchain by the server — not a CSS blur
- Service-role Supabase key is server-only (never `NEXT_PUBLIC_`)
- No admin keys, no backdoors, no upgradeability in the Hush contract
- The app is non-custodial — Hush never holds creator funds
