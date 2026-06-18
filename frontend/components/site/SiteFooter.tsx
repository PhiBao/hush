import Link from "next/link";
import { Container } from "./Container";
import { HushMark } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/80 bg-background">
      <Container size="full" className="flex flex-col items-center justify-between gap-6 py-10 sm:flex-row">
        <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Hush home">
          <HushMark className="h-6 w-6" />
          <span className="text-sm font-semibold tracking-tight text-foreground">Hush</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-muted-foreground" aria-label="Footer">
          <Link href="/" className="transition-colors hover:text-foreground">Feed</Link>
          <Link href="/create" className="transition-colors hover:text-foreground">Become a creator</Link>
          <a
            href="https://zama.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            Powered by Zama FHE
          </a>
        </nav>
        <p className="font-mono text-xs text-muted-foreground/70">
          Sepolia testnet
        </p>
      </Container>
    </footer>
  );
}
