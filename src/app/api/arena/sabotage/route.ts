import {
  appUrlFor,
  handle,
  isHttpUrl,
  need,
  requesterHash,
} from "@/lib/config";
import { startSabotage } from "@/lib/agents";
import { startLabSabotage } from "@/lib/lab-battle";
import { enforceRunGuards } from "@/lib/kane";
import { CHAOS_SCENARIOS, PLATFORMS, type ChaosScenario } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Red-Team chaos injector: mutates an isolated branch, then chains the Kane referee. */
export const POST = (req: Request) =>
  handle(async () => {
    const b = await req.json();
    need(
      process.env.WORKSPACE_PASSWORD,
      403,
      "Live branch changes are locked on public deployments.",
    );
    need(
      (CHAOS_SCENARIOS as readonly string[]).includes(b.chaosScenario),
      400,
      `chaosScenario must be one of: ${CHAOS_SCENARIOS.join(", ")}.`,
    );
    need(typeof b.projectId === "string", 400, "projectId is required.");
    need(
      !b.targetUrl || isHttpUrl(b.targetUrl),
      400,
      "targetUrl must be a valid http(s) URL.",
    );
    const targets = Array.isArray(b.targets)
      ? b.targets.filter((t: string) =>
          (PLATFORMS as readonly string[]).includes(t),
        )
      : undefined;
    const requester = requesterHash(req);
    await enforceRunGuards(requester, targets?.length || 1);
    if (b.target === "lab") {
      // Owned Chaos Lab: no repository or model key needed; Kane CLI still referees a real browser.
      const lab = await startLabSabotage(
        { projectId: b.projectId, scenario: b.chaosScenario as ChaosScenario, targets },
        appUrlFor(req),
        requester,
      );
      return Response.json(lab, { status: 202 });
    }
    const result = await startSabotage(
      {
        projectId: b.projectId,
        scenario: b.chaosScenario as ChaosScenario,
        objective: typeof b.objective === "string" ? b.objective : undefined,
        targetUrl: b.targetUrl || undefined,
        targets,
      },
      appUrlFor(req),
      requester,
    );
    return Response.json(result, { status: 202 });
  });
