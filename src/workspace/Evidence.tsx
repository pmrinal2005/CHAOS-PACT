import {
  ArrowDownToLine,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Cookie,
  Filter,
  LockKeyhole,
  Monitor,
  Network,
  Search,
  Smartphone,
  Terminal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { platformNames, type EventDTO, type EvidenceDTO } from "@/lib/types";
import {
  Empty,
  EvidenceFrame,
  IconButton,
  Modal,
  PageHead,
  Tabs,
  Tag,
  isMobile,
  statusColor,
} from "./ui";
import { api, errorText, stamp, useProject, useWorkspace, type Run } from "./workspace";

export type RunDetail = { run: Run; events: EventDTO[]; evidence: EvidenceDTO | null };

/** Loads one run with its recorded NDJSON events and unpacked evidence. */
export function useRunDetail(id?: string, version = 0) {
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setDetail(null);
    setError("");
    api<RunDetail>(`/api/runs/${id}`)
      .then((d) => !cancelled && setDetail(d))
      .catch((e) => !cancelled && setError(errorText(e)));
    return () => {
      cancelled = true;
    };
  }, [id, version]);
  return { detail, error };
}

/** Completed steps, counted from done/failed transitions (never the step index). */
export function completedSteps(events: EventDTO[]) {
  return events
    .filter((e) => e.stepStatus === "done" || e.stepStatus === "failed")
    .map((e, i) => ({ n: i + 1, step: e.step ?? i + 1, remark: e.remark || "", failed: e.stepStatus === "failed" }));
}
export function shotFor(evidence: EvidenceDTO | null, step: number) {
  const shots = evidence?.screenshots.filter((s) => s.step === step) || [];
  return (shots.find((s) => s.annotated) || shots[0])?.url || null;
}
export const packName = (run: Run) => `${run.label.toLowerCase()}.evidence`;

