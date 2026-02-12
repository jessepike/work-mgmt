import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Defensive redirect for accidentally pasted route labels like:
  // /portfolio (health/trust clarity + clickable footer chips)
  if (pathname.startsWith("/portfolio ") || pathname.startsWith("/portfolio%20")) {
    const url = request.nextUrl.clone();
    url.pathname = "/portfolio";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
