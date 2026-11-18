import { appUrlFor, handle } from "@/lib/config";
import { loadWorkspace } from "@/lib/serialize";
import { ensureSampleWorkspace } from "@/db/seed-replay";

export const dynamic = "force-dynamic";

export const GET = (req: Request) =>
  handle(async () => {
    await ensureSampleWorkspace();
    return Response.json(await loadWorkspace(appUrlFor(req)), {
      headers: { "Cache-Control": "no-store" },
    });
  });
