import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`Missing ${label} source block.`);
  }
  return source.replace(before, after);
}

function update(path, transform) {
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`No changes applied to ${path}`);
  writeFileSync(path, after);
  console.log(`Updated ${path}`);
}

update("src/components/feed/post-card.tsx", (source) => {
  let next = replaceRequired(
    source,
    '} from "lucide-react";\n',
    '} from "lucide-react";\nimport { memo } from "react";\n',
    "PostCard React import",
  );
  next = replaceRequired(next, "  actingId,\n", "  acting,\n", "PostCard acting prop");
  next = replaceRequired(
    next,
    "  actingId: string | null;\n",
    "  acting: boolean;\n",
    "PostCard acting type",
  );
  next = next.replaceAll("actingId === post.id", "acting");
  next = `${next.trimEnd()}\n\nexport const MemoizedPostCard = memo(PostCard);\n`;

  if (!next.includes("MemoizedPostCard") || next.includes("actingId")) {
    throw new Error("PostCard memoization migration was incomplete.");
  }
  return next;
});

update("src/components/feed/use-feed-data.ts", (source) => {
  let next = replaceRequired(
    source,
    "  const addReply = useCallback(\n",
    `  const updateReplyDraft = useCallback((postId: string, value: string) => {\n    setReplyDrafts((current) =>\n      current[postId] === value ? current : { ...current, [postId]: value },\n    );\n  }, []);\n\n  const addReply = useCallback(\n`,
    "reply callback insertion",
  );
  next = replaceRequired(
    next,
    "    setReplyDrafts,\n    sharePost,",
    "    updateReplyDraft,\n    sharePost,",
    "reply callback export",
  );
  return next;
});

update("src/components/feed/feed-page.tsx", (source) => {
  let next = replaceRequired(
    source,
    'import { PostCard } from "./post-card";',
    'import { MemoizedPostCard as PostCard } from "./post-card";',
    "memoized PostCard import",
  );
  next = replaceRequired(
    next,
    "                actingId={feed.actingId}\n",
    "                acting={feed.actingId === post.id}\n",
    "per-post acting state",
  );
  next = replaceRequired(
    next,
    "                onShare={(item) => void feed.sharePost(item)}\n",
    "                onShare={feed.sharePost}\n",
    "share callback",
  );
  next = replaceRequired(
    next,
    `                onToggleBookmark={(item) =>\n                  void feed.toggleBookmark(item)\n                }\n`,
    "                onToggleBookmark={feed.toggleBookmark}\n",
    "bookmark callback",
  );
  next = replaceRequired(
    next,
    `                onToggleReplies={(item) =>\n                  void feed.toggleReplies(item)\n                }\n`,
    "                onToggleReplies={feed.toggleReplies}\n",
    "replies callback",
  );
  next = replaceRequired(
    next,
    `                onToggleRepost={(item) =>\n                  void feed.toggleRepost(item)\n                }\n`,
    "                onToggleRepost={feed.toggleRepost}\n",
    "repost callback",
  );
  next = replaceRequired(
    next,
    "                onToggleLike={(item) => void feed.toggleLike(item)}\n",
    "                onToggleLike={feed.toggleLike}\n",
    "like callback",
  );
  next = replaceRequired(
    next,
    `                onReplyDraftChange={(postId, value) =>\n                  feed.setReplyDrafts((current) => ({\n                    ...current,\n                    [postId]: value,\n                  }))\n                }\n`,
    "                onReplyDraftChange={feed.updateReplyDraft}\n",
    "reply draft callback",
  );
  next = replaceRequired(
    next,
    "                onAddReply={(item) => void feed.addReply(item)}\n",
    "                onAddReply={feed.addReply}\n",
    "add reply callback",
  );
  return next;
});

for (const path of [
  "tools/apply-feed-memoization.mjs",
  ".github/workflows/apply-feed-memoization.yml",
]) {
  if (existsSync(path)) unlinkSync(path);
}
