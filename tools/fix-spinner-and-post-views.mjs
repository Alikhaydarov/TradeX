import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

function patchWorkspaceShell() {
  const path = "src/components/workspace-app-router-shell-v2.tsx";
  let source = readFileSync(path, "utf8");

  source = source.replace('import { Spinner } from "./ui/spinner";\n', "");
  source = source.replace(
    '  const [profileOpening, setProfileOpening] = useState(false);\n',
    "",
  );

  const oldEventEffect = `  useEffect(() => {
    const handleOpenProfile = () => setProfileOpening(true);
    const handleProfileReady = () => {
      window.setTimeout(() => setProfileOpening(false), 40);
    };
    const handleOpenAuth = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: "login" | "register" }>)
        .detail;
      if (detail?.mode === "register") openRegister();
      else openLogin();
    };

    window.addEventListener("tradeup:open-profile", handleOpenProfile);
    window.addEventListener("tradeup:profile-ready", handleProfileReady);
    window.addEventListener("tradeup:open-auth", handleOpenAuth);
    return () => {
      window.removeEventListener("tradeup:open-profile", handleOpenProfile);
      window.removeEventListener("tradeup:profile-ready", handleProfileReady);
      window.removeEventListener("tradeup:open-auth", handleOpenAuth);
    };
  }, []);
`;
  const newEventEffect = `  useEffect(() => {
    const handleOpenAuth = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: "login" | "register" }>)
        .detail;
      if (detail?.mode === "register") openRegister();
      else openLogin();
    };

    window.addEventListener("tradeup:open-auth", handleOpenAuth);
    return () => {
      window.removeEventListener("tradeup:open-auth", handleOpenAuth);
    };
  }, []);
`;
  if (!source.includes(oldEventEffect)) {
    throw new Error("Workspace auth/profile event effect was not found.");
  }
  source = source.replace(oldEventEffect, newEventEffect);

  const profileTimerEffect = `  useEffect(() => {
    if (!profileOpening) return;
    const timer = window.setTimeout(() => setProfileOpening(false), 180);
    return () => window.clearTimeout(timer);
  }, [profileOpening]);

`;
  source = source.replace(profileTimerEffect, "");

  const profileSpinner = `      {profileOpening ? (
        <div
          className="pointer-events-none fixed right-3 top-3 z-[2147483646] flex items-center gap-2 rounded-lg border border-white/10 bg-[#111]/95 px-3 py-2 text-xs font-semibold text-zinc-200 shadow-xl"
          role="status"
          aria-live="polite"
        >
          <Spinner className="size-3.5" /> Opening profile
        </div>
      ) : null}
`;
  if (!source.includes(profileSpinner)) {
    throw new Error("Duplicate profile spinner was not found.");
  }
  source = source.replace(profileSpinner, "");

  writeFileSync(path, source);
}

function patchFeedViews() {
  const path = "src/components/feed/use-feed-data.ts";
  let source = readFileSync(path, "utf8");

  source = source.replace(
    `  const viewed = useRef(new Set<string>());
  const observer = useRef<IntersectionObserver | null>(null);`,
    `  const viewed = useRef(new Set<string>());
  const pendingViews = useRef(new Set<string>());
  const observer = useRef<IntersectionObserver | null>(null);`,
  );

  const oldRecordView = `  const recordView = useCallback(
    (postId: string) => {
      if (!user || viewed.current.has(postId)) return;
      viewed.current.add(postId);
      void apiRequest<{
        success: boolean;
        counted?: boolean;
        views?: number | null;
      }>("/api/post-actions", {
        method: "POST",
        body: JSON.stringify({ action: "view", postId }),
      })
        .then((response) => {
          const currentViews = response.views;
          if (typeof currentViews !== "number") return;
          setPosts((current) =>
            current.map((post) =>
              post.id === postId ? { ...post, views: currentViews } : post,
            ),
          );
        })
        .catch(() => undefined);
    },
    [user],
  );`;

  const newRecordView = `  const recordView = useCallback(
    (postId: string) => {
      if (
        !user ||
        viewed.current.has(postId) ||
        pendingViews.current.has(postId)
      ) {
        return;
      }

      pendingViews.current.add(postId);
      void apiRequest<{
        success: boolean;
        counted?: boolean;
        views?: number | null;
      }>("/api/post-actions", {
        method: "POST",
        body: JSON.stringify({ action: "view", postId }),
      })
        .then((response) => {
          viewed.current.add(postId);
          const currentViews = response.views;
          if (typeof currentViews !== "number") return;
          setPosts((current) =>
            current.map((post) =>
              post.id === postId ? { ...post, views: currentViews } : post,
            ),
          );
        })
        .catch(() => undefined)
        .finally(() => {
          pendingViews.current.delete(postId);
        });
    },
    [user],
  );`;

  if (!source.includes(oldRecordView)) {
    throw new Error("Feed recordView block was not found.");
  }
  source = source.replace(oldRecordView, newRecordView);
  source = source.replace(
    "entry.intersectionRatio >= 0.55",
    "entry.intersectionRatio >= 0.2",
  );
  source = source.replace(
    "{ threshold: [0.55] },",
    '{ threshold: [0.2], rootMargin: "0px 0px -12% 0px" },',
  );

  writeFileSync(path, source);
}

function patchPostActions() {
  const path = "src/app/api/post-actions/route.ts";
  writeFileSync(
    path,
    `import { authenticateRequest, badRequest, serverError, unauthorized } from "@/lib/backend/auth";

export const runtime = "nodejs";

function toFiniteViewCount(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const body = (await request.json()) as {
    action?: "view" | "archive";
    postId?: string;
  };

  if (!body.postId || !body.action) return badRequest("Post va amal tanlanmadi.");

  if (body.action === "view") {
    const { data, error } = await auth.supabase.rpc("record_unique_post_view", {
      target_post_id: body.postId,
    });

    if (error) return serverError(error.message);
    const result = Array.isArray(data) ? data[0] : data;
    const rpcViews = toFiniteViewCount(
      typeof result === "object" && result !== null
        ? (result as { current_views?: unknown }).current_views
        : result,
    );

    let views = rpcViews;
    if (views === null) {
      const { data: post, error: postError } = await auth.supabase
        .from("posts")
        .select("views_count")
        .eq("id", body.postId)
        .maybeSingle();

      if (postError) return serverError(postError.message);
      views = toFiniteViewCount(post?.views_count);
    }

    return Response.json({
      success: true,
      counted:
        typeof result === "object" && result !== null
          ? Boolean((result as { counted?: unknown }).counted)
          : true,
      views,
    });
  }

  if (body.action === "archive") {
    const { error } = await auth.supabase.rpc("archive_post", {
      target_post_id: body.postId,
    });

    if (error) return serverError(error.message);
    return Response.json({ success: true });
  }

  return badRequest("Noto'g'ri amal.");
}
`,
  );
}

patchWorkspaceShell();
patchFeedViews();
patchPostActions();

for (const path of [
  "src/app/loading.tsx",
  "src/app/(workspace)/loading.tsx",
  "tools/fix-spinner-and-post-views.mjs",
  ".github/workflows/fix-spinner-and-post-views.yml",
]) {
  if (existsSync(path)) unlinkSync(path);
}
