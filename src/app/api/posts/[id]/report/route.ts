import {
  authenticateRequest,
  badRequest,
  serverError,
  unauthorized,
} from "@/lib/backend/auth";
import {
  isUuid,
  privateJson,
  rateLimitOrResponse,
  readJsonBody,
  rejectCrossSiteMutation,
  sanitizeUntrustedNote,
} from "@/lib/backend/request-security";
import { isPostReportReason, POST_REPORT_NOTE_MAX } from "@/lib/post-report";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const crossSite = rejectCrossSiteMutation(request);
  if (crossSite) return crossSite;

  const auth = await authenticateRequest(request);
  if (!auth) return unauthorized();

  const { id } = await context.params;
  if (!isUuid(id)) return badRequest("Invalid post.");

  // Reporting is free to do and free to automate, and every report costs a
  // moderator attention - so it is exactly the kind of endpoint that gets used
  // to bury a queue.
  const flood = await rateLimitOrResponse(auth, "tradox-post-report", 10, 3600);
  if (flood) return flood;

  const body = await readJsonBody<{ reason?: unknown; note?: unknown }>(request);
  if (!body.ok) return body.response;

  const { reason, note } = body.data;
  if (!isPostReportReason(reason)) return badRequest("Choose a reason.");

  const { data: post, error: postError } = await auth.supabase
    .from("posts")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (postError) return serverError();
  if (!post) return privateJson({ error: "Post not found." }, { status: 404 });
  if (post.user_id === auth.user.id) {
    return badRequest("You cannot report your own post.");
  }

  // The note is written by one user about another and read by a moderator, so
  // it goes through the same redaction the AI paths use rather than being
  // stored raw.
  const safeNote =
    typeof note === "string" && note.trim()
      ? sanitizeUntrustedNote(note, POST_REPORT_NOTE_MAX)
      : null;

  const { error } = await auth.supabase
    .from("post_reports")
    .insert({
      post_id: id,
      reporter_id: auth.user.id,
      reason,
      note: safeNote,
    });

  // A unique violation means this person already reported this post. That is
  // the expected outcome of a double tap, not a failure worth showing them.
  if (error && error.code !== "23505") return serverError();

  return privateJson({ reported: true, duplicate: Boolean(error) });
}
