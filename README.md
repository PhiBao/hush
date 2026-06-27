# Hush

**Confidential payroll for the creator economy — encrypted subscriptions on Zama fhEVM.**

Hush lets creators earn from their audience through subscription payments that are **encrypted onchain**. Subscribers pay in real confidential tokens (cUSDT). Nobody can see how much they paid — not even Hush. Only the creator can decrypt their aggregate earnings. Content is gated by **FHE-encrypted AES keys** onchain — only subscribers can decrypt the key to read posts.

Built on the [Zama Protocol](https://docs.zama.org) using Fully Homomorphic Encryption (FHE).

**Live on Sepolia:** [`0x434AEC8CD8B6740523dED662142329696a80CCD8`](https://sepolia.etherscan.io/address/0x434AEC8CD8B6740523dED662142329696a80CCD8)

---

## Why Hush exists

Onchain creator monetization has a privacy problem:
- **Direct crypto tips** are permanently visible on Etherscan — who paid whom and how much, forever.
- **Superfluid / Unlock** own recurring onchain payments but are fully transparent.
- **Patreon / Substack** hide earnings from the public but still see them, take 8–12%, and own the audience relationship.

Hush occupies the empty quadrant: **recurring + amount-private + non-custodial**.

---

## FHE primitives used (11 total)

This is not "FHE for show." Every primitive below solves a real problem that's impossible without homomorphic encryption.

| Primitive | Where used | What it proves |
|---|---|---|
| `FHE.fromExternal` | Subscribe + vote + content key | Re-encrypts client-side encrypted input to onchain handle. Plaintext never touches the chain. |
| `FHE.add` | Earnings aggregate + poll votes | Homomorphically sums encrypted payments and vote counts. Creator decrypts the total — the sum was computed on ciphertext. |
| `FHE.ge` | Payment sufficiency gate | Compares encrypted payment against public tier price. Returns an encrypted boolean: "did they pay enough?" — without revealing the amount. |
| `FHE.asEuint64` | Payment gate + poll | Casts public uint to encrypted euint64 for FHE comparison. |
| `FHE.select` | Encrypted poll voting | Conditionally adds 1 to the chosen option, 0 to others — the contract never learns which option was selected. |
| `FHE.eq` | Poll vote matching | Checks if encrypted choice equals option index. |
| `FHE.makePubliclyDecryptable` | Payment proof | Makes the sufficiency boolean publicly decryptable via KMS. Anyone can verify "paid enough?" without learning the amount. |
| `FHE.allow` / `FHE.allowThis` | ACL (earnings, content key, sufficiency flag, poll votes) | Grants decryption access to specific addresses. Only the creator decrypts their earnings. Only subscribers decrypt content keys. |
| `euint256` content key | Content access gating | An AES-256 key encrypted onchain via FHE. Only current subscribers can EIP-712 decrypt it to read posts. Content is encrypted client-side with AES-GCM; the FHE key controls access. |
| `confidentialTransferFrom` (ERC-7984) | Real payment | Moves actual encrypted cUSDT tokens — not a counter, real money. |
| EIP-712 user-decryption (via SDK) | Creator dashboard + content access | Creator signs EIP-712 → KMS re-encrypts → plaintext total appears. Subscribers decrypt content keys the same way. |

---

## How it works

### Encrypted payment flow

1. **Encrypt** — the browser encrypts the payment amount via the Zama relayer (TFHE + WASM worker).
2. **Transfer** — the Hush contract calls `confidentialTransferFrom` on cUSDT, pulling real encrypted tokens from subscriber to creator. (~120k gas)
3. **Aggregate** — the contract homomorphically adds the encrypted amount to the creator's earnings counter (`FHE.add` on `euint64`). (~30k gas)
4. **Sufficiency proof** — the contract computes `ebool ok = FHE.ge(amount, tierPrice)` (~35k gas) and calls `FHE.makePubliclyDecryptable(ok)` (~25k gas). Anyone can decrypt this boolean via KMS to verify "paid enough?" — but the amount stays encrypted.
5. **Content key grant** — the creator's FHE-encrypted content key is allowed to the new subscriber (~10k gas), giving them access to all gated posts.
6. **Decrypt** — the creator clicks "Decrypt my earnings" and signs an EIP-712 request. The Zama KMS re-encrypts the handle, and the creator sees the plaintext total.
7. **Verify** — `verifyEarnings(creator)` returns both the FHE aggregate and the cUSDT confidential balance as encrypted handles. The frontend decrypts both — they must match, proving the contract computed on ciphertext correctly.

**Total gas per subscribe: ~280k** (5 FHE ops + ERC-7984 token transfer).

### FHE-encrypted content access

1. **Publish** — the creator calls `publishContentKey(externalEuint256 encryptedKey, inputProof)` to store an FHE-encrypted AES-256 key onchain.
2. **Grant** — every subscriber gets ACL access to the content key when they subscribe.
3. **Read** — the client reads `getContentKey(creator)` → EIP-712 decrypts the euint256 handle → imports the AES key → decrypts the post content.
4. Content is stored as AES-GCM encrypted blobs in Supabase. The FHE key onchain controls who can decrypt — not a server, not a CSS blur.
5. If the creator publishes a new key (rotation), all existing subscribers are re-granted access automatically.

### Encrypted supporter poll

1. Creator creates a poll with 2–6 options.
2. Each subscriber encrypts their choice (an integer) and submits it onchain.
3. For each option, the contract computes `FHE.select(FHE.eq(choice, i), 1, 0)` — adding 1 to the selected option and 0 to others. The contract never learns which option was chosen.
4. Only the creator can decrypt the per-option vote totals. Individual votes are never decryptable by anyone.
5. **Gas per option: ~120k** (eq ~32k + select ~40k + add ~30k + 2x allow ~20k).

### Onchain earnings verification

`verifyEarnings(creator)` returns `(aggregate euint64, tokenBalance euint64)` — both encrypted handles. The frontend decrypts both. If they match, it proves:
- Every encrypted payment was correctly added to the FHE aggregate
- The aggregate equals the real cUSDT that moved into the creator's wallet
- All computation happened on ciphertext — the contract never saw a plaintext amount

---

## Architecture

```
Browser (Next.js 15)
  ├── Wallet (RainbowKit + wagmi + viem)
  ├── FHE SDK (@zama-fhe/react-sdk + @zama-fhe/sdk)
  │    ├── ViemSigner — adapts wagmi into the SDK's GenericSigner
  │    ├── RelayerWeb(SepoliaConfig) — client-side encryption + decryption
  │    ├── indexedDBStorage — persists FHE keypairs + EIP-712 sessions
  │    ├── useEncrypt — encrypts payment amounts + poll choices + content keys
  │    └── useUserDecrypt — decrypts earnings, content keys, poll results
  ├── AES-GCM — hybrid encryption for post content (32-byte key stored as FHE euint256)
  └── Supabase — stores encrypted content blobs + public post metadata

Blockchain (Sepolia)
  ├── Hush.sol — encrypted subscriptions + FHE aggregate + sufficiency proof + polls + content keys
  └── cUSDT (ERC-7984) — confidential token, real encrypted payments

Zama Protocol
  ├── fhEVM — executes encrypted operations onchain
  ├── Relayer — handles client-side encryption + decryption
  └── KMS — threshold decryption network (authorized via EIP-712)
```

---

## Smart contract (`contracts/Hush.sol`)

- `registerCreator` / `updateCreator` / `addTier` / `removeTier`
- `subscribe` — pulls encrypted cUSDT via `confidentialTransferFrom`, FHE.adds to aggregate, FHE.ge sufficiency proof, grants content key access to subscriber
- `publishContentKey` — stores an FHE-encrypted AES-256 key onchain, allows all active subscribers
- `getContentKey` — returns euint256 content key handle (subscribers decrypt via EIP-712)
- `getPaymentSufficient` — returns encrypted sufficiency ebool
- `createPoll` / `vote` — encrypted poll with `FHE.select` + `FHE.eq` voting
- `getPollVotes` — returns encrypted per-option vote count (creator-only decrypt)
- `verifyEarnings` — returns (aggregate euint64, tokenBalance euint64) for onchain verification
- `getCreatorEarnings` — returns encrypted earnings handle (creator-only decrypt)
- `isSubscribed` / `getSubscriptionTier` — access control

**Payment token:** Sepolia cUSDT (Mock) `0x4E7B06D78965594eB5EF5414c357ca21E1554491`

**27 tests** — covers encrypted transfer, aggregate==balance proof, FHE.ge sufficiency (false/true/tip), poll creation, encrypted FHE.select voting, double-vote reject, non-subscriber reject, poll result decryption, FHE-encrypted content key publish/decrypt (euint256), onchain balance verification (view), renewal, multi-subscriber.

---

## Running locally

### Prerequisites
- Node.js >= 20, pnpm >= 11

### Install + test contracts
```bash
pnpm install
pnpm contracts:test    # 27 tests
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
| Content key | FHE euint256 + AES-256-GCM (hybrid encryption) |
| FHE encryption | Zama RelayerWeb (TFHE + WASM worker) |
| FHE decryption | Zama KMS + EIP-712 user-decryption |
| Frontend | Next.js 15, React 18, TypeScript, Tailwind, Motion |
| Wallet | RainbowKit + wagmi + viem |
| Content storage | Supabase (encrypted blobs, access gated by onchain FHE key) |
| Testing | Hardhat + Chai (27 tests) |

---

## Security

- Payment amounts are encrypted client-side before touching the chain
- The contract moves real encrypted cUSDT — not a counter, actual tokens
- `FHE.ge` proves payment sufficiency without revealing the amount
- Content is FHE-gated via encrypted AES keys onchain — no server can bypass access control
- Only the creator can decrypt their aggregate earnings and poll results (onchain ACL)
- Only current subscribers can decrypt the content key (ACL granted on subscribe)
- Individual subscriber contributions and votes are never decryptable by anyone
- Service-role Supabase key is server-only (never `NEXT_PUBLIC_`)
- No admin keys, no backdoors, no upgradeability in the Hush contract
- The app is non-custodial — Hush never holds creator funds

---

## Zama Developer Program Season 3

Submitted to the [Zama Developer Program Mainnet Season 3](https://www.zama.org/post/zama-developer-program-mainnet-season-3-composable-privacy-is-the-key) Builder Track.

**FHE primitives:** `FHE.fromExternal`, `FHE.add`, `FHE.ge`, `FHE.asEuint64`, `FHE.select`, `FHE.eq`, `FHE.makePubliclyDecryptable`, `FHE.allow`, `FHE.allowThis`, `euint256` content keys, ERC-7984 `confidentialTransferFrom`, EIP-712 user-decryption.

**Positioning:** "Confidential payroll for the creator economy" — bridges Zama's institutional payroll pattern (Bron) with the consumer creator economy, occupying the verified-empty quadrant of recurring + amount-private + non-custodial payments.
