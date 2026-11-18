import { ensureSchema } from "@/db/bootstrap";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { kaneRuns, ndjsonEvents } from "@/db/schema";
import { toEvent, toRun } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Server-sent NDJSON stream for one run. Live runs are tailed from the
 * append-only event table; `?replay=N` re-emits a sealed run at N times speed.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await ensureSchema();
  } catch {
    return Response.json(
      { error: "Database connection is not ready." },
      { status: 503 },
    );
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return Response.json({ error: "Run not found." }, { status: 404 });
  const url = new URL(req.url);
  let after = Number(
    req.headers.get("last-event-id") ?? url.searchParams.get("after") ?? -1,
  );
  if (!Number.isFinite(after)) after = -1;
  const replay = Math.min(
    20,
    Math.max(0, Number(url.searchParams.get("replay")) || 0),
  );
  const enc = new TextEncoder();
  let open = true;
  req.signal.addEventListener("abort", () => (open = false));

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown, eventId?: number) =>
        controller.enqueue(
          enc.encode(
            `${eventId !== undefined ? `id: ${eventId}\n` : ""}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
          ),
        );
      const deadline = Date.now() + 50_000;
      try {
        let previous: number | null = null;
        while (open) {
          const rows = await db
            .select()
            .from(ndjsonEvents)
            .where(
              and(eq(ndjsonEvents.runId, id), gt(ndjsonEvents.seqNo, after)),
            )
            .orderBy(ndjsonEvents.seqNo)
            .limit(500);
          for (const row of rows) {
            if (!open) break;
            if (replay) {
              const gap: number =
                previous === null ? 0 : row.emittedAt.getTime() - previous;
              await sleep(Math.min(1200, Math.max(40, gap / replay)));
              previous = row.emittedAt.getTime();
            }
            send("ndjson", toEvent(row), row.seqNo);
            after = row.seqNo;
          }
          const [run] = await db
            .select()
            .from(kaneRuns)
            .where(eq(kaneRuns.id, id));
          if (!run || (run.completedAt && !rows.length)) {
            send(
              "end",
              run ? { run: toRun(run) } : { error: "Run not found." },
            );
            break;
          }
          if (Date.now() > deadline) break; // EventSource reconnects with Last-Event-ID.
          if (!rows.length) await sleep(1000);
        }
      } catch (err) {
        if (open)
          send("fault", {
            error: "The event stream was interrupted. Reconnect to continue.",
          });
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed by the client */
        }
      }
    },
    cancel() {
      open = false;
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
