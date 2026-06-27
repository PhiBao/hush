# Hush

**Confidential payroll for the creator economy — encrypted subscriptions on Zama fhEVM.**

Hush lets creators earn from their audience through subscription payments that are **encrypted onchain**. Subscribers pay in real confidential tokens (cUSDT). Nobody can see how much they paid — not even Hush. Only the creator can decrypt their aggregate earnings.

Built on the [Zama Protocol](https://docs.zama.org) using Fully Homomorphic Encryption (FHE).

**Live on Sepolia:** [`0xC9482C8654AD49E76ea62d31a49c7244B76AbcAe`](https://sepolia.etherscan.io/address/0xC9482C8654AD49E76ea62d31a49c7244B76AbcAe)

---

## Why Hush exists

Onchain creator monetization has a privacy problem:
- **Direct crypto tips** are permanently visible on Etherscan — who paid whom and how much, forever.
- **Superfluid / Unlock** own recurring onchain payments but are fully transparent.
- **Patreon / Substack** hide earnings from the public but still see them, take 8–12%, and own the audience relationship.

Hush occupies the empty quadrant: **recurring + amount-private + non-custodial**.

---

## FHE primitives used

This is not "FHE for show." Every primitive below solves a real problem that's impossible without homomorphic encryption.

| Primitive | Where used | What it proves |
|---|---|---|
| `FHE.fromExternal` | Subscribe + vote | Re-encrypts client-side encrypted input to onchain handle. Plaintext never touches the chain. |
| `FHE.add` | Earnings aggregate | Homomorphically sums encrypted payments. Creator decrypts the total — the sum was computed on ciphertext. |
| `FHE.ge` | Payment sufficiency gate | Compares encrypted payment against public tier price. Returns an encrypted boolean: "did they pay enough?" — without revealing the amount. |
| `FHE.asEuint64` | Payment gate + poll | Casts public uint to encrypted euint64 for FHE comparison. |
| `FHE.select` | Encrypted poll voting | Conditionally adds 1 to the chosen option, 0 to others — the contract never learns which option was selected. |
| `FHE.eq` | Poll vote matching | Checks if encrypted choice equals option index. |
| `FHE.makePubliclyDecryptable` | Payment proof | Makes the sufficiency boolean publicly decryptable via KMS. Anyone can verify "paid enough?" without learning the amount. |
| `FHE.allow` / `FHE.allowThis` | ACL | Grants decryption access to specific addresses. Only the creator can decrypt their earnings. |
| `confidentialTransferFrom` (ERC-7984) | Real payment | Moves actual encrypted cUSDT tokens — not a counter, real money. |
| EIP-712 user-decryption (via SDK) | Creator dashboard | Creator signs EIP-712 → KMS re-encrypts → plaintext total appears. |

---

## How it works

### Encrypted payment flow

1. **Encrypt** — the browser encrypts the payment amount via the Zama relayer (TFHE + WASM worker).
2. **Transfer** — the Hush contract calls `confidentialTransferFrom` on cUSDT, pulling real encrypted tokens from subscriber to creator.
3. **Aggregate** — the contract homomorphically adds the encrypted amount to the creator's earnings counter (`FHE.add` on `euint64`).
4. **Sufficiency proof** — the contract computes `ebool ok = FHE.ge(amount, tierPrice)` and calls `FHE.makePubliclyDecryptable(ok)`. Anyone can decrypt this boolean to verify "paid enough?" — but the amount stays encrypted.
5. **Decrypt** — the creator clicks "Decrypt my earnings" and signs an EIP-712 request. The Zama KMS re-encrypts the handle, and the creator sees the plaintext total.
6. **Verify** — the decrypted aggregate **equals** the creator's cUSDT confidential balance. That equality is the proof: the contract computed on ciphertext correctly.

### Encrypted supporter poll

1. Creator creates a poll with 2–6 options.
2. Each subscriber encrypts their choice (an integer) and submits it onchain.
3. For each option, the contract computes `FHE.select(FHE.eq(choice, i), 1, 0)` — adding 1 to the selected option and 0 to others. The contract never learns which option was chosen.
4. Only the creator can decrypt the per-option vote totals. Individual votes are never decryptable by anyone.

### Content access

Tier-gated content is enforced by **onchain subscription verification**. The Next.js API route reads `isSubscribed(creator, caller)` + `subscriptionTier` onchain before returning full post content. Post detail pages at `/post/[id]` use the same server-side check.

---

## Architecture

```
Browser (Next.js 15)
  ├── Wallet (RainbowKit + wagmi + viem)
  ├── FHE SDK (@zama-fhe/react-sdk + @zama-fhe/sdk)
  │    ├── ViemSigner — adapts wagmi into the SDK's GenericSigner
  │    ├── RelayerWeb(SepoliaConfig) — client-side encryption + decryption
  │    ├── indexedDBStorage — persists FHE keypairs + EIP-712 sessions
  │    ├── useEncrypt — encrypts payment amounts + poll choices
  │    └── useUserDecrypt — the creator's decryption moment
  └── Content (Supabase, server-mediated, onchain-gated)

Blockchain (Sepolia)
  ├── Hush.sol — encrypted subscriptions + FHE aggregate + sufficiency proof + polls
  └── cUSDT (ERC-7984) — confidential token, real encrypted payments

Zama Protocol
  ├── fhEVM — executes encrypted operations onchain
  ├── Relayer — handles client-side encryption + decryption
  └── KMS — threshold decryption network (creator authorizes via EIP-712)
```

---

## Smart contract (`contracts/Hush.sol`)

- `registerCreator` / `updateCreator` / `addTier` / `removeTier`
- `subscribe` — pulls encrypted cUSDT via `confidentialTransferFrom`, adds to FHE aggregate, computes `FHE.ge` sufficiency proof, makes it publicly decryptable
- `getPaymentSufficient` — returns encrypted sufficiency boolean
- `createPoll` / `vote` — encrypted poll with `FHE.select` + `FHE.eq` voting
- `getPollVotes` — returns encrypted per-option vote count (creator-only decrypt)
- `getCreatorEarnings` — returns encrypted earnings handle (creator-only decrypt)
- `isSubscribed` / `getSubscriptionTier` — access control

**Payment token:** Sepolia cUSDT (Mock) `0x4E7B06D78965594eB5EF5414c357ca21E1554491`

**23 tests** — covers encrypted transfer, aggregate==balance proof, FHE.ge sufficiency (false/true/tip), poll creation, encrypted voting, double-vote rejection, non-subscriber rejection, poll result decryption, renewal, multi-subscriber.

---

## Running locally

### Prerequisites
- Node.js >= 20, pnpm >= 11

### Install + test contracts
```bash
pnpm install
pnpm contracts:test    # 23 tests
```

### Deploy
```bash
cd contracts
DEPLOYER_PK=0x... SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY \
  npx ts-node scripts/deploy.ts
```

### Configure frontend
```bash
cd frontend
cp ../.env.example .env.local
# Edit: contract address, Supabase keys, Alchemy key
```

### Run
```bash
cd frontend
pnpm dev
```

---

## Tech

| Layer | Technology |
|---|---|
| Smart contract | Solidity + fhEVM (Zama Protocol) |
| Payment token | ERC-7984 confidential cUSDT |
| FHE encryption | Zama RelayerWeb (TFHE + WASM worker) |
| FHE decryption | Zama KMS + EIP-712 user-decryption |
| Frontend | Next.js 15, React 18, TypeScript, Tailwind, Motion |
| Wallet | RainbowKit + wagmi + viem |
| Content | Supabase (server-mediated, onchain-gated) |
| Testing | Hardhat + Chai (23 tests) |

---

## Security

- Payment amounts are encrypted client-side before touching the chain
- The contract moves real encrypted cUSDT — not a counter, actual tokens
- `FHE.ge` proves payment sufficiency without revealing the amount
- Only the creator can decrypt their aggregate earnings (onchain ACL)
- Individual subscriber contributions are never decryptable by anyone
- Poll votes are encrypted — the contract never learns which option was selected
- Content access is verified onchain by the server
- Service-role Supabase key is server-only (never `NEXT_PUBLIC_`)
- No admin keys, no backdoors, no upgradeability in the Hush contract
- The app is non-custodial — Hush never holds creator funds

---

## Zama Developer Program Season 3

Submitted to the [Zama Developer Program Mainnet Season 3](https://www.zama.org/post/zama-developer-program-mainnet-season-3-composable-privacy-is-the-key) Builder Track.

**FHE primitives:** `FHE.fromExternal`, `FHE.add`, `FHE.ge`, `FHE.asEuint64`, `FHE.select`, `FHE.eq`, `FHE.makePubliclyDecryptable`, `FHE.allow`, `FHE.allowThis`, ERC-7984 `confidentialTransferFrom`, EIP-712 user-decryption.

**Positioning:** "Confidential payroll for the creator economy" — bridges Zama's institutional payroll pattern (Bron) with the consumer creator economy, occupying the verified-empty quadrant of recurring + amount-private + non-custodial payments.
