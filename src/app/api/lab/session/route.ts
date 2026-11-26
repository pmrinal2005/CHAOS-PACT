import { randomBytes } from "node:crypto";
import { handle } from "@/lib/config";
import { getLab } from "@/lib/lab";

export const dynamic = "force-dynamic";

/** Issues the lab_session cookie with exactly the flags the battle's lab config declares. */
export const GET = (req: Request) =>
  handle(async () => {
    const battle = new URL(req.url).searchParams.get("battle");
    const { config } = await getLab(battle);
    const c = config.sessionCookie;
    const cookie = [
      `lab_session=${randomBytes(12).toString("hex")}`,
      "Path=/",
      "Max-Age=3600",
      `SameSite=${c.sameSite}`,
      c.httpOnly ? "HttpOnly" : "",
      c.secure ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; ");
    return Response.json(
      { ready: true },
      { headers: { "Set-Cookie": cookie, "Cache-Control": "no-store" } },
    );
  });
