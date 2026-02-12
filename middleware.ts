import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Defensive redirect for accidentally pasted route labels like:
  // /portfolio (health/trust clarity + clickable footer chips)
  if (pathname.startsWith("/portfolio ") || pathname.startsWith("/portfolio%20")) {
    const url = request.nextUrl.clone();
    url.pathname = "/portfolio";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Skip auth for auth pages and static assets
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|ico)$/)
  ) {
    return NextResponse.next();
  }

  // API routes: check API_SECRET bearer token first
  if (pathname.startsWith("/api")) {
    const authHeader = request.headers.get("authorization");
    const apiSecret = process.env.API_SECRET;

    if (apiSecret && authHeader === `Bearer ${apiSecret}`) {
      return NextResponse.next();
    }
    // Fall through to session check below
  }

  // All routes: validate Supabase session
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
