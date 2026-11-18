import {
  ArrowRight,
  Bold,
  Check,
  GripVertical,
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
import { BrowserPreview, Empty, Modal, PageHead, Tag } from "./ui";
import { useStored, useWorkspace } from "./workspace";

type Article = {
  id: string;
  project: string;
  title: string;
  body: string;
  run: string;
  verified: boolean;
  published: boolean;
};
const initial: Article[] = [
  {
    id: "pm-01",
    project: "nexus",
    title: "The silent checkout failure",
    body: "## What happened\nA checkout response returned an unexpected status while the interface continued to show success.\n\n## Evidence\nThe sealed replay captured the response mismatch during the payment confirmation step.\n\n## Resolution\nThe state transition now waits for the expected checkout response.",
    run: "RUN-0123",
    verified: false,
    published: false,
  },
  {
    id: "pm-02",
    project: "nexus",
    title: "When a mobile CTA disappears",
    body: "## What happened\nA narrow viewport obscured the primary checkout action.\n\n## Resolution\nThe responsive layout was verified at the supported mobile viewport sizes.",
    run: "RUN-0120",
    verified: true,
    published: false,
  },
  {
    id: "pm-03",
    project: "nexus",
    title: "Restoring session continuity",
    body: "## Summary\nA session state regression interrupted returning customers. The replay confirmed a successful recovery.\n\n## Verification\nCookie persistence and checkout state both passed their final assertions.",
    run: "RUN-0114",
    verified: true,
    published: true,
  },
];
function Comparison() {
  const [at, setAt] = useState(45);
  return (
    <div className="comparison">
      <div className="comparison-base">
        <BrowserPreview step={4} small />
      </div>
      <div
        className="comparison-before"
        style={{ clipPath: `inset(0 ${100 - at}% 0 0)` }}
      >
        <BrowserPreview step={3} small annotation />
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
  const { project, projectRuns, toast } = useWorkspace();
  const [articles, setArticles] = useStored<Article[]>("post-mortems", initial);
  const mine = articles.filter((a) => a.project === project.id);
  const [edit, setEdit] = useState<Article | null>(null);
  const [reading, setReading] = useState<Article | null>(null);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const open = (a: Article) => {
    setEdit({ ...a });
    setError("");
  };
  const save = (a: Article) =>
    setArticles((old) => [...old.filter((x) => x.id !== a.id), a]);
  const publish = (a: Article) => {
    if (!a.verified) {
      toast("Self-verification is required before publishing");
      return;
    }
    save({ ...a, published: true });
    setEdit(null);
    toast("Post-mortem published to the local library");
  };
  const verify = () => {
    if (!edit) return;
    const checks = [
      edit.title.trim().length >= 5,
      edit.body.trim().length >= 60,
      projectRuns.some((r) => r.id === edit.run && r.status !== "running"),
    ];
    if (checks.includes(false)) {
      setError(
        "A title (5+ characters), an analysis (60+ characters), and a sealed evidence pack are required.",
      );
      return;
    }
    const a = { ...edit, verified: true };
    setEdit(a);
    save(a);
    setError("");
    toast(
      "Self-verification passed: title, analysis, and sealed evidence checked",
    );
  };
  const update = (key: "title" | "body" | "run", value: string) =>
    setEdit((a) =>
      a ? { ...a, [key]: value, verified: false, published: false } : null,
    );
  const format = (left: string, right = "") => {
    if (!edit) return;
    const e = textarea.current;
    const s = e?.selectionStart ?? edit.body.length;
    const end = e?.selectionEnd ?? s;
    update(
      "body",
      edit.body.slice(0, s) +
        left +
        edit.body.slice(s, end) +
        right +
        edit.body.slice(end),
    );
    setTimeout(() => {
      e?.focus();
      e?.setSelectionRange(s + left.length, end + left.length);
    }, 0);
  };
  return (
    <>
      <PageHead
        eyebrow="INTERNAL PUBLISHING"
        title="Post-Mortems"
        description="Turn verified incidents into evidence-backed engineering notes."
        action={
          <button
            className="btn primary"
            onClick={() =>
              open({
                id: `pm-${Date.now()}`,
                project: project.id,
                title: "",
                body: "## What happened\n\n\n## Resolution\n",
                run: projectRuns[0]?.id || "",
                verified: false,
                published: false,
              })
            }
          >
            <Plus size={14} />
            New draft
          </button>
        }
      />
      <div className="page-content">
        <div className="kanban">
          {[false, true].map((published) => (
            <section
              className={`kanban-column ${published && drag ? "drop-target" : ""}`}
              key={String(published)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const a = articles.find(
                  (a) => a.id === e.dataTransfer.getData("text/plain"),
                );
                if (a) {
                  if (published) publish(a);
                  else {
                    save({ ...a, published: false });
                    toast("Article moved to drafts");
                  }
                }
                setDrag("");
              }}
            >
              <div className="kanban-heading">
                <span className={`dot ${published ? "green" : "gold"}`} />
                <h2>
                  {published ? "Published & live" : "Awaiting verification"}
                </h2>
                <span className="count-badge">
                  {mine.filter((a) => a.published === published).length}
                </span>
              </div>
              <p>
                {published
                  ? "Verified notes in your workspace library."
                  : "Drafts must pass self-verification to publish."}
              </p>
              {mine
                .filter((a) => a.published === published)
                .map((a) => (
                  <article
                    className="article-tile"
                    key={a.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", a.id);
                      setDrag(a.id);
                    }}
                    onDragEnd={() => setDrag("")}
                  >
                    <div className="article-eyebrow">
                      <Tag color={a.verified ? "green" : "gold"}>
                        {a.verified ? "Verified" : "Draft"}
                      </Tag>
                      <GripVertical size={13} />
                    </div>
                    <button
                      className="article-title"
                      onClick={() => (published ? setReading(a) : open(a))}
                    >
                      {a.title}
                    </button>
                    <p>
                      {
                        a.body
                          .split("\n")
                          .filter((l) => l && !l.startsWith("#"))[0]
                      }
                    </p>
                    <div className="article-footer">
                      <span>
                        <Layers3 size={12} />
                        {a.run || "No evidence"}
                      </span>
                      <button className="text-button" onClick={() => open(a)}>
                        <Pencil size={12} />
                        Edit
                      </button>
                    </div>
                  </article>
                ))}
              {!mine.some((a) => a.published === published) && (
                <Empty
                  title={published ? "No published notes" : "No drafts yet"}
                  description={
                    published
                      ? "Verify a draft, then publish it here."
                      : "Create a draft to document an incident."
                  }
                />
              )}
            </section>
          ))}
        </div>
      </div>
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
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="Give this incident a title"
                />
              </label>
              <label className="field">
                Sealed evidence
                <select
                  value={edit.run}
                  onChange={(e) => update("run", e.target.value)}
                >
                  <option value="">Select a run</option>
                  {projectRuns
                    .filter((r) => r.status !== "running")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id} / {r.name}
                      </option>
                    ))}
                </select>
              </label>
              <div className="markdown-tools">
                {[
                  [Heading, "Heading", "\n## ", ""],
                  [Bold, "Bold", "**", "**"],
                  [Italic, "Italic", "*", "*"],
                  [List, "List", "\n- ", ""],
                ].map(([Icon, l, a, b]) => {
                  const I = Icon as typeof Heading;
                  return (
                    <button
                      key={String(l)}
                      aria-label={`Format ${l}`}
                      title={String(l)}
                      onClick={() => format(String(a), String(b))}
                    >
                      <I size={14} />
                    </button>
                  );
                })}
                <span>MARKDOWN</span>
              </div>
              <textarea
                ref={textarea}
                aria-label="Article Markdown"
                value={edit.body}
                onChange={(e) => update("body", e.target.value)}
              />
            </div>
            <div className="editor-preview">
              <div className="micro-label">LIVE PREVIEW</div>
              <h2>{edit.title || "Untitled post-mortem"}</h2>
              <Tag color={edit.verified ? "green" : "muted"}>
                <ShieldCheck size={11} />
                {edit.verified ? "Self-verified" : "HMAC preview"}
              </Tag>
              <div className="prose">
                <ReactMarkdown>{edit.body}</ReactMarkdown>
              </div>
              <Comparison />
            </div>
          </div>
          {error && <p className="editor-error error-message">{error}</p>}
          <div className="modal-footer">
            <button
              className="btn secondary"
              disabled={!edit.title.trim()}
              onClick={() => {
                save(edit);
                setEdit(null);
                toast("Draft saved");
              }}
            >
              <Save size={13} />
              Save draft
            </button>
            <div className="inline-icon">
              {edit.verified ? (
                <button className="btn primary" onClick={() => publish(edit)}>
                  Publish article
                  <ArrowRight size={13} />
                </button>
              ) : (
                <button className="btn primary" onClick={verify}>
                  <ShieldCheck size={13} />
                  Self-verify
                </button>
              )}
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
            <Tag color="green">
              <Check size={11} />
              Verified evidence / {reading.run}
            </Tag>
            <div className="prose">
              <ReactMarkdown>{reading.body}</ReactMarkdown>
            </div>
            <Comparison />
          </div>
        </Modal>
      )}
    </>
  );
}
