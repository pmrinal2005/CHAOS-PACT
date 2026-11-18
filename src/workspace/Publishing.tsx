import {
  ArrowUpRight,
  Bold,
  Check,
  Copy,
  Heading,
  Italic,
  Layers3,
  List,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { scenarioNames, shortId } from "@/lib/types";
import { Empty, EvidenceFrame, Modal, PageHead, Tag } from "./ui";
import { api, stamp, useProject, type Postmortem } from "./workspace";

/** Before/after slider over the real failing and re-verified screenshots. */
function Comparison({ before, after }: { before: string; after: string }) {
  const [at, setAt] = useState(50);
  return (
    <div className="comparison">
      <div className="comparison-base">
        <EvidenceFrame
          small
          src={after}
          alt="Re-verified frame after the repair"
        />
      </div>
      <div
        className="comparison-before"
        style={{ clipPath: `inset(0 ${100 - at}% 0 0)` }}
      >
        <EvidenceFrame
          small
          src={before}
          alt="Failing frame before the repair"
        />
      </div>
      <div className="comparison-line" style={{ left: `${at}%` }} />
      <span className="before-label">BEFORE</span>
      <span className="after-label">AFTER</span>
      <input
        type="range"
        min="0"
        max="100"
        value={at}
        onChange={(e) => setAt(Number(e.target.value))}
        aria-label="Compare before and after evidence"
      />
    </div>
  );
}

export function Publishing() {
  const { projectBattles, postmortems, runs, act, copy, go, system, project } =
    useProject();
  const [edit, setEdit] = useState<Postmortem | null>(null);
  const [reading, setReading] = useState<Postmortem | null>(null);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  // Only a battle Kane re-verified to exit 0 after a repair can be written up.
  const eligible = projectBattles.filter(
    (b) =>
      b.mode !== "sample_replay" &&
      b.state === "REFEREE_PASS" &&
      b.attempts > 0 &&
      !postmortems.some((p) => p.battleId === b.id),
  );
  const verifyRun = (p: Postmortem) =>
    runs.find((r) => r.id === p.selfVerifiedRunId);
  const format = (left: string, right = "") => {
    if (!edit) return;
    const e = textarea.current;
    const s = e?.selectionStart ?? edit.body.length;
    const end = e?.selectionEnd ?? s;
    setEdit({
      ...edit,
      body:
        edit.body.slice(0, s) +
        left +
        edit.body.slice(s, end) +
        right +
        edit.body.slice(end),
    });
    setTimeout(() => {
      e?.focus();
      e?.setSelectionRange(s + left.length, end + left.length);
    }, 0);
  };
  const save = async () => {
    if (!edit) return false;
    if (edit.title.trim().length < 5 || edit.body.trim().length < 60) {
      setError(
        "A title (5+ characters) and an analysis (60+ characters) are required.",
      );
      return false;
    }
    setError("");
    const ok = await act(
      () =>
        api(`/api/postmortems/${edit.id}`, {
          method: "PATCH",
          json: { title: edit.title, body: edit.body },
        }),
      "Saved. Editing voids the previous verification.",
    );
    return !!ok;
  };
  const selfVerify = async (p: Postmortem) => {
    const r = await act(() =>
      api<{ status: string; error?: string }>(`/api/postmortems/${p.id}`, {
        method: "POST",
      }),
    );
    if (r)
      setError(
        r.status === "error"
          ? r.error || "Kane CLI could not be dispatched."
          : "",
      );
    return r;
  };
  return (
    <>
      <PageHead
        eyebrow="AUTONOMOUS PUBLISHING"
        title="Post-Mortems"
        description="Every healed battle becomes an evidence-backed article that Kane CLI verifies before it goes live."
        action={
          <button className="btn primary" onClick={() => setPicking(true)}>
            <Plus size={14} />
            New post-mortem
          </button>
        }
      />
      <div className="page-content">
        <div className="kanban">
          {[false, true].map((published) => {
            const list = postmortems.filter(
              (p) => (p.status === "published") === published,
            );
            return (
              <section className="kanban-column" key={String(published)}>
                <div className="kanban-heading">
                  <span className={`dot ${published ? "green" : "gold"}`} />
                  <h2>
                    {published
                      ? "Published & self-verified"
                      : "Awaiting Kane verification"}
                  </h2>
                  <span className="count-badge">{list.length}</span>
                </div>
                <p>
                  {published
                    ? "Kane CLI opened the public URL and exited 0."
                    : "Signed and drafted. Not stamped until Kane CLI passes the live page."}
                </p>
                {list.map((a) => {
                  const run = verifyRun(a);
                  return (
                    <article className="article-tile" key={a.id}>
                      <div className="article-eyebrow">
                        <Tag
                          color={
                            published
                              ? "green"
                              : run?.status === "running" ||
                                  run?.status === "queued"
                                ? "cyan"
                                : "gold"
                          }
                        >
                          {published
                            ? "Self-verified"
                            : run
                              ? `Verification ${run.display}`
                              : "Not verified"}
                        </Tag>
                        <small className="mono muted">
                          {stamp(a.publishedAt || a.createdAt)}
                        </small>
                      </div>
                      <button
                        className="article-title"
                        onClick={() =>
                          published
                            ? setReading(a)
                            : (setEdit({ ...a }), setError(""))
                        }
                      >
                        {a.title}
                      </button>
                      <p>{a.tldr}</p>
                      <div className="article-footer">
                        <span>
                          <Layers3 size={12} />
                          {shortId("BTL", a.battleId)}
                        </span>
                        <button
                          className="text-button"
                          onClick={() => (setEdit({ ...a }), setError(""))}
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                      </div>
                    </article>
                  );
                })}
                {!list.length && (
                  <Empty
                    title={
                      published
                        ? "No published post-mortems"
                        : "Nothing awaiting verification"
                    }
                    description={
                      published
                        ? "Articles land here once Kane CLI verifies the public page."
                        : "A post-mortem is drafted automatically when a battle is healed and re-verified."
                    }
                  />
                )}
              </section>
            );
          })}
        </div>
      </div>
      {picking && (
        <Modal
          title="Write up a healed battle"
          eyebrow="POST-MORTEM SOURCE"
          onClose={() => setPicking(false)}
        >
          <div className="modal-body form-stack">
            <p className="description">
              Post-mortems are compiled from a battle&apos;s recorded evidence:
              the mutation, Kane&apos;s failing verdict, the audited patch and
              the passing re-verification.
            </p>
            {!system?.hmac && (
              <p className="form-note">
                <ShieldCheck size={15} />
                HMAC_SECRET is not configured, so receipts cannot be signed and
                publishing is blocked.
              </p>
            )}
            {eligible.map((b) => (
              <button
                className="record-row"
                key={b.id}
                onClick={async () => {
                  const r = await act(
                    () =>
                      api("/api/blog/publish", { json: { battleId: b.id } }),
                    "Receipt signed. Kane CLI is verifying the article.",
                  );
                  if (r) setPicking(false);
                }}
              >
                <span className="mono muted">{b.label}</span>
                <strong>
                  {scenarioNames[b.scenario || ""] || b.mode.replace(/_/g, " ")}
                </strong>
                <Tag color="green">
                  healed in {b.attempts} attempt{b.attempts === 1 ? "" : "s"}
                </Tag>
              </button>
            ))}
            {!eligible.length && (
              <Empty
                title="No healed battles to write up"
                description="A battle qualifies once the Blue-Team patch passed the audit and Kane CLI re-verified it to exit code 0."
              />
            )}
            <button
              className="text-button self-start"
              onClick={() => go("arena")}
            >
              Open the arena <ArrowUpRight size={12} />
            </button>
          </div>
        </Modal>
      )}
      {edit && (
        <Modal
          wide
          className="article-editor"
          title={edit.title || "Untitled post-mortem"}
          eyebrow="ARTICLE EDITOR"
          onClose={() => setEdit(null)}
        >
          <div className="editor-split">
            <div className="editor-input form-stack">
              <label className="field">
                Article title
                <input
                  value={edit.title}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                />
              </label>
              <div className="markdown-tools">
                {(
                  [
                    [Heading, "Heading", "\n## ", ""],
                    [Bold, "Bold", "**", "**"],
                    [Italic, "Italic", "*", "*"],
                    [List, "List", "\n- ", ""],
                  ] as const
                ).map(([I, l, a, b]) => (
                  <button
                    key={l}
                    aria-label={`Format ${l}`}
                    title={l}
                    onClick={() => format(a, b)}
                  >
                    <I size={14} />
                  </button>
                ))}
                <span>MARKDOWN</span>
              </div>
              <textarea
                ref={textarea}
                aria-label="Article Markdown"
                value={edit.body}
                onChange={(e) => setEdit({ ...edit, body: e.target.value })}
              />
            </div>
            <div className="editor-preview">
              <div className="micro-label">LIVE PREVIEW</div>
              <h2>{edit.title || "Untitled post-mortem"}</h2>
              <Tag color={edit.status === "published" ? "green" : "muted"}>
                <ShieldCheck size={11} />
                {edit.status === "published"
                  ? "Self-verified by Kane CLI"
                  : "Awaiting self-verification"}
              </Tag>
              <div className="prose">
                <ReactMarkdown>{edit.body}</ReactMarkdown>
              </div>
              {edit.beforeShot && edit.afterShot && (
                <Comparison before={edit.beforeShot} after={edit.afterShot} />
              )}
            </div>
          </div>
          {error && <p className="editor-error error-message">{error}</p>}
          <div className="modal-footer">
            <button
              className="btn secondary"
              onClick={async () => {
                if (await save()) setEdit(null);
              }}
            >
              <Save size={13} />
              Save changes
            </button>
            <div className="inline-icon">
              <a
                className="btn secondary"
                href={`/postmortems/${edit.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                Open public page <ArrowUpRight size={13} />
              </a>
              <button
                className="btn primary"
                disabled={
                  project.id === "c0aa5000-0000-4000-8000-000000000001" ||
                  !system?.worker
                }
                title="Self-verification requires a live project and a configured worker."
                onClick={async () => {
                  const r = await selfVerify(edit);
                  if (r && r.status !== "error") setEdit(null);
                }}
              >
                <ShieldCheck size={13} />
                Self-verify with Kane CLI
              </button>
            </div>
          </div>
        </Modal>
      )}
      {reading && (
        <Modal
          wide
          title={reading.title}
          eyebrow="PUBLISHED POST-MORTEM"
          onClose={() => setReading(null)}
        >
          <div className="modal-body published-article">
            <div className="inline-icon">
              <Tag color="green">
                <Check size={11} />
                Self-verified
                {reading.selfVerifiedRunId
                  ? ` / ${shortId("RUN", reading.selfVerifiedRunId)}`
                  : ""}
              </Tag>
              <a
                className="text-button"
                href={`/postmortems/${reading.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                Public page <ArrowUpRight size={12} />
              </a>
              <a
                className="text-button"
                href={`/api/receipt/${reading.battleId}`}
                target="_blank"
                rel="noreferrer"
              >
                HMAC receipt <ArrowUpRight size={12} />
              </a>
            </div>
            <div className="prose">
              <ReactMarkdown>{reading.body}</ReactMarkdown>
            </div>
            {reading.beforeShot && reading.afterShot && (
              <Comparison
                before={reading.beforeShot}
                after={reading.afterShot}
              />
            )}
            <div className="micro-label">SHARE</div>
            <div className="share-grid">
              {Object.entries(reading.share).map(([k, v]) => (
                <div key={k}>
                  <b className="mono">{k.toUpperCase()}</b>
                  <p>{v}</p>
                  <button
                    className="text-button"
                    onClick={() => copy(v, `${k.toUpperCase()} post`)}
                  >
                    <Copy size={12} />
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
