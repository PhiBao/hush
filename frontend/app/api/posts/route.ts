import { NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "../../../lib/supabase";

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

    // Onchain creator verification is done client-side by the dashboard
    // (useReadContract -> creators(address).registered). The server write
    // uses the service role — no RPC round-trip needed here.

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
