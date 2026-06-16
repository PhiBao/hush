"use client";

import { useZamaSDK } from "@zama-fhe/react-sdk";

export function useHushSDK() {
  return useZamaSDK();
}

export const SEPOLIA_CUSDT_MOCK = "0x4E7B06D78965594eB5EF5414c357ca21E1554491";

export const HUSH_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HUSH_CONTRACT as `0x${string}`;

export const HUSH_ABI = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable",
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
    inputs: [
      { name: "creator", type: "address", indexed: true, internalType: "address" },
    ],
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
] as const;
