import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Stable monogram avatar gradient + glyph from an address or name. */
export function monogramSeed(addrOrName: string): string {
  return (addrOrName || "hush").toLowerCase().replace(/^0x/, "");
}

/** First displayable character (letter or digit) for an avatar monogram. */
export function monogramChar(addrOrName: string): string {
  const clean = (addrOrName || "h").trim();
  const ch = clean.replace(/^0x/i, "").charAt(0);
  return (ch || "h").toUpperCase();
}

/** Shorten an EVM address 0x1234…abcd. */
export function shortAddr(addr: string): string {
  if (!addr) return "";
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Deterministic angle (deg) for monogram avatar gradients, from a seed. */
export function seedAngle(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}
