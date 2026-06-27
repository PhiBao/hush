import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import { serverSupabase } from "../../../lib/supabase";

const HUSH = process.env.NEXT_PUBLIC_HUSH_CONTRACT as `0x${string}`;
const RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const HUSH_ABI = parseAbi([
  "function creators(address) view returns (string, string, bool)",
]);

const client = createPublicClient({ chain: sepolia, transport: http(RPC) });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { creatorAddress, creatorName, title, content, tierIndex } = body as {
      creatorAddress: string;
      creatorName: string;
      title: string;
      content: string;
      tierIndex: number;
    };

    if (!creatorAddress || !/^0x[a-fA-F0-9]{40}$/.test(creatorAddress)) {
      return NextResponse.json({ error: "Invalid creator address" }, { status: 400 });
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Verify onchain that this address is a registered creator.
    const [, , registered] = (await client.readContract({
      address: HUSH,
      abi: HUSH_ABI,
      functionName: "creators",
      args: [creatorAddress as `0x${string}`],
    })) as [string, string, boolean];

    if (!registered) {
      return NextResponse.json({ error: "Not a registered creator" }, { status: 403 });
    }

    const preview = content.slice(0, 160);
    const { data, error } = await serverSupabase()
      .from("posts")
      .insert({
        creator_address: creatorAddress.toLowerCase(),
        creator_name: creatorName || "",
        title: title.trim(),
        preview,
        content,
        tier_index: tierIndex ?? 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Insert failed:", error);
      return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }

    return NextResponse.json({ post: data }, { status: 201 });
  } catch (e) {
    console.error("POST /api/posts error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
