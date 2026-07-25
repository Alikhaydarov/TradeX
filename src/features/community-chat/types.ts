export type ChatRoomKind = "channel" | "dm";

export interface ChatProfile {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface ChatCommunity {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatarUrl: string | null;
  ownerId: string;
}

export interface ChatChannel {
  id: string;
  communityId: string;
  name: string;
  isPremiumOnly: boolean;
  position: number;
  createdAt: string;
  unreadCount: number;
}

export interface ChatDmThread {
  id: string;
  peer: ChatProfile;
  createdAt: string;
  unreadCount: number;
}

export interface ChatReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface ChatReplyPreview {
  id: string;
  content: string;
  senderName: string;
  deleted: boolean;
}

export interface ChatMessage {
  id: string;
  channelId: string | null;
  dmThreadId: string | null;
  senderId: string;
  sender: ChatProfile;
  content: string;
  clientId: string | null;
  replyToMessageId: string | null;
  reply: ChatReplyPreview | null;
  reactions: ChatReaction[];
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  pending?: boolean;
  failed?: boolean;
}

export interface ChatContextPayload {
  community: ChatCommunity;
  role: "owner" | "admin" | "member";
  isOwner: boolean;
  channels: ChatChannel[];
  dms: ChatDmThread[];
  currentUser: ChatProfile;
}

export interface ChatMessagesPage {
  messages: ChatMessage[];
  nextCursor: string | null;
}

export interface RealtimeChatEvent {
  type:
    | "message.optimistic"
    | "message.created"
    | "message.updated"
    | "message.deleted"
    | "message.rejected"
    | "reaction.changed"
    | "read.changed";
  message?: ChatMessage;
  messageId?: string;
  clientId?: string;
  actorId: string;
  sentAt: string;
}

export interface ChatPresenceMeta {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  onlineAt: string;
  typing: boolean;
}
