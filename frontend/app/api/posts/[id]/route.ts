import { NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "../../../../lib/supabase";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const postId = Number(id);
  if (!postId || postId < 1) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }

  const { error } = await serverSupabase().from("posts").delete().eq("id", postId);
  if (error) {
    console.error("Delete failed:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
