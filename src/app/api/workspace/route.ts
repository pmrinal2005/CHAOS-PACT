import { appUrlFor, handle } from "@/lib/config";
import { loadWorkspace } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export const GET = (req: Request) =>
  handle(async () => {
    return Response.json(await loadWorkspace(appUrlFor(req)), {
      headers: { "Cache-Control": "no-store" },
    });
  });
