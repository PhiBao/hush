import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/**
 * Public (anon) client — safe to ship to the browser.
 * RLS allows SELECT of preview fields only; full `content` is never
 * returned to anon. Writes are mediated by the server client below.
 */
export const supabase = createClient(supabaseUrl, supabasePublishableKey);

/**
 * Server-only client using the service role key.
 * Import this ONLY from Next.js API routes / server components
 * (it relies on SUPABASE_SERVICE_ROLE, which is not NEXT_PUBLIC_ and
 * therefore never bundled for the browser).
 */
export function serverSupabase() {
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (!serviceRole) {
    throw new Error("SUPABASE_SERVICE_ROLE is not set (server-only env var)");
  }
  return createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface Post {
  id: number;
  creator_address: string;
  creator_name: string;
  title: string;
  preview: string;
  content: string;
  tier_index: number;
  created_at: string;
}

/** Public previews for the feed (no full content). */
export async function getAllPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, creator_address, creator_name, title, preview, tier_index, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to fetch all posts:", error);
    return [];
  }
  return data as Post[];
}

/** Public previews for a creator (no full content). */
export async function getPosts(creatorAddress: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, creator_address, creator_name, title, preview, tier_index, created_at")
    .eq("creator_address", creatorAddress.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch posts:", error);
    return [];
  }
  return data as Post[];
}

/**
 * Full posts for a creator, including gated `content`.
 * Server-only — called from API routes after onchain subscription check.
 */
export async function getFullPostsServer(creatorAddress: string): Promise<Post[]> {
  const { data, error } = await serverSupabase()
    .from("posts")
    .select("*")
    .eq("creator_address", creatorAddress.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch full posts:", error);
    return [];
  }
  return data as Post[];
}

/** Create a post (server-mediated; verifies creator ownership at call site). */
export async function createPost(
  creatorAddress: string,
  creatorName: string,
  title: string,
  content: string,
  tierIndex: number
): Promise<Post | null> {
  const preview = content.slice(0, 160);
  const { data, error } = await serverSupabase()
    .from("posts")
    .insert({
      creator_address: creatorAddress.toLowerCase(),
      creator_name: creatorName,
      title,
      preview,
      content,
      tier_index: tierIndex,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create post:", error);
    return null;
  }
  return data as Post;
}

export async function deletePost(id: number): Promise<boolean> {
  const { error } = await serverSupabase().from("posts").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete post:", error);
    return false;
  }
  return true;
}
