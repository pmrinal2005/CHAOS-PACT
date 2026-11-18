import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { handle, need } from "@/lib/config";

export const dynamic = "force-dynamic";

export const POST = (req: Request) =>
  handle(async () => {
    const b = await req.json();
    const email = String(b.email || "").trim().toLowerCase();
    need(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 400, "Enter a valid email address.");
    need(String(b.name || "").trim(), 400, "Enter a name.");
    const rows = await db
      .insert(teamMembers)
      .values({ name: String(b.name).trim().slice(0, 80), email, role: ["Owner", "Engineer", "Viewer"].includes(b.role) ? b.role : "Engineer" })
      .onConflictDoNothing()
      .returning();
    need(rows.length, 409, "That email is already on the team.");
    return Response.json({ ok: true }, { status: 201 });
  });

export const DELETE = (req: Request) =>
  handle(async () => {
    const id = new URL(req.url).searchParams.get("id") || "";
    need(/^[0-9a-f-]{36}$/i.test(id), 400, "id is required.");
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
    return Response.json({ ok: true });
  });
