import { appUrlFor, handle } from "@/lib/config";
import { loadWorkspace } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export const GET = (req: Request) =>
  handle(async () => Response.json(await loadWorkspace(appUrlFor(req))));
