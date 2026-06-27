/**
 * FHE-encrypted content access utilities.
 *
 * The content key is a 128-bit number encrypted onchain as an euint128.
 * Only subscribers with ACL access can decrypt it via EIP-712 user-decryption.
 * The content itself is AES-GCM encrypted with this key and stored offchain.
 */

/** Generate a random 128-bit AES key as a BigInt. */
export function generateContentKey(): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let key = 0n;
  for (let i = 0; i < 16; i++) {
    key |= BigInt(bytes[i]) << BigInt(i * 8);
  }
  return key;
}

/** Convert a BigInt key to a CryptoKey for AES-GCM. */
async function importKey(keyBigInt: bigint): Promise<CryptoKey> {
  const keyBytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    keyBytes[i] = Number((keyBigInt >> BigInt(i * 8)) & 0xffn);
  }
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/** Encrypt content with AES-GCM using the given key. Returns base64(iv + ciphertext). */
export async function encryptContent(
  content: string,
  keyBigInt: bigint
): Promise<string> {
  const key = await importKey(keyBigInt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(content);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  // Prepend IV to ciphertext.
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

/** Decrypt AES-GCM content (base64 iv+ciphertext) with the given key. */
export async function decryptContent(
  encryptedBase64: string,
  keyBigInt: bigint
): Promise<string> {
  const key = await importKey(keyBigInt);
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}
