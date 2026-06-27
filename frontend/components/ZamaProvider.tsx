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
 * - Relayer: RelayerWeb(SepoliaConfig + getChainId) — client-side FHE encryption.
 * - Signer: ViemSigner({ walletClient, publicClient }) — adapts viem clients
 *   into the GenericSigner the SDK expects.
 * - Storage: indexedDBStorage — persists FHE keypairs + EIP-712 sessions.
 *
 * Mounted only when a wallet is connected.
 */
export function ZamaProvider({ children }: PropsWithChildren) {
  const { isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const relayer = useMemo(
    () =>
      new RelayerWeb({
        ...SepoliaConfig,
        getChainId: async () => SepoliaConfig.chainId,
        transports: {
          [SepoliaConfig.chainId]: {
            aclContractAddress: SepoliaConfig.aclContractAddress,
            kmsContractAddress: SepoliaConfig.kmsContractAddress,
            inputVerifierContractAddress: SepoliaConfig.inputVerifierContractAddress,
            verifyingContractAddressDecryption: SepoliaConfig.verifyingContractAddressDecryption,
            verifyingContractAddressInputVerification: SepoliaConfig.verifyingContractAddressInputVerification,
            network: SepoliaConfig.network,
            relayerUrl: SepoliaConfig.relayerUrl,
          },
        },
      } as never),
    []
  );

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
