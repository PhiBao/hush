"use client";

import Link from "next/link";
import { LockOpenIcon } from "@phosphor-icons/react";
import { CreatorAvatar } from "./CreatorAvatar";
import { LockBadge } from "./LockBadge";
import { cn, shortAddr } from "@/lib/utils";
import type { Post } from "@/lib/supabase";

interface PostCardProps {
  post: Post;
  creatorName?: string;
  href: string;
  /** unlocked = subscriber can read; locked = needs subscribe/upgrade. */
  unlocked: boolean;
  tierName?: string;
  showCreator?: boolean;
  className?: string;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Editorial feed row - designed to sit inside a `divide-y divide-border` list. */
export function PostCard({
  post,
  creatorName,
  href,
  unlocked,
  tierName,
  showCreator = true,
  className,
}: PostCardProps) {
  const name = creatorName || post.creator_name || shortAddr(post.creator_address);
  const preview = post.preview || (post.content ? post.content.slice(0, 160) : "");
  const teaser = unlocked ? preview : "Subscribe to read this post.";

  return (
    <Link
      href={href}
      className={cn(
        "group block py-5 transition-colors duration-200 ease-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg",
        className,
      )}
    >
      <div className="flex items-center gap-3 mb-2.5">
        {showCreator && <CreatorAvatar nameOrAddress={name} size={28} />}
        {showCreator && (
          <span className="text-sm font-medium text-foreground truncate">{name}</span>
        )}
        <span className="font-mono text-[11px] text-muted-foreground/70 shrink-0">
          {formatDate(post.created_at)}
        </span>
        {post.tier_index > 0 && tierName && (
          <span className="ml-auto inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {tierName}
          </span>
        )}
      </div>

      <h3 className="text-[17px] font-semibold leading-snug tracking-tight text-foreground transition-colors ease-ember group-hover:text-ember-300">
        {post.title}
      </h3>

      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-2 max-w-[65ch]">
        {teaser}
      </p>

      <div className="mt-3 flex items-center gap-2">
        {unlocked ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-success-foreground/80">
            <LockOpenIcon weight="fill" className="h-3.5 w-3.5 text-success" />
            Unlocked
          </span>
        ) : (
          <LockBadge state={post.tier_index > 0 ? "upgrade" : "locked"} tierName={tierName} />
        )}
      </div>
    </Link>
  );
}
