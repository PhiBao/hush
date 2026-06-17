"use client";

export const SEPOLIA_CUSDT = "0x4E7B06D78965594eB5EF5414c357ca21E1554491";
export const SEPOLIA_CUSDT_UNDERLYING = "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0";

export const HUSH_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HUSH_CONTRACT as `0x${string}`;
export const PAYMENT_TOKEN = (process.env.NEXT_PUBLIC_PAYMENT_TOKEN ?? SEPOLIA_CUSDT) as `0x${string}`;
export const PAYMENT_TOKEN_UNDERLYING = (process.env.NEXT_PUBLIC_PAYMENT_TOKEN_UNDERLYING ??
  SEPOLIA_CUSDT_UNDERLYING) as `0x${string}`;

/** Human-readable price helper — cUSDT uses 6 decimals (like USDT). */
export function formatTokenAmount(weiOrUnits: string | bigint): string {
  const n = typeof weiOrUnits === "string" ? BigInt(weiOrUnits) : weiOrUnits;
  const whole = n / 1_000_000n;
  const frac = n % 1_000_000n;
  if (frac === 0n) return whole.toString();
  return `${whole}.${frac.toString().padStart(6, "0").replace(/0+$/, "")}`;
}

export const HUSH_ABI = [
  {
    type: "constructor",
    inputs: [{ name: "paymentToken_", type: "address", internalType: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "paymentToken",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "addTier",
    inputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "price", type: "uint256", internalType: "uint256" },
      { name: "durationSecs", type: "uint256", internalType: "uint256" },
      { name: "description", type: "string", internalType: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "creatorTiers",
    inputs: [
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "price", type: "uint256", internalType: "uint256" },
      { name: "durationSecs", type: "uint256", internalType: "uint256" },
      { name: "description", type: "string", internalType: "string" },
      { name: "active", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "creators",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "bio", type: "string", internalType: "string" },
      { name: "registered", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCreatorEarnings",
    inputs: [{ name: "creator", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getActiveTierCount",
    inputs: [{ name: "creator", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTierCount",
    inputs: [{ name: "creator", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTiers",
    inputs: [{ name: "creator", type: "address", internalType: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct Hush.Tier[]",
        components: [
          { name: "name", type: "string", internalType: "string" },
          { name: "price", type: "uint256", internalType: "uint256" },
          { name: "durationSecs", type: "uint256", internalType: "uint256" },
          { name: "description", type: "string", internalType: "string" },
          { name: "active", type: "bool", internalType: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isSubscribed",
    inputs: [
      { name: "creator", type: "address", internalType: "address" },
      { name: "subscriber", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "registerCreator",
    inputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "bio", type: "string", internalType: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "removeTier",
    inputs: [{ name: "tierIndex", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "subscribe",
    inputs: [
      { name: "creator", type: "address", internalType: "address" },
      { name: "tierIndex", type: "uint256", internalType: "uint256" },
      { name: "encryptedAmount", type: "bytes32", internalType: "externalEuint64" },
      { name: "inputProof", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "subscriptionExpiry",
    inputs: [
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "subscriptionTier",
    inputs: [
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSubscriptionTier",
    inputs: [
      { name: "creator", type: "address", internalType: "address" },
      { name: "subscriber", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalCreators",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSubscriptions",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "activeSubscriberCount",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "updateCreator",
    inputs: [
      { name: "name", type: "string", internalType: "string" },
      { name: "bio", type: "string", internalType: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "CreatorRegistered",
    inputs: [
      { name: "creator", type: "address", indexed: true, internalType: "address" },
      { name: "name", type: "string", indexed: false, internalType: "string" },
    ],
  },
  {
    type: "event",
    name: "EarningsUpdated",
    inputs: [{ name: "creator", type: "address", indexed: true, internalType: "address" }],
  },
  {
    type: "event",
    name: "Subscribed",
    inputs: [
      { name: "creator", type: "address", indexed: true, internalType: "address" },
      { name: "subscriber", type: "address", indexed: true, internalType: "address" },
      { name: "tierIndex", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "expiry", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
  {
    type: "event",
    name: "TierAdded",
    inputs: [
      { name: "creator", type: "address", indexed: true, internalType: "address" },
      { name: "tierIndex", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "name", type: "string", indexed: false, internalType: "string" },
      { name: "price", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
] as const;

/** Minimal ERC-7984 confidential-token ABI (the subset Hush uses). */
export const CONFIDENTIAL_TOKEN_ABI = [
  {
    type: "function",
    name: "confidentialBalanceOf",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setOperator",
    inputs: [
      { name: "operator", type: "address", internalType: "address" },
      { name: "until", type: "uint48", internalType: "uint48" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isOperator",
    inputs: [
      { name: "holder", type: "address", internalType: "address" },
      { name: "spender", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "wrap",
    inputs: [
      { name: "to", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "underlying",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8", internalType: "uint8" }],
    stateMutability: "view",
  },
] as const;

/** Standard ERC-20 ABI for the underlying test USDT (mint/approve/balanceOf). */
export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
] as const;
