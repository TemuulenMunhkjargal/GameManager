import { NextRequest, NextResponse } from "next/server";
import {
  authorizeDesktopRequest,
  DESKTOP_SESSION_HEADER,
} from "@/lib/desktop-request-security";

export function proxy(request: NextRequest) {
  const decision = authorizeDesktopRequest({
    method: request.method,
    pathname: request.nextUrl.pathname,
    host: request.headers.get("host"),
    origin: request.headers.get("origin"),
    secFetchSite: request.headers.get("sec-fetch-site"),
    authorization: request.headers.get("authorization"),
    sessionHeader: request.headers.get(DESKTOP_SESSION_HEADER),
    cookieHeader: request.headers.get("cookie"),
  }, {
    enabled: process.env.GAMEHALL_DESKTOP_MODE === "1",
    allowedHost: process.env.GAMEHALL_ALLOWED_HOST,
    sessionToken: process.env.GAMEHALL_SESSION_TOKEN,
    schedulerToken: process.env.CRON_SECRET,
  });

  if (decision.allowed) return NextResponse.next();

  return NextResponse.json(
    { error: decision.reason },
    {
      status: decision.status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export const config = {
  matcher: "/:path*",
};
