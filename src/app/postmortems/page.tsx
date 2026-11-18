import { ensureSchema } from "@/db/bootstrap";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { publishedPostmortems } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Post-Mortems | CHAOS-PACT" };

export default async function PostmortemIndex() {
  await ensureSchema();
  const posts = await db
    .select()
    .from(publishedPostmortems)
    .where(eq(publishedPostmortems.status, "published"))
    .orderBy(desc(publishedPostmortems.publishedAt));
  return (
    <main className="public-article">
      <Link href="/" className="public-back">CHAOS-PACT</Link>
      <h1>Incident &amp; Self-Heal Post-Mortems</h1>
      <p className="public-lede">Every article below was verified in a real browser by Kane CLI before it went live.</p>
      {posts.map((p) => (
        <Link className="public-card" key={p.id} href={`/postmortems/${p.slug}`}>
          <strong>{p.title}</strong>
          <span>{p.summaryTldr}</span>
          <small>{p.publishedAt?.toISOString().slice(0, 10)}</small>
        </Link>
      ))}
      {!posts.length && <p className="public-empty">No post-mortems have been published yet.</p>}
    </main>
  );
}
