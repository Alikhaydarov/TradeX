"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Heart, ImagePlus, LoaderCircle, MessageCircle, Repeat2, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Author = { full_name: string; username: string; avatar_url: string | null };
type Post = {
  id: string;
  user_id: string;
  content: string;
  author_name: string;
  author_handle: string;
  author_avatar: string | null;
  image_url?: string | null;
  symbol: string | null;
  side: "LONG" | "SHORT" | null;
  likes_count: number;
  replies_count: number;
  reposts_count: number;
  views_count: number;
  created_at: string;
  liked?: boolean;
  reposted?: boolean;
};
type Reply = { id: string; user_id: string; content: string; created_at: string; author: Author | null };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Request failed. Try again.");
  return payload as T;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "T";
}

function timeAgo(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

async function compressPostImage(file: File): Promise<File> {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    image.src = sourceUrl;
    await image.decode();
    const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is unavailable in this browser.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Image compression failed.")), "image/webp", 0.82));
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "trade-image"}.webp`, { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export function CommunityFeed() {
  const [supabase] = useState(() => createClient());
  const imagePreviewUrl = useRef<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<"LONG" | "SHORT" | "">("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [openReplies, setOpenReplies] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [replyDraft, setReplyDraft] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await request<{ posts: Post[]; likedPostIds: string[]; repostedPostIds: string[] }>("/api/community");
      const liked = new Set(data.likedPostIds);
      const reposted = new Set(data.repostedPostIds);
      setPosts(data.posts.map((post) => ({ ...post, liked: liked.has(post.id), reposted: reposted.has(post.id) })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Community is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => () => {
    if (imagePreviewUrl.current) URL.revokeObjectURL(imagePreviewUrl.current);
  }, []);

  useEffect(() => {
    if (loading || !posts.length || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.6) continue;
        const node = entry.target as HTMLElement;
        const postId = node.dataset.postId;
        if (!postId) continue;
        const key = `tradoxy:viewed:${postId}`;
        try {
          if (sessionStorage.getItem(key)) continue;
          sessionStorage.setItem(key, "1");
        } catch {
          continue;
        }
        observer.unobserve(node);
        void request<{ counted: boolean }>(`/api/community/${postId}`, { method: "POST", body: JSON.stringify({ action: "view" }) })
          .then((result) => { if (result.counted) setPosts((current) => current.map((post) => post.id === postId ? { ...post, views_count: post.views_count + 1 } : post)); })
          .catch(() => { try { sessionStorage.removeItem(key); } catch { /* Storage may be blocked. */ } });
      }
    }, { threshold: [0.6] });
    document.querySelectorAll<HTMLElement>("[data-community-post]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [loading, posts.length]);

  async function createPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      let imageUrl: string | null = null;
      if (image) {
        const compressed = await compressPostImage(image);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Please sign in again to upload an image.");
        const path = `${user.id}/${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await supabase.storage.from("post-images").upload(path, compressed, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
        if (uploadError) throw new Error("Image upload failed. Try a smaller image or post without it.");
        imageUrl = supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
      }
      const result = await request<{ post: Post }>("/api/community", {
        method: "POST",
        body: JSON.stringify({ content: draft.trim(), symbol: symbol.trim(), side: side || null, imageUrl }),
      });
      setPosts((current) => [result.post, ...current]);
      setDraft("");
      setSymbol("");
      setSide("");
      setImage(null);
      setImagePreview("");
      if (imagePreviewUrl.current) URL.revokeObjectURL(imagePreviewUrl.current);
      imagePreviewUrl.current = null;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your post could not be published.");
    } finally {
      setSending(false);
    }
  }

  async function toggleAction(post: Post, action: "like" | "repost") {
    if (busy) return;
    setBusy(`${post.id}:${action}`);
    setError("");
    const field = action === "like" ? "liked" : "reposted";
    const countField = action === "like" ? "likes_count" : "reposts_count";
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, [field]: !item[field], [countField]: Math.max(0, item[countField] + (item[field] ? -1 : 1)) } : item));
    try {
      const result = await request<{ active: boolean; count: number }>(`/api/community/${post.id}`, { method: "POST", body: JSON.stringify({ action }) });
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, [field]: result.active, [countField]: result.count } : item));
    } catch (cause) {
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, [field]: Boolean(post[field]), [countField]: post[countField] } : item));
      setError(cause instanceof Error ? cause.message : "Could not update this post.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleReplies(postId: string) {
    if (openReplies === postId) { setOpenReplies(null); return; }
    setOpenReplies(postId);
    if (replies[postId]) return;
    try {
      const result = await request<{ replies: Reply[] }>(`/api/community/${postId}/replies`);
      setReplies((current) => ({ ...current, [postId]: result.replies }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Replies could not be loaded.");
    }
  }

  async function sendReply(postId: string) {
    const content = replyDraft.trim();
    if (!content || busy) return;
    setBusy(`${postId}:reply`);
    try {
      const result = await request<{ reply: Reply }>(`/api/community/${postId}/replies`, { method: "POST", body: JSON.stringify({ content }) });
      setReplies((current) => ({ ...current, [postId]: [...(current[postId] ?? []), result.reply] }));
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, replies_count: post.replies_count + 1 } : post));
      setReplyDraft("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Reply could not be sent.");
    } finally {
      setBusy(null);
    }
  }

  return <div className="community-page">
    <header className="community-heading"><div><p className="section-label">TRADOXY COMMUNITY</p><h1>Trading, in context.</h1><p>Share a setup, compare notes, and learn from other traders.</p></div><Link href="/settings/profile" className="community-profile-link">Your profile</Link></header>
    <form className="community-composer" onSubmit={createPost}>
      <div className="community-composer-avatar">TR</div>
      <div className="community-composer-body">
        <textarea aria-label="Write a post" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={280} placeholder="What did you learn from the market today?" rows={3}/>
        {imagePreview && <div className="community-image-preview"><Image src={imagePreview} alt="Selected post attachment" width={680} height={440} unoptimized/><button type="button" aria-label="Remove image" onClick={() => { if (imagePreviewUrl.current) URL.revokeObjectURL(imagePreviewUrl.current); imagePreviewUrl.current = null; setImage(null); setImagePreview(""); }}><X size={15}/></button></div>}
        <div className="community-composer-tools"><label className="community-image-picker" title="Attach an image"><ImagePlus size={16}/><span>Photo</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (!file) return; if (file.size > 12 * 1024 * 1024) { setError("Choose an image under 12 MB."); return; } if (imagePreviewUrl.current) URL.revokeObjectURL(imagePreviewUrl.current); const url = URL.createObjectURL(file); imagePreviewUrl.current = url; setImage(file); setImagePreview(url); setError(""); event.currentTarget.value = ""; }}/></label><label>Symbol <input value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} maxLength={20} placeholder="EURUSD"/></label><select aria-label="Trade direction" value={side} onChange={(event) => setSide(event.target.value as "LONG" | "SHORT" | "")}><option value="">No direction</option><option value="LONG">Long</option><option value="SHORT">Short</option></select><span className="community-char-count">{draft.length}/280</span><button className="community-submit" disabled={!draft.trim() || sending} type="submit">{sending ? <LoaderCircle className="animate-spin" size={15}/> : <Send size={15}/>} Post</button></div>
      </div>
    </form>
    {error && <div role="alert" className="community-error">{error}</div>}
    <div className="community-stream-label"><h2>Latest discussions</h2><button type="button" onClick={() => void load()}>Refresh</button></div>
    {loading ? <div className="community-list" aria-label="Loading posts">{[0,1,2].map((item) => <div className="community-skeleton" key={item}><i/><div><b/><b/><em/></div></div>)}</div> : posts.length ? <div className="community-list">{posts.map((post) => <article className="community-post" key={post.id} data-community-post data-post-id={post.id}>
      <div className="community-post-avatar">{post.author_avatar?.startsWith("http") ? <Image src={post.author_avatar} alt="" width={36} height={36} unoptimized/> : initials(post.author_name)}</div>
      <div className="community-post-content"><div className="community-post-byline"><Link href={`/u/${encodeURIComponent(post.author_handle)}`} className="community-author">{post.author_name}</Link><span>@{post.author_handle}</span><time dateTime={post.created_at}>· {timeAgo(post.created_at)}</time></div>
        <p className="community-post-text">{post.content}</p>
        {post.image_url && <a className="community-post-image" href={post.image_url} target="_blank" rel="noreferrer"><Image src={post.image_url} alt="Post attachment" width={760} height={520} unoptimized/></a>}
        {post.symbol && <div className="community-trade-tag"><strong>{post.symbol}</strong>{post.side && <span className={post.side === "LONG" ? "is-long" : "is-short"}>{post.side}</span>}</div>}
        <div className="community-actions"><button type="button" className={openReplies === post.id ? "is-active" : ""} onClick={() => void toggleReplies(post.id)} aria-label={`Reply to ${post.author_name}`}><MessageCircle size={17}/><span>{post.replies_count}</span></button><button type="button" className={post.reposted ? "is-reposted" : ""} onClick={() => void toggleAction(post, "repost")} disabled={Boolean(busy)} aria-label="Repost"><Repeat2 size={17}/><span>{post.reposts_count}</span></button><button type="button" className={post.liked ? "is-liked" : ""} onClick={() => void toggleAction(post, "like")} disabled={Boolean(busy)} aria-label="Like"><Heart size={17} fill={post.liked ? "currentColor" : "none"}/><span>{post.likes_count}</span></button><span className="community-views"><Eye size={16}/>{post.views_count ?? 0}</span></div>
        {openReplies === post.id && <section className="community-replies" aria-label="Replies"><div className="community-reply-list">{(replies[post.id] ?? []).map((reply) => <article className="community-reply" key={reply.id}><div className="community-reply-avatar">{initials(reply.author?.full_name ?? "Trader")}</div><div><div className="community-post-byline"><strong>{reply.author?.full_name ?? "Trader"}</strong><span>@{reply.author?.username ?? "trader"}</span><time>{timeAgo(reply.created_at)}</time></div><p>{reply.content}</p></div></article>)}{!replies[post.id]?.length && <p className="community-no-replies">Be the first to reply.</p>}</div><form className="community-reply-form" onSubmit={(event) => { event.preventDefault(); void sendReply(post.id); }}><input aria-label="Write a reply" value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} maxLength={280} placeholder="Write a reply"/><button type="submit" disabled={!replyDraft.trim() || busy === `${post.id}:reply`} aria-label="Send reply">{busy === `${post.id}:reply` ? <LoaderCircle size={15} className="animate-spin"/> : <Send size={15}/>}</button></form></section>}
      </div>
    </article>)}</div> : <div className="community-empty"><MessageCircle size={22}/><h2>Start the conversation</h2><p>Your community feed is ready for its first trading note.</p></div>}
  </div>;
}
