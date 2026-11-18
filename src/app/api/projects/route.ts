import { db } from "@/db";
import { projects } from "@/db/schema";
import { handle, isHttpUrl, need } from "@/lib/config";
import { parseRepo } from "@/lib/integrations";
import { coveragePct, syncRequirements } from "@/lib/requirements";
import { toProject } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export const POST = (req: Request) =>
  handle(async () => {
    const b = await req.json();
    const repo = parseRepo(String(b.repoUrl || ""));
    need(repo, 400, "Enter a GitHub repository as owner/name or a github.com URL.");
    need(isHttpUrl(b.stagingUrl) && isHttpUrl(b.prodUrl), 400, "Staging and production must be valid http(s) URLs.");
    const markdown = typeof b.prdMarkdown === "string" ? b.prdMarkdown.slice(0, 2_000_000) : "";
    const requirements = markdown ? syncRequirements([], markdown) : [];
    const [row] = await db
      .insert(projects)
      .values({
        name: String(b.name || repo!.repo).trim().slice(0, 80),
        repoUrl: `https://github.com/${repo!.full}`,
        defaultBranch: String(b.defaultBranch || "main").trim() || "main",
        stagingUrl: b.stagingUrl,
        prodUrl: b.prodUrl,
        prdMarkdown: markdown || null,
        specFilename: markdown ? String(b.specFilename || "PRD.md").slice(0, 120) : null,
        requirementsJson: requirements,
        assuranceCoveragePct: coveragePct(requirements),
        executionMode: b.executionMode === "judge_instant_replay" ? "judge_instant_replay" : "live_cloud",
      })
      .returning();
    return Response.json({ project: toProject(row) }, { status: 201 });
  });
