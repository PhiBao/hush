"use client";

import { useEncrypt, useUserDecrypt } from "@zama-fhe/react-sdk";
import { HUSH_CONTRACT_ADDRESS } from "./contract";

const ALGO = "AES-GCM" as const;
const KEY_LEN = 256;

/**
 * Generate a random AES-256 key and return its raw bytes + hex representation.
 */
export async function generateAESKey(): Promise<{ raw: CryptoKey; hex: string }> {
  const key = await crypto.subtle.generateKey({ name: ALGO, length: KEY_LEN }, true, ["encrypt", "decrypt"]);
  const exported = await crypto.subtle.exportKey("raw", key);
  const hex = Array.from(new Uint8Array(exported)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return { raw: key, hex };
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns the ciphertext + IV as base64 strings for storage.
 */
export async function encryptContent(key: CryptoKey, plaintext: string): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded);
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

/**
 * Decrypt a base64 ciphertext + IV back to a plaintext string.
 */
export async function decryptContent(
  key: CryptoKey,
  ciphertext: string,
  iv: string,
): Promise<string> {
  const ct = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: ALGO, iv: ivBytes }, key, ct);
  return new TextDecoder().decode(decrypted);
}

/**
 * Import an AES key from a FHE-decrypted hex string (32 bytes as hex).
 */
export async function importAESKey(hex: string): Promise<CryptoKey> {
  const raw = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    raw[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return crypto.subtle.importKey("raw", raw, { name: ALGO, length: KEY_LEN }, false, ["decrypt"]);
}

/**
 * Hook: FHE-encrypt an AES key as euint256 and publish it onchain.
 * Returns the encrypt mutation so the caller can `mutateAsync`.
 */
export function useContentKeyPublish() {
  const encryptMutation = useEncrypt();
  return encryptMutation;
}

/**
 * Hook: EIP-712 decrypt the creator's content key.
 * Takes the euint256 handle from getContentKey(creator).
 */
export function useContentKeyDecrypt(handle: `0x${string}` | undefined) {
  return useUserDecrypt(
    {
      handles: handle ? [{ handle, contractAddress: HUSH_CONTRACT_ADDRESS }] : [],
    },
    { enabled: !!handle },
  );
}
