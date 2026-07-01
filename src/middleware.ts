import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_FILE = /\.[^/]+$/;

function isAppHost(hostname: string) {
  const host = hostname.toLowerCase().split(":")[0] ?? "";
  return host.startsWith("app.");
}

function isPassthroughPath(pathname: string) {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    PUBLIC_FILE.test(pathname)
  );
}

export function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;

  if (isPassthroughPath(pathname)) {
    return NextResponse.next();
  }

  if (!isAppHost(nextUrl.hostname)) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    const url = nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const rewriteUrl = nextUrl.clone();
  rewriteUrl.pathname = `/__app${pathname}`;
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
