"use client";

import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Logo } from "./Logo";
import { HUSH_ABI, HUSH_CONTRACT_ADDRESS } from "@/lib/contract";
import { cn } from "@/lib/utils";

/**
 * Single shared site header. Replaces the 5 duplicate per-page headers.
 * Sticky, translucent, one line at desktop, ≤72px tall.
 */
export function SiteHeader({ showNav = true }: { showNav?: boolean }) {
  const { address, isConnected } = useAccount();

  const { data: creator } = useReadContract({
    abi: HUSH_ABI,
    address: HUSH_CONTRACT_ADDRESS,
    functionName: "creators",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address },
  });

  const isRegistered = (creator as [string, string, boolean] | undefined)?.[2] ?? false;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border/80",
        "bg-background/75 backdrop-blur-md supports-[backdrop-filter]:bg-background/60",
      )}
    >
      <div className="mx-auto flex h-[68px] w-full max-w-[1400px] items-center justify-between px-5 sm:px-6">
        <Logo />

        {showNav && (
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary">
            {isConnected && (
              <NavLink href="/my-subs">My Subs</NavLink>
            )}
            {isConnected && isRegistered && (
              <NavLink href="/dashboard">Dashboard</NavLink>
            )}
            <ConnectButton
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
              showBalance={false}
              chainStatus={{ smallScreen: "icon", largeScreen: "full" }}
            />
          </nav>
        )}
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors ease-ember hover:text-foreground hover:bg-muted/60"
    >
      {children}
    </Link>
  );
}
