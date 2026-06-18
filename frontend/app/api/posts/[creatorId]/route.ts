import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import { getFullPostsServer, Post } from "../../../../lib/supabase";

const HUSH = process.env.NEXT_PUBLIC_HUSH_CONTRACT as `0x${string}`;
const RPC = "https://ethereum-sepolia-rpc.publicnode.com";

const HUSH_ABI = parseAbi([
  "function isSubscribed(address creator, address subscriber) view returns (bool)",
  "function subscriptionTier(address creator, address subscriber) view returns (uint256)",
]);

const client = createPublicClient({ chain: sepolia, transport: http(RPC) });

/**
 * GET /api/posts/[creatorId]?subscriber=0x...
 *
 * Returns full post `content` only for posts whose `tier_index` is at or below
 * the caller's verified onchain subscription tier. Posts above the tier
 * return only `title` + `preview` (no `content`). Unsubscribed callers get
 * previews only. The onchain contract - not a platform key - decides access.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  const { creatorId } = await params;
  const creatorAddr = creatorId as `0x${string}`;
  const url = new URL(_req.url);
  const subscriberRaw = url.searchParams.get("subscriber");
  const subscriber = subscriberRaw as `0x${string}` | null;

  if (!creatorId || !/^0x[a-fA-F0-9]{40}$/.test(creatorId)) {
    return NextResponse.json({ error: "Invalid creator address" }, { status: 400 });
  }

  const posts = await getFullPostsServer(creatorId);
  if (posts.length === 0) {
    return NextResponse.json({ posts: [] });
  }

  // Verify subscription onchain (no trust in the request).
  let isSubbed = false;
  let subTier = -1;
  if (subscriber && /^0x[a-fA-F0-9]{40}$/.test(subscriber)) {
    try {
      isSubbed = (await client.readContract({
        address: HUSH,
        abi: HUSH_ABI,
        functionName: "isSubscribed",
        args: [creatorAddr, subscriber],
      })) as boolean;

      if (isSubbed) {
        subTier = Number(
          await client.readContract({
            address: HUSH,
            abi: HUSH_ABI,
            functionName: "subscriptionTier",
            args: [creatorAddr, subscriber],
          })
        );
      }
    } catch {
      // Onchain read failed - fail closed (treat as unsubscribed).
      isSubbed = false;
    }
  }

  const filtered: Post[] = posts.map((p) => {
    if (isSubbed && p.tier_index <= subTier) {
      return p; // full content
    }
    // Gated: strip the full content, keep only the preview.
    return { ...p, content: "" };
  });

  return NextResponse.json({
    posts: filtered,
    subscribed: isSubbed,
    subscriberTier: subTier,
  });
}
