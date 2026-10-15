import { CommunityFeed } from "@/components/community-feed";
import { loadCommunityFeed } from "@/lib/community-feed-data";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/workspace-bootstrap";

export default async function CommunityPage() {
  const user = await getViewer();
  if (!user) return <CommunityFeed />;
  try {
    const initialFeed = await loadCommunityFeed(await createClient(), user.id);
    return <CommunityFeed initialFeed={initialFeed} />;
  } catch {
    return <CommunityFeed />;
  }
}
