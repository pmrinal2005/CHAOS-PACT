import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

/** Optional single-tenant operator protection; intentionally not advertised as tenant RLS. */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    path === "/api/health" ||
    path === "/api/worker/events" ||
    path === "/api/webhooks/github" ||
    path.startsWith("/api/receipt/") ||
    path === "/postmortems" ||
    path.startsWith("/postmortems/")
  )
    return NextResponse.next();
  const password = process.env.WORKSPACE_PASSWORD;
  if (!password) return NextResponse.next();
  let supplied = "";
  try {
    const raw = request.headers.get("authorization") || "";
    if (raw.startsWith("Basic ")) {
      const value = Buffer.from(raw.slice(6), "base64").toString("utf8");
      if (value.startsWith("operator:")) supplied = value.slice(9);
    }
  } catch {
    /* malformed credentials are not accepted */
  }
  const digest = (s: string) => createHash("sha256").update(s).digest();
  if (supplied && timingSafeEqual(digest(supplied), digest(password)))
    return NextResponse.next();
  return new NextResponse(
    "Operator authentication is required for this private workspace.",
    {
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Basic realm="CHAOS-PACT workspace", charset="UTF-8"',
        "Cache-Control": "no-store",
      },
    },
  );
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|images/|fonts/).*)"],
};
