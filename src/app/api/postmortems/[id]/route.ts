import { eq } from "drizzle-orm";
import { db } from "@/db";
import { publishedPostmortems } from "@/db/schema";
import { selfVerify } from "@/lib/agents";
import { appUrlFor, handle, need } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Ctx = { params: Promise<{ id: string }> };

/** Editing an article voids its verification until Kane checks it again. */
export const PATCH = (req: Request, { params }: Ctx) =>
  handle(async () => {
    const { id } = await params;
    const b = await req.json();
    need(
      typeof b.title === "string" && b.title.trim().length >= 5,
      400,
      "The title needs at least 5 characters.",
    );
    need(
      typeof b.body === "string" && b.body.trim().length >= 60,
      400,
      "The analysis needs at least 60 characters.",
    );
    const rows = await db
      .update(publishedPostmortems)
      .set({
        title: b.title.trim().slice(0, 160),
        markdownBody: b.body,
        status: "awaiting_verification",
        publishedAt: null,
        selfVerifiedRunId: null,
      })
      .where(eq(publishedPostmortems.id, id))
      .returning({ id: publishedPostmortems.id });
    need(rows.length, 404, "Post-mortem not found.");
    return Response.json({ ok: true });
  });

/** Re-dispatches Kane CLI against the public article URL. */
export const POST = (req: Request, { params }: Ctx) =>
  handle(async () => {
    const { id } = await params;
    const run = await selfVerify(id, appUrlFor(req));
    return Response.json(
      { runId: run.id, status: run.status, error: run.errorMessage },
      { status: 202 },
    );
  });
