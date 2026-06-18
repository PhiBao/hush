"use client";

import { useMemo } from "react";
import { RelayerWeb, SepoliaConfig, indexedDBStorage } from "@zama-fhe/sdk";
import { ViemSigner } from "@zama-fhe/sdk/viem";
import { ZamaProvider as SDKZamaProvider } from "@zama-fhe/react-sdk";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import type { PropsWithChildren } from "react";

/**
 * Wires the real Zama SDK provider.
 *
 * - Relayer: RelayerWeb(SepoliaConfig) - client-side FHE encryption + decryption.
 * - Signer: ViemSigner({ walletClient, publicClient }) - adapts viem clients
 *   into the GenericSigner the SDK expects (EIP-712 signing, read/write).
 * - Storage: indexedDBStorage - persists FHE keypairs + session sigs in IndexedDB.
 *
 * Mounted only when a wallet is connected (signer requires an account).
 */
export function ZamaProvider({ children }: PropsWithChildren) {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [relayer] = useMemo(() => [new RelayerWeb(SepoliaConfig as never)], []);

  const signer = useMemo(() => {
    if (!isConnected || !publicClient || !walletClient) return null;
    return new ViemSigner({ walletClient, publicClient });
  }, [isConnected, publicClient, walletClient]);

  if (!signer) {
    return <>{children}</>;
  }

  return (
    <SDKZamaProvider relayer={relayer} signer={signer} storage={indexedDBStorage}>
      {children}
    </SDKZamaProvider>
  );
}
