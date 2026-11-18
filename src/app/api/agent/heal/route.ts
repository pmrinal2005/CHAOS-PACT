import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adversarialBattles } from "@/db/schema";
import { healBattle } from "@/lib/agents";
import { appUrlFor, handle, need } from "@/lib/config";
import { toBattle } from "@/lib/serialize";
import { MAX_ATTEMPTS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Blue-Team auto-healer with the anti-cheat patch-intent audit. */
export const POST = (req: Request) =>
  handle(async () => {
    need(
      process.env.WORKSPACE_PASSWORD,
      403,
      "Source changes require a protected operator workspace.",
    );
    const b = await req.json();
    need(
      typeof b.battleId === "string" && /^[0-9a-f-]{36}$/i.test(b.battleId),
      400,
      "battleId is required.",
    );
    const [battle] = await db
      .select()
      .from(adversarialBattles)
      .where(eq(adversarialBattles.id, b.battleId));
    need(battle, 404, "Battle not found.");
    const failedRunId =
      b.failedRunId || battle.afterRunId || battle.beforeRunId;
    need(failedRunId, 409, "This battle has no failed referee run yet.");
    if (b.attemptNumber !== undefined) {
      need(
        Number.isInteger(b.attemptNumber) &&
          b.attemptNumber >= 1 &&
          b.attemptNumber <= MAX_ATTEMPTS,
        400,
        `attemptNumber must be between 1 and ${MAX_ATTEMPTS}.`,
      );
      need(
        b.attemptNumber === battle.healerAttempts + 1,
        409,
        `Next attempt for this battle is ${battle.healerAttempts + 1}.`,
      );
    }
    await healBattle(battle.id, failedRunId, appUrlFor(req));
    const [fresh] = await db
      .select()
      .from(adversarialBattles)
      .where(eq(adversarialBattles.id, battle.id));
    return Response.json({ battle: toBattle(fresh) }, { status: 202 });
  });
