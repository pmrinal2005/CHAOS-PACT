import { publishPostmortem } from "@/lib/agents";
import { appUrlFor, handle, need } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Signs the receipt, writes the post-mortem and dispatches Kane's self-verification. */
export const POST = (req: Request) =>
  handle(async () => {
    const b = await req.json();
    need(typeof b.battleId === "string" && /^[0-9a-f-]{36}$/i.test(b.battleId), 400, "battleId is required.");
    const post = await publishPostmortem(b.battleId, appUrlFor(req));
    return Response.json({ slug: post.slug, id: post.id, url: `${appUrlFor(req)}/postmortems/${post.slug}` }, { status: 202 });
  });
