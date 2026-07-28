import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";

function update(path, transform) {
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`No changes applied to ${path}`);
  writeFileSync(path, after);
}

update("src/components/feed/post-card.tsx", (source) => {
  let next = source.replace(
    '} from "lucide-react";\n',
    '} from "lucide-react";\nimport { memo } from "react";\n',
  );
  next = next.replace("  actingId,\n", "  acting,\n");
  next = next.replace("  actingId: string | null;\n", "  acting: boolean;\n");
  next = next.replaceAll("actingId === post.id", "acting");
  next = `${next.trimEnd()}\n\nexport const MemoizedPostCard = memo(PostCard);\n`;

  if (!next.includes("MemoizedPostCard") || next.includes("actingId")) {
    throw new Error("PostCard memoization migration was incomplete.");
  }
  return next;
});

update("src/components/feed/use-feed-data.ts", (source) => {
  let next = source.replace(
    "  const addReply = useCallback(\n",
    `  const updateReplyDraft = useCallback((postId: string, value: string) => {\n    setReplyDrafts((current) =>\n      current[postId] === value ? current : { ...current, [postId]: value },\n    );\n  }, []);\n\n  const addReply = useCallback(\n`,
  );
  next = next.replace(
    "    setReplyDrafts,\n    sharePost,",
    "    updateReplyDraft,\n    sharePost,",
  );
  if (!next.includes("updateReplyDraft") || next.includes("    setReplyDrafts,\n    sharePost,")) {
    throw new Error("Feed reply callback migration was incomplete.");
  }
  return next;
});

update("src/components/feed/feed-page.tsx", (source) => {
  let next = source.replace(
    'import { PostCard } from "./post-card";',
    'import { MemoizedPostCard as PostCard } from "./post-card";',
  );
  next = next.replace(
    "                actingId={feed.actingId}\n",
    "                acting={feed.actingId === post.id}\n",
  );
  next = next.replace(
    "                onShare={(item) => void feed.sharePost(item)}\n",
    "                onShare={feed.sharePost}\n",
  );
  next = next.replace(
    /                onToggleBookmark=\{\(item\) =>\n                  void feed\.toggleBookmark\(item\)\n                \}\}\n/,
    "                onToggleBookmark={feed.toggleBookmark}\n",
  );
  next = next.replace(
    /                onToggleReplies=\{\(item\) =>\n                  void feed\.toggleReplies\(item\)\n                \}\}\n/,
    "                onToggleReplies={feed.toggleReplies}\n",
  );
  next = next.replace(
    /                onToggleRepost=\{\(item\) =>\n                  void feed\.toggleRepost\(item\)\n                \}\}\n/,
    "                onToggleRepost={feed.toggleRepost}\n",
  );
  next = next.replace(
    "                onToggleLike={(item) => void feed.toggleLike(item)}\n",
    "                onToggleLike={feed.toggleLike}\n",
  );
  next = next.replace(
    /                onReplyDraftChange=\{\(postId, value\) =>\n                  feed\.setReplyDrafts\(\(current\) => \(\{\n                    \.\.\.current,\n                    \[postId\]: value,\n                  \}\)\)\n                \}\}\n/,
    "                onReplyDraftChange={feed.updateReplyDraft}\n",
  );
  next = next.replace(
    "                onAddReply={(item) => void feed.addReply(item)}\n",
    "                onAddReply={feed.addReply}\n",
  );

  const forbidden = [
    "actingId={feed.actingId}",
    "feed.setReplyDrafts",
    "onShare={(item)",
    "onToggleLike={(item)",
  ];
  for (const value of forbidden) {
    if (next.includes(value)) throw new Error(`Feed page still contains ${value}`);
  }
  return next;
});

for (const path of [
  "tools/apply-feed-memoization.mjs",
  ".github/workflows/apply-feed-memoization.yml",
]) {
  if (existsSync(path)) unlinkSync(path);
}
