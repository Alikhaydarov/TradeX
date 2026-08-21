/**
 * Canonical path for a trader's public profile.
 *
 * Handles were being lower-cased and stripped of their leading "@" at four
 * separate call sites, one of which forgot to encode the result. Keeping the
 * rule in one place means a link built in the feed, in search, in notifications
 * and in the connections dialog all resolve to the same URL.
 */
export function profilePath(username: string) {
  const handle = username.replace(/^@/, "").trim().toLowerCase();
  return `/${encodeURIComponent(handle)}`;
}
