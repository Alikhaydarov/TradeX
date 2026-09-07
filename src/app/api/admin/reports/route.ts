import {
  authenticateRequest,
  badRequest,
  serverError,
  unauthorized,
} from "@/lib/backend/auth";
import {
  isUuid,
  privateJson,
  readJsonBody,
  rejectCrossSiteMutation,
} from "@/lib/backend/request-security";

export const runtime = "nodejs";

const QUEUE_LIMIT = 50;

interface ReportRow {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: string;
  note: string | null;
  status: string;
  created_at: string;
}

interface PostRow {
  id: string;
  user_id: string;
  content: string | null;
  symbol: string | null;
  is_archived: boolean | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

async function requireAdmin(
  auth: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>,
) {
  const { data, error } = await auth.supabase.rpc("is_admin");
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/**
 * The moderation queue.
 *
 * RLS already restricts this table to the reporter and to admins, so the check
 * here is not what keeps the data safe - it is what makes a non-admin get a
 * clean 401 instead of a confusingly empty list.
 */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  try {
    if (!(await requireAdmin(auth))) return unauthorized();

    const status =
      new URL(request.url).searchParams.get("status") === "resolved"
        ? ["actioned", "dismissed"]
        : ["open"];

    const { data: reports, error } = await auth.supabase
      .from("post_reports")
      .select("id, post_id, reporter_id, reason, note, status, created_at")
      .in("status", status)
      .order("created_at", { ascending: false })
      .limit(QUEUE_LIMIT)
      .returns<ReportRow[]>();

    if (error) return serverError();

    const rows = reports ?? [];
    if (!rows.length) return privateJson({ reports: [] });

    // Two lookups rather than one per report: the queue is small, but a join
    // per row is how a moderation page ends up slower than the feed it polices.
    const postIds = Array.from(new Set(rows.map((row) => row.post_id)));
    const reporterIds = Array.from(new Set(rows.map((row) => row.reporter_id)));

    const [{ data: posts }, { data: reporters }] = await Promise.all([
      auth.supabase
        .from("posts")
        .select("id, user_id, content, symbol, is_archived, created_at")
        .in("id", postIds)
        .returns<PostRow[]>(),
      auth.supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", reporterIds)
        .returns<ProfileRow[]>(),
    ]);

    const postMap = new Map((posts ?? []).map((post) => [post.id, post]));
    const authorIds = Array.from(
      new Set((posts ?? []).map((post) => post.user_id)),
    );

    const { data: authors } = authorIds.length
      ? await auth.supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", authorIds)
          .returns<ProfileRow[]>()
      : { data: [] as ProfileRow[] };

    const profileMap = new Map(
      [...(reporters ?? []), ...(authors ?? [])].map((profile) => [
        profile.id,
        profile,
      ]),
    );

    return privateJson({
      reports: rows.map((row) => {
        const post = postMap.get(row.post_id);
        const author = post ? profileMap.get(post.user_id) : undefined;
        const reporter = profileMap.get(row.reporter_id);

        return {
          id: row.id,
          reason: row.reason,
          note: row.note,
          status: row.status,
          createdAt: row.created_at,
          reporter: {
            username: reporter?.username ?? null,
            fullName: reporter?.full_name ?? null,
          },
          post: post
            ? {
                id: post.id,
                content: post.content,
                symbol: post.symbol,
                isArchived: Boolean(post.is_archived),
                createdAt: post.created_at,
                authorUsername: author?.username ?? null,
                authorName: author?.full_name ?? null,
              }
            : null,
        };
      }),
    });
  } catch {
    return serverError();
  }
}

/**
 * Resolves a report.
 *
 * "remove" archives the post as well as closing the report, because those are
 * one decision - closing the report while leaving the post up would be the
 * moderator saying yes and nothing happening.
 *
 * Either way every open report on that post is closed together. Ten people
 * reporting the same post is one job, and leaving nine rows behind would make
 * the queue look like nine outstanding decisions.
 */
export async function PATCH(request: Request) {
  const crossSite = rejectCrossSiteMutation(request);
  if (crossSite) return crossSite;

  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const body = await readJsonBody<{ reportId?: unknown; action?: unknown }>(
    request,
  );
  if (!body.ok) return body.response;

  const { reportId, action } = body.data;
  if (typeof reportId !== "string" || !isUuid(reportId)) {
    return badRequest("Invalid report.");
  }
  if (action !== "remove" && action !== "dismiss") {
    return badRequest("Action must be remove or dismiss.");
  }

  try {
    if (!(await requireAdmin(auth))) return unauthorized();

    const { data: report, error: reportError } = await auth.supabase
      .from("post_reports")
      .select("id, post_id")
      .eq("id", reportId)
      .maybeSingle();

    if (reportError) return serverError();
    if (!report) return privateJson({ error: "Report not found." }, { status: 404 });

    if (action === "remove") {
      const { error: archiveError } = await auth.supabase.rpc("archive_post", {
        target_post_id: report.post_id,
      });
      if (archiveError) return serverError();
    }

    const { error: resolveError } = await auth.supabase
      .from("post_reports")
      .update({
        status: action === "remove" ? "actioned" : "dismissed",
        reviewed_by: auth.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("post_id", report.post_id)
      .eq("status", "open");

    if (resolveError) return serverError();

    return privateJson({ resolved: true, postId: report.post_id });
  } catch {
    return serverError();
  }
}
