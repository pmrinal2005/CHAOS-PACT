import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { adversarialBattles, evidenceArtifacts } from "@/db/schema";
import { verifyReceipt } from "./config";

/** Recomputes a battle's HMAC receipt and rechecks the pinned evidence digest. */
export async function receiptFor(id: string) {
  const [battle] = await db
    .select()
    .from(adversarialBattles)
    .where(
      or(
        eq(adversarialBattles.id, id),
        eq(adversarialBattles.beforeRunId, id),
        eq(adversarialBattles.afterRunId, id),
      ),
    );
  if (!battle) return null;
  const signed = !!(battle.hmacReceiptHash && battle.receiptPayload);
  const signatureValid =
    signed && verifyReceipt(battle.receiptPayload, battle.hmacReceiptHash!);
  const [evidence] = battle.afterRunId
    ? await db
        .select()
        .from(evidenceArtifacts)
        .where(eq(evidenceArtifacts.runId, battle.afterRunId))
    : [];
  const signedDigest =
    (battle.receiptPayload?.evidenceSha256 as string | null) ?? null;
  const runBindingsMatch =
    !!battle.receiptPayload &&
    battle.receiptPayload.battleId === battle.id &&
    battle.receiptPayload.afterRunId === battle.afterRunId &&
    (battle.receiptPayload.beforeRunId ?? null) === battle.beforeRunId;
  const evidenceDigestMatches =
    typeof signedDigest === "string" &&
    /^[0-9a-f]{64}$/i.test(signedDigest) &&
    signedDigest === evidence?.packSha256 &&
    evidence.validationExitCode === 0;
  return {
    valid:
      signatureValid &&
      evidenceDigestMatches &&
      runBindingsMatch,
    runBindingsMatch,
    signed,
    signatureValid,
    evidenceDigestMatches,
    algorithm: "HMAC-SHA256",
    battleId: battle.id,
    state: battle.state,
    payload: battle.receiptPayload,
    signature: battle.hmacReceiptHash,
    verifiedAt: new Date().toISOString(),
  };
}
