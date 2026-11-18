import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { handle, isHttpUrl, need } from "@/lib/config";
import { coveragePct, syncRequirements } from "@/lib/requirements";
import { toProject } from "@/lib/serialize";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const PATCH = (req: Request, { params }: Ctx) =>
  handle(async () => {
    const { id } = await params;
    const b = await req.json();
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    need(project, 404, "Project not found.");
    const set: Partial<typeof projects.$inferInsert> = {};
    if (typeof b.name === "string" && b.name.trim()) set.name = b.name.trim().slice(0, 80);
    if (typeof b.branch === "string" && b.branch.trim()) set.defaultBranch = b.branch.trim();
    for (const [key, col] of [["staging", "stagingUrl"], ["production", "prodUrl"]] as const)
      if (b[key] !== undefined) {
        need(isHttpUrl(b[key]), 400, `${key} must be a valid http(s) URL.`);
        set[col] = b[key];
      }
    if (typeof b.previewUrlTemplate === "string") set.previewUrlTemplate = b.previewUrlTemplate.trim() || null;
    if (b.mode === "live_cloud" || b.mode === "judge_instant_replay") set.executionMode = b.mode;
    if (typeof b.archived === "boolean") set.archived = b.archived;
    if (typeof b.prdMarkdown === "string") {
      need(b.prdMarkdown.trim(), 400, "The specification is empty.");
      const requirements = syncRequirements(project.requirementsJson, b.prdMarkdown.slice(0, 2_000_000));
      set.prdMarkdown = b.prdMarkdown.slice(0, 2_000_000);
      set.specFilename = String(b.specFilename || project.specFilename || "PRD.md").slice(0, 120);
      set.requirementsJson = requirements;
      set.assuranceCoveragePct = coveragePct(requirements);
    }
    need(Object.keys(set).length, 400, "Nothing to update.");
    const [row] = await db.update(projects).set(set).where(eq(projects.id, id)).returning();
    return Response.json({ project: toProject(row) });
  });

export const DELETE = (_req: Request, { params }: Ctx) =>
  handle(async () => {
    const { id } = await params;
    const rows = await db.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id });
    need(rows.length, 404, "Project not found.");
    return Response.json({ ok: true });
  });
