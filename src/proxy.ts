import { NextResponse, type NextRequest } from "next/server";

import {
  appUrl,
  isHostSplitEnabled,
  isMarketingPath,
  isSharedPath,
  marketingUrl,
} from "@/lib/hosts";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Keeps the two hosts honest: tradoxy.co is the marketing site, and
 * app.tradoxy.co is the signed-in workspace.
 *
 * The session is refreshed first, so the redirect decision is made against a
 * current cookie rather than an expired one. Until both hosts are configured
 * this does nothing at all beyond that refresh - which is exactly how it
 * behaves today.
 */
export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  if (!isHostSplitEnabled()) return response;

  const marketing = marketingUrl();
  const app = appUrl();
  if (!marketing || !app) return response;

  const host = request.headers.get("host")?.toLowerCase() ?? "";
  const { pathname, search } = request.nextUrl;

  // Previews and localhost are neither host; leave them serving everything.
  const onMarketing = host === marketing.host;
  const onApp = host === app.host;
  if (!onMarketing && !onApp) return response;

  // Callbacks, webhooks and assets answer on whichever host they were asked.
  if (isSharedPath(pathname)) return response;

  const signedIn = hasSession(request);

  if (onApp && !signedIn) {
    // Nothing to show a stranger here: send them to the page that can sign
    // them in, remembering where they were headed.
    const target = new URL("/", marketing);
    target.searchParams.set("auth", "login");
    if (pathname !== "/") target.searchParams.set("next", pathname);
    return NextResponse.redirect(target);
  }

  if (onMarketing) {
    // A signed-in visitor asking for anything the marketing site does not own
    // - or asking for the landing page they have already moved past - belongs
    // on the app host.
    if (!isMarketingPath(pathname)) {
      return NextResponse.redirect(new URL(`${pathname}${search}`, app));
    }
    if (signedIn && pathname === "/") {
      return NextResponse.redirect(new URL("/", app));
    }
  }

  return response;
}

/**
 * Whether this request carries a Supabase session cookie.
 *
 * Deliberately a cookie-presence check rather than a token verification: the
 * proxy runs on every request, the real authorisation happens in the route
 * handlers and in the database's row-level security, and a forged cookie buys
 * nothing but a redirect to a page that will then refuse to load data.
 */
function hasSession(request: NextRequest) {
  // Matches both the shared-domain cookie and Supabase's default name, so the
  // check keeps working either side of the switch, and both of their chunked
  // ".0" / ".1" variants.
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith("tdx-auth") ||
        cookie.name.includes("-auth-token"),
    );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
