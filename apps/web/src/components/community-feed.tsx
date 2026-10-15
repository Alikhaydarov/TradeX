"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ImagePlus,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clientApi } from "@/lib/client-api";
import {
  feedOptions,
  hydrateReactions,
  type SocialPost as Post,
} from "@/lib/social-data";
import { useWorkspaceUser } from "./app-shell";
import { SocialPost } from "./social-post";
import { DataLoader } from "./data-loader";

async function compressPostImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(
      1,
      1800 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Image processing is unavailable. Try another image.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error("Could not prepare the image.")),
        "image/webp",
        0.82,
      ),
    );
    return new File([blob], "post.webp", { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function CommunityFeed() {
  const viewer = useWorkspaceUser();
  const client = useQueryClient();
  const params = useSearchParams();
  const targetPost = params.get("post");
  const feed = useQuery(feedOptions);
  const shared = useQuery({
    queryKey: ["social", "shared", targetPost],
    queryFn: async ({ signal }) =>
      hydrateReactions(
        await clientApi<{
          posts: Post[];
          likedPostIds: string[];
          repostedPostIds: string[];
        }>(`/api/community?post=${encodeURIComponent(targetPost!)}`, {
          signal,
        }),
      ),
    enabled: Boolean(targetPost),
  });
  const [feedView, setFeedView] = useState<"all" | "setups" | "media">("all");
  const [supabase] = useState(createClient);
  const [draft, setDraft] = useState("");
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<"" | "LONG" | "SHORT">("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [error, setError] = useState("");
  const uploaded = useRef<{ file: File; url: string } | null>(null);
  useEffect(() => {
    if (!image) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(image);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  useEffect(() => {
    if (!targetPost || !shared.data) return;
    document
      .getElementById(`post-${targetPost}`)
      ?.scrollIntoView({ block: "center" });
  }, [targetPost, shared.data]);
  const publish = useMutation({
    mutationFn: async () => {
      let imageUrl: string | null = null;
      if (image) {
        if (!viewer?.id)
          throw new Error("Please sign in again to upload an image.");
        if (uploaded.current?.file === image) imageUrl = uploaded.current.url;
        else {
          const compressed = await compressPostImage(image);
          const path = `${viewer.id}/${crypto.randomUUID()}.webp`;
          const { error: uploadError } = await supabase.storage
            .from("post-images")
            .upload(path, compressed, {
              contentType: "image/webp",
              cacheControl: "31536000",
              upsert: false,
            });
          if (uploadError)
            throw new Error(
              "Image upload failed. Your draft is saved here; try again.",
            );
          imageUrl = supabase.storage.from("post-images").getPublicUrl(path)
            .data.publicUrl;
          uploaded.current = { file: image, url: imageUrl };
        }
      }
      return clientApi<{ post: Post }>("/api/community", {
        method: "POST",
        body: JSON.stringify({
          content: draft.trim(),
          symbol: symbol.trim(),
          side: side || null,
          imageUrl,
        }),
      });
    },
    onMutate: async () => {
      setError("");
      await client.cancelQueries({ queryKey: feedOptions.queryKey });
    },
    onSuccess: ({ post }) => {
      client.setQueryData(feedOptions.queryKey, (current) => ({
        ...current,
        likedPostIds: current?.likedPostIds ?? [],
        repostedPostIds: current?.repostedPostIds ?? [],
        posts: [
          { ...post, liked: false, reposted: false },
          ...(current?.posts ?? []).filter((item) => item.id !== post.id),
        ],
      }));
      void client.invalidateQueries({
        queryKey: ["social", "profile", viewer?.username?.toLowerCase()],
        refetchType: "none",
      });
      setDraft("");
      setSymbol("");
      setSide("");
      setImage(null);
      setFeedView("all");
      uploaded.current = null;
    },
    onError: (cause) => setError(cause.message),
  });
  const posts = feed.data?.posts ?? [];
  const visiblePosts = posts.filter(
    (post) =>
      post.id !== targetPost &&
      (feedView === "all" ||
        (feedView === "media"
          ? Boolean(post.image_url)
          : Boolean(post.symbol))),
  );
  return (
    <div className="social-layout">
      <div className="community-page">
        <header className="community-heading">
          <h1>Community tape</h1>
          <Link
            href={
              viewer?.username
                ? `/u/${encodeURIComponent(viewer.username)}`
                : "/settings/profile"
            }
            className="community-profile-link"
          >
            Your profile <ArrowUpRight size={14} />
          </Link>
        </header>
        <form
          id="compose-post"
          className="community-composer"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.trim() && !publish.isPending) publish.mutate();
          }}
        >
          <div className="community-composer-avatar">
            {viewer?.avatarUrl?.startsWith("http") ? (
              <Image
                src={viewer.avatarUrl}
                alt=""
                width={40}
                height={40}
                unoptimized
              />
            ) : (
              viewer?.initials || "TR"
            )}
          </div>
          <fieldset
            className="community-composer-body"
            disabled={publish.isPending}
          >
            <textarea
              aria-label="Write a post"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={280}
              placeholder="What did you learn from the market today?"
              rows={3}
            />
            {imagePreview && (
              <div className="community-image-preview">
                <Image
                  src={imagePreview}
                  alt="Selected post attachment"
                  width={680}
                  height={440}
                  unoptimized
                />
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => setImage(null)}
                >
                  <X size={15} />
                </button>
              </div>
            )}
            <div className="community-composer-tools">
              <label className="community-image-picker" title="Attach an image">
                <ImagePlus size={16} />
                <span>Photo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    if (!file) return;
                    if (
                      !/^image\/(jpeg|png|webp)$/.test(file.type) ||
                      file.size > 12 * 1024 * 1024
                    ) {
                      setError("Choose a JPG, PNG or WebP image under 12 MB.");
                      return;
                    }
                    setImage(file);
                    setError("");
                  }}
                />
              </label>
              <label>
                Symbol{" "}
                <input
                  value={symbol}
                  onChange={(event) =>
                    setSymbol(event.target.value.toUpperCase())
                  }
                  maxLength={20}
                  placeholder="EURUSD"
                />
              </label>
              <select
                aria-label="Trade direction"
                value={side}
                onChange={(event) => setSide(event.target.value as typeof side)}
              >
                <option value="">No direction</option>
                <option value="LONG">Long</option>
                <option value="SHORT">Short</option>
              </select>
              <span className="community-char-count">{draft.length}/280</span>
              <button
                className="community-submit"
                disabled={!draft.trim() || publish.isPending}
                type="submit"
              >
                {publish.isPending ? (
                  <LoaderCircle className="animate-spin" size={15} />
                ) : (
                  <Send size={15} />
                )}
                {publish.isPending ? "Posting" : "Post"}
              </button>
            </div>
          </fieldset>
        </form>
        {(error || feed.error) && (
          <div role="alert" className="community-error">
            {error || feed.error?.message}
            {feed.isError && (
              <button type="button" onClick={() => void feed.refetch()}>
                Retry
              </button>
            )}
          </div>
        )}
        <div className="community-stream-label">
          <div className="social-feed-tabs" aria-label="Filter posts">
            {(
              [
                ["all", "Latest"],
                ["setups", "Trade setups"],
                ["media", "Media"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => setFeedView(value)}
                aria-pressed={feedView === value}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Refresh posts"
            title="Refresh posts"
            disabled={feed.isFetching || publish.isPending}
            onClick={() => void feed.refetch()}
          >
            <RefreshCw
              size={16}
              className={feed.isFetching ? "animate-spin" : ""}
            />
          </button>
        </div>
        {targetPost && (
          <div className="community-list">
            {shared.isPending ? (
              !feed.isPending && <DataLoader label="Loading shared post" />
            ) : shared.isError ? (
              <p role="alert" className="community-error">
                {shared.error.message}
              </p>
            ) : shared.data?.posts[0] ? (
              <SocialPost post={shared.data.posts[0]} />
            ) : (
              <p className="community-error">
                This post is no longer available.
              </p>
            )}
          </div>
        )}
        {feed.isPending ? (
          <DataLoader label="Loading posts" />
        ) : visiblePosts.length ? (
          <div className="community-list">
            {visiblePosts.map((post) => (
              <SocialPost key={post.id} post={post} />
            ))}
          </div>
        ) : (
          !feed.isError && (
            <div className="community-empty">
              <MessageCircle size={25} />
              <h2>
                {posts.length
                  ? "Nothing here just yet"
                  : "Your next insight starts a conversation."}
              </h2>
              <p>
                {posts.length
                  ? "Try another filter."
                  : "Share a setup, a lesson, or a trade worth reviewing."}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
