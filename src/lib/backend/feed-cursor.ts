import { isUuid } from "./request-security";

/**
 * Keyset cursor for the feed: the created_at and id of the last row of the
 * previous page.
 *
 * Offset paging would drift here - the feed is ordered newest-first and people
 * post while someone is reading, so `offset=25` means something different on
 * every request and posts get shown twice or skipped. A cursor is anchored to a
 * row, so it stays correct no matter what arrives above it.
 *
 * `id` is part of the key because `created_at` is not unique. Two posts written
 * in the same microsecond would otherwise straddle the page boundary and one of
 * them would be lost.
 */
export interface FeedCursor {
  createdAt: string;
  id: string;
}

// Deliberately narrow: digits and the punctuation a PostgREST timestamp can
// contain, and nothing else. The shape is what the database actually emits -
// `to_json(created_at)` gives `2026-08-22T11:36:12.306344+00:00`, so the offset
// is always full-width. Accepting a looser `+00` here would have been worse
// than useless: `Date.parse` rejects that form, so the two checks below would
// have disagreed about what a valid cursor is.
const TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)?$/;

/**
 * Both halves of the cursor end up inside a PostgREST filter string, which the
 * client passes through untouched - so a cursor carrying a quote or a bracket
 * could rewrite the WHERE clause rather than just move the page boundary.
 * Rejecting anything that is not exactly a timestamp and a uuid is what makes
 * that interpolation safe.
 *
 * The timestamp is pattern-matched rather than round-tripped through `Date`,
 * because `Date` only keeps milliseconds while Postgres timestamps carry
 * microseconds - truncating one would move the boundary and drop a row.
 */
export function parseFeedCursor(raw: string | null): FeedCursor | null {
  if (!raw) return null;

  const separator = raw.lastIndexOf("|");
  if (separator < 1) return null;

  const createdAt = raw.slice(0, separator);
  const id = raw.slice(separator + 1);

  if (!TIMESTAMP_PATTERN.test(createdAt)) return null;
  if (Number.isNaN(Date.parse(createdAt))) return null;
  if (!isUuid(id)) return null;

  return { createdAt, id };
}

export function encodeFeedCursor(row: { created_at?: unknown; id: string }) {
  return typeof row.created_at === "string" ? `${row.created_at}|${row.id}` : null;
}

/**
 * Rows strictly older than the cursor: either an earlier timestamp, or the same
 * timestamp with a smaller id. Values are double-quoted because a timestamp
 * contains characters PostgREST would otherwise read as filter syntax.
 */
export function feedKeysetFilter(cursor: FeedCursor) {
  return [
    `created_at.lt."${cursor.createdAt}"`,
    `and(created_at.eq."${cursor.createdAt}",id.lt."${cursor.id}")`,
  ].join(",");
}
