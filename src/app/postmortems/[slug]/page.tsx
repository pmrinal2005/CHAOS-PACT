import { ensureSchema } from "@/db/bootstrap";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { db } from "@/db";
import { publishedPostmortems } from "@/db/schema";
import { receiptFor } from "@/lib/receipt";
import { shortId } from "@/lib/types";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  await ensureSchema();
  const [post] = await db
    .select()
    .from(publishedPostmortems)
    .where(eq(publishedPostmortems.slug, slug));
  return post;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await load((await params).slug);
  return post
    ? {
        title: `${post.title} | CHAOS-PACT`,
        description: post.summaryTldr,
        openGraph: {
          title: post.title,
          description: post.summaryTldr,
          images: post.afterScreenshotUrl ? [post.afterScreenshotUrl] : [],
        },
      }
    : { title: "Post-mortem not found | CHAOS-PACT" };
}

export default async function PostmortemPage({ params }: Props) {
  const post = await load((await params).slug);
  if (!post) notFound();
  const receipt = await receiptFor(post.battleId);
  const verified =
    post.status === "published" && !!post.selfVerifiedRunId && receipt?.valid;
  return (
    <main className="public-article">
      <Link href="/postmortems" className="public-back">
        CHAOS-PACT / Post-Mortems
      </Link>
      <h1>{post.title}</h1>
      <p className="public-lede">{post.summaryTldr}</p>
      <div className="public-badges">
        <span className={verified ? "ok" : "pending"}>
          {verified
            ? "Self-Verified by Kane CLI"
            : "Self-verification pending"}
          {post.selfVerifiedRunId
            ? ` · ${shortId("RUN", post.selfVerifiedRunId)}`
            : ""}
        </span>
        <span className={receipt?.valid ? "ok" : "bad"}>
          {receipt?.valid
            ? "HMAC receipt valid"
            : receipt?.signed
              ? "HMAC receipt INVALID"
              : "No HMAC receipt"}
        </span>
        {post.publishedAt && (
          <span>
            {post.publishedAt.toISOString().slice(0, 16).replace("T", " ")} UTC
          </span>
        )}
      </div>
      {(post.beforeScreenshotUrl || post.afterScreenshotUrl) && (
        <div className="public-shots">
          {post.beforeScreenshotUrl && (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.beforeScreenshotUrl}
                alt="Failing step captured by Kane CLI"
              />
              <figcaption>Before: failing step</figcaption>
            </figure>
          )}
          {post.afterScreenshotUrl && (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.afterScreenshotUrl}
                alt="Final step captured by Kane CLI"
              />
              <figcaption>After: re-verified</figcaption>
            </figure>
          )}
        </div>
      )}
      <article className="prose public-prose">
        <ReactMarkdown>{post.markdownBody}</ReactMarkdown>
      </article>
      <section className="public-receipt">
        <h2>Verification receipt</h2>
        <code>{receipt?.signature || "unsigned"}</code>
        <p>
          Recompute it yourself:{" "}
          <a href={`/api/receipt/${post.battleId}`}>
            /api/receipt/{post.battleId}
          </a>
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/receipt/${post.battleId}?format=svg`}
          alt="Kane CLI verification badge"
          height={20}
        />
      </section>
    </main>
  );
}
