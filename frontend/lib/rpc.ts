export const SEPOLIA_RPC = process.env.ALCHEMY_SEPOLIA_KEY
  ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_SEPOLIA_KEY}`
  : "https://ethereum-sepolia-rpc.publicnode.com";

export const RPC_TIMEOUT = 12_000; // 12s — fail fast instead of hanging
