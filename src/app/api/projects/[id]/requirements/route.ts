import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { handle, need } from "@/lib/config";
import { draftTestmd, testmdPathFor } from "@/lib/requirements";
import { toProject } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/** Drafts a _test.md specification for one uncovered requirement. */
export const POST = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    const { id } = await params;
    const { requirementId } = await req.json();
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    need(project, 404, "Project not found.");
    const target = project.requirementsJson.find((r) => r.id === requirementId);
    need(target, 404, "Requirement not found.");
    const requirements = project.requirementsJson.map((r) =>
      r.id === requirementId
        ? { ...r, testmdPath: testmdPathFor(r), testmd: draftTestmd(r, project.stagingUrl) }
        : r,
    );
    const [row] = await db.update(projects).set({ requirementsJson: requirements }).where(eq(projects.id, id)).returning();
    return Response.json({ project: toProject(row) });
  });
