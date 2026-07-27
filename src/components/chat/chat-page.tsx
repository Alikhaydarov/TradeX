"use client";

import { ChatLayout } from "./chat-layout";

export function ChatPage({ communityId }: { communityId: string }) {
  return <ChatLayout communityId={communityId} />;
}
