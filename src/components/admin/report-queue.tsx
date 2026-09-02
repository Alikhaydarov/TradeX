"use client";

import { Flag, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { apiRequest } from "@/lib/api-client";
import { postReportReasonLabel } from "@/lib/post-report";
import { formatRelativeTime } from "@/lib/social-format";
import { SkeletonBlock, XSpinner } from "../app-loader";
import { Button } from "../ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";

interface QueuedReport {
  id: string;
  reason: string;
  note: string | null;
  status: string;
  createdAt: string;
  reporter: { username: string | null; fullName: string | null };
  post: {
    id: string;
    content: string | null;
    symbol: string | null;
    isArchived: boolean;
    createdAt: string;
    authorUsername: string | null;
    authorName: string | null;
  } | null;
}

/**
 * The open moderation queue.
 *
 * Resolving one report resolves every open report on the same post, so a post
 * reported by ten people is one decision here rather than ten. The list is
 * refetched afterwards instead of being patched in place: an action can close
 * rows other than the one that was clicked, and guessing which ones from the
 * client would go wrong the moment two moderators work at once.
 */
export function ReportQueue() {
  const [reports, setReports] = useState<QueuedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await apiRequest<{ reports: QueuedReport[] }>(
        "/api/admin/reports",
      );
      setReports(response.reports);
      setError(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Reports could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = async (report: QueuedReport, action: "remove" | "dismiss") => {
    setResolvingId(report.id);
    setError(null);
    try {
      await apiRequest("/api/admin/reports", {
        method: "PATCH",
        body: JSON.stringify({ reportId: report.id, action }),
      });
      await load();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Report could not be resolved.",
      );
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <section className="mb-4 rounded-3xl border border-white/8 bg-surface p-3 shadow-2xl shadow-black/25 sm:p-4">
      <div className="flex items-center gap-2 px-1">
        <Flag size={14} className="text-amber-300" />
        <h2 className="text-xs font-semibold uppercase tracking-[.18em] text-ink-mute">
          Reported posts
        </h2>
        {!loading && reports.length ? (
          <span className="ml-auto rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold tabular-nums text-amber-200">
            {reports.length} open
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="mt-3 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-3 space-y-2" role="status" aria-label="Loading reports">
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonBlock key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : !reports.length ? (
        <Empty className="rounded-2xl py-10">
          <EmptyHeader>
            <EmptyMedia>
              <ShieldCheck size={18} />
            </EmptyMedia>
            <EmptyTitle>Nothing to review</EmptyTitle>
            <EmptyDescription>
              Reported posts land here. An empty queue means nobody has flagged
              anything since the last one was resolved.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="mt-3 space-y-2">
          {reports.map((report) => {
            const busy = resolvingId === report.id;
            return (
              <li
                key={report.id}
                className="rounded-2xl border border-white/8 bg-white/[.02] p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                    {postReportReasonLabel(report.reason)}
                  </span>
                  {report.post?.symbol ? (
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-ink-soft">
                      {report.post.symbol}
                    </span>
                  ) : null}
                  {report.post?.isArchived ? (
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-ink-mute">
                      already removed
                    </span>
                  ) : null}
                  <span className="ml-auto text-[10px] text-ink-subtle">
                    {formatRelativeTime(report.createdAt)}
                  </span>
                </div>

                <p className="mt-2.5 line-clamp-4 whitespace-pre-wrap text-sm text-zinc-200">
                  {report.post?.content?.trim() || (
                    <span className="text-ink-mute">
                      {report.post
                        ? "This post has no text."
                        : "The post has been deleted."}
                    </span>
                  )}
                </p>

                {report.note ? (
                  <p className="mt-2 rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-xs text-ink-soft">
                    {report.note}
                  </p>
                ) : null}

                <p className="mt-2.5 text-[11px] text-ink-subtle">
                  {report.post?.authorUsername
                    ? `Posted by @${report.post.authorUsername}`
                    : "Author unknown"}
                  {report.reporter.username
                    ? ` - reported by @${report.reporter.username}`
                    : ""}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void resolve(report, "dismiss")}
                  >
                    {busy ? <XSpinner size="sm" /> : null}
                    Keep post
                  </Button>
                  <Button
                    size="sm"
                    className="bg-rose-600 text-white hover:bg-rose-500"
                    disabled={busy}
                    onClick={() => void resolve(report, "remove")}
                  >
                    {busy ? <XSpinner size="sm" /> : <Trash2 size={14} />}
                    Remove post
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