export function EvidenceViewer({ run, onClose }: { run: Run; onClose: () => void }) {
  const { detail, error } = useRunDetail(run.id);
  const { copy } = useWorkspace();
  const [index, setIndex] = useState(0);
  const [tab, setTab] = useState("Network");
  const [drawer, setDrawer] = useState(true);
  const evidence = detail?.evidence ?? null;
  const recorded = completedSteps(detail?.events || []);
  // Fall back to the screenshot sequence when the stream has no step lines.
  const steps = recorded.length
    ? recorded
    : [...new Set((evidence?.screenshots || []).map((s) => s.step))].map((step, i) => ({
        n: i + 1,
        step,
        remark: `Captured frame ${step}`,
        failed: evidence?.failingStep === step,
      }));
  const current = steps[Math.min(index, steps.length - 1)];
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(steps.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [steps.length]);
  useEffect(() => {
    const failing = steps.findIndex((s) => s.failed);
    if (failing >= 0) setIndex(failing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.run.id]);

  const slice = <T extends { step?: unknown }>(rows: T[]) => {
    const mine = current ? rows.filter((r) => r.step === current.step) : [];
    return mine.length ? { rows: mine, scoped: true } : { rows, scoped: false };
  };
  const net = slice(evidence?.network || []);
  const con = slice(evidence?.console || []);
  const serve = `kane-cli evidence serve ./${packName(run)}`;
  const logs: Record<string, string> = {
    Network: net.rows.length
      ? `${net.scoped ? `step ${current?.step}` : "whole run"}  /  ${net.rows.length} request(s)\n\n${net.rows
          .map((r) => `${r.method || "GET"} ${r.url || ""}\n  status: ${r.status || "n/a"}${r.ms != null ? `\n  time: ${r.ms}ms` : ""}`)
          .join("\n\n")}`
      : "No network trace was unpacked from this pack.",
    Console: con.rows.length
      ? `${con.scoped ? `step ${current?.step}` : "whole run"}  /  ${con.rows.length} message(s)\n\n${con.rows
          .map((r) => `[${r.level || "log"}] ${r.text || ""}`)
          .join("\n")}`
      : "No console output was unpacked from this pack.",
    Failure: evidence?.failure
      ? String(evidence.failure.raw || JSON.stringify(evidence.failure, null, 2))
      : run.status === "failed"
        ? "The pack contained no failure.yaml."
        : "This run recorded no failure.",
    Pack: evidence
      ? [
          `run: ${run.label}`,
          `exit_code: ${run.exitCode}`,
          `result_code: ${run.resultCode || "none"}`,
          `sha256: ${evidence.packSha256 || "n/a"}`,
          `bytes: ${evidence.packBytes ?? "n/a"}`,
          `evidence validate exit: ${evidence.validationExitCode ?? "not run"}`,
          evidence.policyVerdict ? `policy verdict: ${JSON.stringify(evidence.policyVerdict)}` : "policy verdict: no policy gate active",
          "",
          "view locally:",
          `  ${serve}`,
        ].join("\n")
      : "",
  };
  return (
    <Modal
      wide
      className="evidence-lightbox"
      title="Evidence Viewer"
      eyebrow={`SEALED ARTIFACT / ${run.label}`}
      onClose={onClose}
    >
      <div className="viewer-summary">
        <span>
          <LockKeyhole size={12} />
          {run.name}
        </span>
        <Tag color={statusColor(run.display)}>{run.display}</Tag>
        <button className="text-button" onClick={() => setDrawer(!drawer)}>
          <Terminal size={13} />
          {drawer ? "Hide" : "Show"} inspector
        </button>
      </div>
      {error ? (
        <Empty title="Evidence could not be loaded" description={error} />
      ) : !detail ? (
        <Empty title="Loading evidence" description="Reading the unpacked pack from the database." />
      ) : !evidence ? (
        <Empty
          title="No evidence pack for this run"
          description={run.error || "Kane CLI did not seal a pack, or the worker could not locate it."}
        />
      ) : (
        <>
          <div className={`viewer-layout ${drawer ? "" : "no-drawer"}`}>
            <div className="viewer-image">
              <div className="viewer-step">
                <span className="eyebrow">{current ? `STEP ${String(current.n).padStart(2, "0")}` : "NO STEPS"}</span>
                <b className={current?.failed ? "red" : ""}>{current?.remark || "The stream recorded no step lines."}</b>
              </div>
              <EvidenceFrame
                src={current ? shotFor(evidence, current.step) : null}
                url={run.targetUrl}
                mobile={isMobile(run.platform)}
                alt={current ? `Kane CLI screenshot at step ${current.n}: ${current.remark}` : "No screenshot"}
                note={
                  evidence.devtools?.storageConfigured === false
                    ? "Screenshots were not uploaded: the worker has no storage bucket configured."
                    : "No screenshot for this step in the pack"
                }
              />
            </div>
            {drawer && (
              <aside className="log-drawer">
                <Tabs items={["Network", "Console", "Failure", "Pack"]} active={tab} onChange={setTab} />
                <pre>
                  {logs[tab].split("\n").map((l, i) => (
                    <span
                      key={i}
                      className={
                        /status: [45]\d\d|\[error|\[exception|exit: 1/.test(l)
                          ? "red"
                          : /status: [23]\d\d|exit: 0/.test(l)
                            ? "green"
                            : /^\S.*:/.test(l)
                              ? "cyan"
                              : ""
                      }
                    >
                      {l}
                      {"\n"}
                    </span>
                  ))}
                </pre>
              </aside>
            )}
          </div>
          <div className="filmstrip">
            {steps.map((s, i) => (
              <button key={s.n} className={index === i ? "selected" : ""} onClick={() => setIndex(i)}>
                <div className="film-thumb">
                  <EvidenceFrame small src={shotFor(evidence, s.step)} alt={`Step ${s.n}`} />
                </div>
                <span className={s.failed ? "red" : ""}>
                  <b>{String(s.n).padStart(2, "0")}</b>
                  {s.remark.slice(0, 40)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="modal-footer">
        <div className="inline-icon">
          <IconButton icon={ChevronLeft} label="Previous evidence step" disabled={index <= 0} onClick={() => setIndex(index - 1)} />
          <span className="mono muted">
            {steps.length ? index + 1 : 0} / {steps.length}
          </span>
          <IconButton icon={ChevronRight} label="Next evidence step" disabled={index >= steps.length - 1} onClick={() => setIndex(index + 1)} />
        </div>
        <div className="inline-icon">
          {evidence && (
            <button className="btn secondary" onClick={() => copy(serve, "Viewer command")}>
              <Terminal size={14} />
              Copy serve command
            </button>
          )}
          {evidence?.packUrl ? (
            <a className="btn secondary" href={evidence.packUrl} download={packName(run)}>
              <ArrowDownToLine size={14} />
              Download raw .evidence
            </a>
          ) : (
            <button className="btn secondary" disabled title="The worker has no storage bucket, so the sealed pack was not uploaded.">
              <ArrowDownToLine size={14} />
              Pack not uploaded
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function EvidenceVault({ embedded = false }: { embedded?: boolean }) {
  const { projectRuns, query, go, project, projects, setProjectId } = useProject();
  const [statuses, setStatuses] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [maxAge, setMaxAge] = useState(30);
  const [shown, setShown] = useState(18);
  const [filterOpen, setFilterOpen] = useState(() => window.innerWidth > 700);
  const sealed = projectRuns.filter((r) => r.hasEvidence);
  const [viewer, setViewer] = useState<Run | null>(null);
  useEffect(() => {
    setViewer(projectRuns.find((r) => r.id === query.id) || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.id, projectRuns.length]);
  const toggle = (v: string, arr: string[], set: (v: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((s) => s !== v) : [...arr, v]);
  const filtered = sealed.filter((r) => {
    const ageDays = (Date.now() - r.at) / 86400000;
    const platform = isMobile(r.platform) ? "Mobile" : "Desktop";
    return (
      (!statuses.length || statuses.includes(r.display)) &&
      (!platforms.length || platforms.includes(platform)) &&
      `${r.label} ${r.name} ${r.testmdPath || ""} ${r.display} ${r.oneLiner || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      ageDays <= maxAge
    );
  });
  const reset = () => {
    setStatuses([]);
    setPlatforms([]);
    setSearch("");
    setMaxAge(30);
  };
  return (
    <>
      {!embedded && (
        <PageHead
          eyebrow="ARTIFACT LIBRARY"
          title="Evidence Vault"
          description="Sealed Kane CLI evidence packs. Every step, accounted for."
          action={
            <Tag>
              <LockKeyhole size={11} />
              {sealed.length} sealed pack{sealed.length === 1 ? "" : "s"}
            </Tag>
          }
        />
      )}
      <div className={embedded ? "embedded-content" : "page-content"}>
        <div className="vault-toolbar">
          <label className="search-field">
            <Search size={15} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search spec paths, run IDs, or verdicts..." />
          </label>
          <button className="btn secondary compact" onClick={() => setFilterOpen(!filterOpen)}>
            <Filter size={13} />
            {filterOpen ? "Hide filters" : "Filters"}
          </button>
        </div>
        <div className={`vault-layout ${filterOpen ? "filters-visible" : "filters-hidden"}`}>
          <aside className="vault-filters">
            <div className="micro-label">FILTER ARTIFACTS</div>
            <h4>Status</h4>
            {["passed", "failed", "healed"].map((s) => (
              <label className="checkbox-row" key={s}>
                <input type="checkbox" checked={statuses.includes(s)} onChange={() => toggle(s, statuses, setStatuses)} />
                <span className={statusColor(s)}>{s}</span>
              </label>
            ))}
            <h4>Platform</h4>
            {["Desktop", "Mobile"].map((s) => (
              <label className="checkbox-row" key={s}>
                <input type="checkbox" checked={platforms.includes(s)} onChange={() => toggle(s, platforms, setPlatforms)} />
                {s}
              </label>
            ))}
            <h4>Age</h4>
            <div className="range-label">Last {maxAge} day{maxAge === 1 ? "" : "s"}</div>
            <input type="range" aria-label="Maximum evidence age in days" min="1" max="30" value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} />
            <label className="field">
              <span>Project</span>
              <select value={project.id} onChange={(e) => setProjectId(e.target.value)}>
                {projects
                  .filter((p) => !p.archived)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <button className="text-button" onClick={reset}>
              Reset filters
            </button>
          </aside>
          <section className="artifact-results">
            <div className="results-caption">
              <span>{filtered.length} artifacts</span>
              <span>
                Newest first <ArrowDownToLine size={10} />
              </span>
            </div>
            <div className="evidence-grid">
              {filtered.slice(0, shown).map((r) => (
                <button className="evidence-tile" key={r.id} onClick={() => setViewer(r)}>
                  <div className="evidence-thumb">
                    <EvidenceFrame small src={r.thumb} alt={`Final captured frame of ${r.label}`} />
                    <span className={`artifact-ribbon ${statusColor(r.display)}`}>{r.display}</span>
                  </div>
                  <div className="artifact-copy">
                    <small>
                      {r.label} <span>{stamp(r.at)} UTC</span>
                    </small>
                    <h3>{r.name}</h3>
                    <div className="artifact-foot">
                      <span>
                        {isMobile(r.platform) ? <Smartphone size={11} /> : <Monitor size={11} />}
                        {platformNames[r.platform] || r.platform}
                      </span>
                      <span>
                        <Network size={12} />
                        <Terminal size={12} />
                        <Cookie size={12} />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {!filtered.length && (
              <Empty
                title={sealed.length ? "No results found" : "No sealed evidence yet"}
                description={
                  sealed.length
                    ? "Try a different search or filter."
                    : "Packs appear here when the cloud worker completes a Kane CLI run and unpacks its .evidence archive."
                }
              />
            )}
            {filtered.length > shown && (
              <button className="load-more btn secondary" onClick={() => setShown((n) => n + 12)}>
                Load more artifacts <ArrowRight size={13} />
              </button>
            )}
          </section>
        </div>
      </div>
      {viewer && (
        <EvidenceViewer
          run={viewer}
          onClose={() => {
            setViewer(null);
            if (query.id) go("evidence");
          }}
        />
      )}
    </>
  );
}
