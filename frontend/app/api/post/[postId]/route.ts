import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import { getPostByIdServer, Post } from "../../../../lib/supabase";

const HUSH = process.env.NEXT_PUBLIC_HUSH_CONTRACT as `0x${string}`;
const RPC = "https://ethereum-sepolia-rpc.publicnode.com";

const HUSH_ABI = parseAbi([
  "function isSubscribed(address creator, address subscriber) view returns (bool)",
  "function subscriptionTier(address creator, address subscriber) view returns (uint256)",
]);

const client = createPublicClient({ chain: sepolia, transport: http(RPC) });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const url = new URL(_req.url);
  const subscriber = url.searchParams.get("subscriber");

  const id = Number(postId);
  if (!id || id < 1) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }

  const post = await getPostByIdServer(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  let authorized = false;
  let subTier = -1;

  if (subscriber && /^0x[a-fA-F0-9]{40}$/.test(subscriber)) {
    try {
      const creatorAddr = post.creator_address as `0x${string}`;
      const subAddr = subscriber as `0x${string}`;
      const isSubbed = (await client.readContract({
        address: HUSH,
        abi: HUSH_ABI,
        functionName: "isSubscribed",
        args: [creatorAddr, subAddr],
      })) as boolean;
      if (isSubbed) {
        subTier = Number(
          await client.readContract({
            address: HUSH,
            abi: HUSH_ABI,
            functionName: "subscriptionTier",
            args: [creatorAddr, subAddr],
          })
        );
        authorized = post.tier_index <= subTier;
      }
    } catch { /* fail closed */ }
  }

  if (!authorized) {
    return NextResponse.json({
      post: { ...post, content: "" },
      authorized: false,
      subscriberTier: subTier,
    });
  }

  return NextResponse.json({
    post,
    authorized: true,
    subscriberTier: subTier,
  });
}
