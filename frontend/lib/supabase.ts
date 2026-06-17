import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

export interface Post {
  id: number;
  creator_address: string;
  creator_name: string;
  title: string;
  content: string;
  tier_index: number;
  created_at: string;
}

export async function getPosts(creatorAddress: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("creator_address", creatorAddress.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch posts:", error);
    return [];
  }
  return data as Post[];
}

export async function getAllPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to fetch all posts:", error);
    return [];
  }
  return data as Post[];
}

export async function createPost(
  creatorAddress: string,
  creatorName: string,
  title: string,
  content: string,
  tierIndex: number
): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      creator_address: creatorAddress.toLowerCase(),
      creator_name: creatorName,
      title,
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
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete post:", error);
    return false;
  }
  return true;
}
