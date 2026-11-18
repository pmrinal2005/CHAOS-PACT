import { db } from "@/db";
import { adversarialBattles, projects } from "@/db/schema";
import { appUrlFor, cfg, handle } from "@/lib/config";
import { GitHub, parseRepo, verifyGithubSignature } from "@/lib/integrations";
import { logBattle, triggerRuns } from "@/lib/kane";
import { coveragePct, syncRequirements } from "@/lib/requirements";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DOC = /(^|\/)(PRD|README)\.md$/i;

/** Re-ingests a changed PRD/README so drifted claims are flagged as stale or unverified. */
async function reconcileDocs(project: typeof projects.$inferSelect, files: string[], ref: string) {
  const doc = files.find((f) => /(^|\/)PRD\.md$/i.test(f)) || files.find((f) => DOC.test(f));
  if (!doc || !cfg().githubToken) return null;
  const { content } = await new GitHub(project.repoUrl).file(doc, ref);
  const requirements = syncRequirements(project.requirementsJson, content);
  await db
    .update(projects)
    .set({ prdMarkdown: content, specFilename: doc, requirementsJson: requirements, assuranceCoveragePct: coveragePct(requirements) })
    .where(eq(projects.id, project.id));
  return { doc, total: requirements.length, stale: requirements.filter((r) => r.trust === "stale").length, unverified: requirements.filter((r) => r.trust === "derived").length };
}

/** Autonomous PR gate, README lie detector and smoke-suite trigger. */
export const POST = (req: Request) =>
  handle(async () => {
    const raw = await req.text();
    verifyGithubSignature(raw, req.headers.get("x-hub-signature-256"));
    const event = req.headers.get("x-github-event");
    const payload = JSON.parse(raw);
    if (event === "ping") return Response.json({ ok: true, pong: true });
    const full = String(payload.repository?.full_name || "").toLowerCase();
    const all = await db.select().from(projects).where(eq(projects.archived, false));
    const project = all.find((p) => parseRepo(p.repoUrl)?.full.toLowerCase() === full);
    if (!project) return Response.json({ ignored: `No project is registered for ${full}.` }, { status: 202 });
    const appUrl = appUrlFor(req);

    if (event === "pull_request" && ["opened", "synchronize", "reopened"].includes(payload.action)) {
      const pr = payload.pull_request;
      const branch: string = pr.head.ref;
      const sha: string = pr.head.sha;
      let files: string[] = [];
      if (cfg().githubToken) files = (await new GitHub(project.repoUrl).prFiles(pr.number)).map((f) => f.filename);
      const docsChanged = files.some((f) => DOC.test(f));
      const reconciled = docsChanged ? await reconcileDocs(project, files, sha) : null;
      const targetUrl = project.previewUrlTemplate?.includes("{branch}")
        ? project.previewUrlTemplate.replace("{branch}", branch.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase())
        : project.stagingUrl;
      const [battle] = await db
        .insert(adversarialBattles)
        .values({
          projectId: project.id,
          battleMode: docsChanged ? "readme_lie_audit" : "pr_gate",
          state: "EXPLORE",
          branch,
          baseBranch: pr.base.ref,
          prNumber: pr.number,
          commitSha: sha,
          targetUrl,
          targets: ["desktop_web"],
        })
        .returning();
      await logBattle(
        battle.id,
        "system",
        `PR #${pr.number} (${branch} @ ${sha.slice(0, 7)}) received.${reconciled ? ` ${reconciled.doc} re-ingested: ${reconciled.unverified} unverified and ${reconciled.stale} stale claim(s) of ${reconciled.total}.` : ""}`,
      );
      const runs = await triggerRuns(
        {
          projectId: project.id,
          battleId: battle.id,
          role: "before",
          trigger: "github_webhook",
          name: `PR #${pr.number} smoke suite`,
          surface: "testrun",
          tags: "smoke",
          parallel: 4,
          targets: ["desktop_web"],
          targetUrl,
          commitSha: sha,
          repoRef: sha,
          assurance: docsChanged,
          deployWaitS: cfg().deployWaitS,
        },
        appUrl,
      );
      await logBattle(battle.id, "referee", `Kane CLI smoke suite dispatched against ${targetUrl}.`);
      return Response.json({ battleId: battle.id, runIds: runs.map((r) => r.id), docsChanged }, { status: 202 });
    }

    if (event === "push" && payload.ref === `refs/heads/${project.defaultBranch}`) {
      const files: string[] = [...new Set<string>((payload.commits || []).flatMap((c: { added?: string[]; modified?: string[] }) => [...(c.added || []), ...(c.modified || [])]))];
      if (!files.some((f) => DOC.test(f))) return Response.json({ ignored: "No PRD or README change." }, { status: 202 });
      const reconciled = await reconcileDocs(project, files, payload.after);
      const runs = await triggerRuns(
        { projectId: project.id, trigger: "github_webhook", name: `Docs drift audit @ ${String(payload.after).slice(0, 7)}`, surface: "testrun", tags: "smoke", parallel: 4, targets: ["desktop_web"], commitSha: payload.after, repoRef: payload.after, assurance: true },
        appUrl,
      );
      return Response.json({ reconciled, runIds: runs.map((r) => r.id) }, { status: 202 });
    }
    return Response.json({ ignored: `Event ${event} is not handled.` }, { status: 202 });
  });
