import { cn, monogramChar, seedAngle } from "@/lib/utils";

/**
 * Deterministic monogram avatar - an SVG gradient disc + glyph.
 * Replaces the old "first letter in a purple circle" placeholder.
 * No real photo; the gradient angle is seeded from address/name so
 * every creator gets a stable, distinct ember-tinted mark.
 */
export function CreatorAvatar({
  nameOrAddress,
  size = 40,
  className,
}: {
  nameOrAddress: string;
  size?: number;
  className?: string;
}) {
  const angle = seedAngle(nameOrAddress);
  const id = `av-${Math.abs(angle)}`;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" width={size} height={size} className="block">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"
            gradientTransform={`rotate(${angle} 0.5 0.5)`}>
            <stop offset="0%" stopColor="#1f1a15" />
            <stop offset="55%" stopColor="#332c23" />
            <stop offset="100%" stopColor="#0c0a09" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="19" fill={`url(#${id})`} stroke="#2a2520" strokeWidth="1" />
        <circle cx="20" cy="20" r="19" fill="none" stroke="#d97706" strokeOpacity="0.28" strokeWidth="1" />
        <text
          x="20"
          y="20"
          dy="0.35em"
          textAnchor="middle"
          fontFamily="var(--font-geist-sans), system-ui, sans-serif"
          fontWeight="600"
          fontSize={size * 0.42}
          fill="#f5f1eb"
        >
          {monogramChar(nameOrAddress)}
        </text>
      </svg>
    </span>
  );
}
