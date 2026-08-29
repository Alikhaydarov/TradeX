/**
 * Where the marketing site ends and the app begins.
 *
 * The split is opt-in and driven entirely by environment variables, so the
 * code can ship long before the DNS record exists: with either variable unset,
 * or with both pointing at the same host, everything behaves exactly as it did
 * when one domain served both.
 *
 *   NEXT_PUBLIC_MARKETING_URL = https://tradoxy.co
 *   NEXT_PUBLIC_APP_URL       = https://app.tradoxy.co
 */

function normalise(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`);
  } catch {
    return null;
  }
}

export function marketingUrl() {
  return normalise(process.env.NEXT_PUBLIC_MARKETING_URL);
}

export function appUrl() {
  return normalise(process.env.NEXT_PUBLIC_APP_URL);
}

/** True only once both hosts are configured and they actually differ. */
export function isHostSplitEnabled() {
  const marketing = marketingUrl();
  const app = appUrl();
  return Boolean(marketing && app && marketing.host !== app.host);
}

/**
 * The domain the auth cookie is written for, so one sign-in covers both hosts.
 *
 * Derived from the marketing host rather than configured separately: there is
 * only one right answer, and asking for it twice is one more thing to get
 * wrong. `www.` is stripped so `www.tradoxy.co` still yields `.tradoxy.co`.
 */
export function authCookieDomain() {
  if (!isHostSplitEnabled()) return undefined;
  const marketing = marketingUrl();
  if (!marketing) return undefined;
  const host = marketing.hostname.replace(/^www\./, "");
  // Never scope a cookie to a bare hostname with no dot (localhost, previews).
  if (!host.includes(".")) return undefined;
  return `.${host}`;
}

/**
 * Cookie options shared by every Supabase client.
 *
 * The name changes together with the domain. Keeping the default name while
 * widening the domain would leave the old host-only cookie sitting alongside
 * the new one, and the browser would send both - so everyone signs in once
 * more, and after that there is exactly one cookie in play.
 */
export function supabaseCookieOptions() {
  const domain = authCookieDomain();
  if (!domain) return undefined;
  return { domain, name: "tdx-auth" as const };
}

/** Paths the marketing host is allowed to serve itself. */
const MARKETING_PATHS = ["/pricing"];

export function isMarketingPath(pathname: string) {
  if (pathname === "/") return true;
  return MARKETING_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/** Paths that must keep working on either host: callbacks, webhooks, assets. */
export function isSharedPath(pathname: string) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  );
}
