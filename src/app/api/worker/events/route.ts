import { appUrlFor, handle, need, requireWorker } from "@/lib/config";
import { ingestWorkerReport, type WorkerReport } from "@/lib/kane";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Authenticated callback used by the cloud Kane worker to stream NDJSON and results. */
export const POST = (req: Request) =>
  handle(async () => {
    requireWorker(req);
    const body = (await req.json()) as WorkerReport;
    need(body && typeof body.runId === "string" && /^[0-9a-f-]{36}$/i.test(body.runId), 400, "runId is required.");
    await ingestWorkerReport(body, appUrlFor(req));
    return Response.json({ ok: true });
  });
