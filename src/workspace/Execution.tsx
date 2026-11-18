import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  CheckCheck,
  ChevronRight,
  Clipboard,
  Clock3,
  Cookie,
  Copy,
  Database,
  Github,
  Layers3,
  Link,
  ListChecks,
  MoreHorizontal,
  Network,
  Play,
  RefreshCw,
  Rewind,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Upload,
  Waypoints,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { platformNames, scenarioNames, type EventDTO } from "@/lib/types";
import {
  EvidenceVault,
  EvidenceViewer,
  completedSteps,
  packName,
  shotFor,
  type RunDetail,
} from "./Evidence";
import {
  Accord,
  Dot,
  Empty,
  EvidenceFrame,
  IconButton,
  Modal,
  PageHead,
  PanelHeading,
  RunTable,
  Tabs,
  Tag,
  isMobile,
  statusColor,
} from "./ui";
import {
  api,
  battleBlocked,
  duration,
  errorText,
  runActive,
  stageIndex,
  stamp,
  stateLabel,
  time,
  useProject,
  useWorkspace,
} from "./workspace";

export function ProjectSettings() {
  const { project, patchProject } = useProject();
  const [template, setTemplate] = useState(project.previewUrlTemplate);
  const [name, setName] = useState(project.name);
  const [branch, setBranch] = useState(project.branch);
  const [staging, setStaging] = useState(project.staging);
  const [production, setProduction] = useState(project.production);
  return (
    <form
      className="settings-form form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        patchProject(
          { name: name.trim(), branch: branch.trim(), staging, production, previewUrlTemplate: template },
          "Project configuration saved",
        );
      }}
    >
      <h3>Project configuration</h3>
      <p className="description">
        Repository targets and defaults for this workspace.
      </p>
      <div className="form-columns">
        <label className="field">
          Project name
          <input
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field">
          Default branch
          <input
            value={branch}
            required
            onChange={(e) => setBranch(e.target.value)}
          />
        </label>
      </div>
      <label className="field">
        Staging URL
        <input
          type="url"
          required
          value={staging}
          onChange={(e) => setStaging(e.target.value)}
        />
      </label>
      <label className="field">
        Production URL
        <input
          type="url"
          required
          value={production}
          onChange={(e) => setProduction(e.target.value)}
        />
      </label>
      <label className="field">
        Preview URL template (optional)
        <input
          value={template}
          placeholder="https://my-app-git-{branch}-my-team.vercel.app"
          onChange={(e) => setTemplate(e.target.value)}
        />
      </label>
      <p className="description">
        Battles and PR gates run against a branch deployment. Use {"{branch}"} where your host
        puts the branch name; without a template, runs target the staging URL.
      </p>
      <button
        className="btn primary self-start"
        disabled={!name.trim() || !branch.trim()}
      >
        <Check size={14} />
        Save configuration
      </button>
    </form>
  );
}
export function ProjectDetail() {
  const {
    project,
    projectRuns,
    projectBattles,
    query,
    setDialog,
    go,
    patchProject,
  } = useProject();
  const active = query.tab || "Overview";
  const filter = query.filter || "all";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sync, setSync] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState("");
  const filtered = projectRuns.filter(
    (r) =>
      (filter === "all" ||
        (filter === "review" ? r.review : r.display === filter)) &&
      `${r.label} ${r.name} ${r.platform} ${r.testmdPath || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  useEffect(() => setPage(0), [filter, search]);
  const switchTab = (t: string) => go("project", { tab: t });
  const syncFile = async () => {
    if (!file) return;
    if (!/\.(md|markdown)$/i.test(file.name) || file.size > 2e6) {
      setError("Use a Markdown file smaller than 2 MB.");
      return;
    }
    const text = await file.text();
    if (!text.trim()) {
      setError("The document is empty. Add a requirement and try again.");
      return;
    }
    // The server reconciles: unchanged claims keep their trust, removed ones go stale.
    const ok = await patchProject({ prdMarkdown: text, specFilename: file.name }, "Specification reconciled against the requirement store");
    if (ok) setSync(false);
  };
  return (
    <>
      <PageHead
        terrain
        eyebrow="PROJECT WORKSPACE"
        title={project.name}
        description={`${project.repo}  /  ${project.branch}`}
        action={
          <>
            <button className="btn secondary" onClick={() => setSync(true)}>
              <RefreshCw size={13} />
              Sync PRD
            </button>
            <button
              className="btn primary"
              onClick={() => setDialog("new-run")}
            >
              <Play size={12} />
              Trigger run
            </button>
            <div className="overflow-wrap">
              <IconButton
                label="Project actions"
                icon={MoreHorizontal}
                onClick={() => setMenu(!menu)}
              />
              {menu && (
                <div className="popover overflow-menu">
                  <button
                    onClick={() => go("settings", { tab: "Danger zone" })}
                  >
                    <Trash2 size={13} />
                    Archive or delete
                  </button>
                </div>
              )}
            </div>
          </>
        }
      />
      <div className="project-meta">
        <a
          className="inline-icon mono"
          href={`https://github.com/${project.repo}`}
          target="_blank"
          rel="noreferrer"
        >
          <Github size={13} />
          {project.repo}
          <ArrowUpRight size={10} />
        </a>
        <a className="inline-icon mono" href={project.staging} target="_blank" rel="noreferrer">
          staging: {project.staging.replace(/^https?:\/\//, "")}
        </a>
        <a className="inline-icon mono" href={project.production} target="_blank" rel="noreferrer">
          production: {project.production.replace(/^https?:\/\//, "")}
        </a>
      </div>
      <Tabs
        items={[
          "Overview",
          "Run history",
          "Battles",
          "Evidence",
          "Coverage",
          "Settings",
        ]}
        active={active}
        onChange={switchTab}
      />
      <div className="page-content">
        {active === "Overview" && (
          <>
            <div className="overview-lead">
              <div className="eyebrow gold">PROJECT ASSURANCE</div>
              <h2>Verification overview</h2>
              <p>
                The latest activity and assurance signals for {project.name}.
              </p>
            </div>
            <div className="overview-numbers">
              <button onClick={() => switchTab("Run history")}>
                <Terminal />
                <strong>{projectRuns.length}</strong>
                <span>Recorded runs</span>
              </button>
              <button onClick={() => switchTab("Battles")}>
                <ShieldCheck />
                <strong>{projectBattles.length}</strong>
                <span>Adversarial battles</span>
              </button>
              <button onClick={() => switchTab("Coverage")}>
                <Waypoints />
                <strong>
                  {project.coveragePct.toFixed(1)}%
                </strong>
                <span>Requirement coverage</span>
              </button>
            </div>
            <section className="panel">
              <PanelHeading
                icon={Clock3}
                action={
                  <button
                    className="text-button"
                    onClick={() => switchTab("Run history")}
                  >
                    View history <ArrowRight size={12} />
                  </button>
                }
              >
                Recent executions
              </PanelHeading>
              <RunTable runs={projectRuns.slice(0, 6)} />
            </section>
          </>
        )}
        {active === "Run history" && (
          <>
            <div className="section-title">
              <div>
                <h2>Run history</h2>
                <p>{filtered.length} matching executions</p>
              </div>
              <select
                className="control"
                aria-label="Filter runs by status"
                value={filter}
                onChange={(e) =>
                  go("project", { tab: "Run history", filter: e.target.value })
                }
              >
                {[
                  ["all", "All statuses"],
                  ["failed", "Failing runs"],
                  ["passed", "Passed"],
                  ["healed", "Healed"],
                  ["error", "Infrastructure errors"],
                  ["timeout", "Timeouts"],
                  ["review", "Pending human review"],
                ].map(([v, l]) => (
                  <option value={v} key={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <label className="search-field table-search">
              <Search size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search run IDs or specifications..."
              />
            </label>
            <section className="panel">
              <RunTable runs={filtered.slice(page * 12, (page + 1) * 12)} />
            </section>
            <div className="pagination">
              <span>
                Page {page + 1} of{" "}
                {Math.max(1, Math.ceil(filtered.length / 12))}
              </span>
              <button
                className="btn secondary compact"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
              >
                Previous
              </button>
              <button
                className="btn secondary compact"
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * 12 >= filtered.length}
              >
                Next
              </button>
            </div>
          </>
        )}
        {active === "Evidence" && <EvidenceVault embedded />}
        {active === "Settings" && <ProjectSettings />}
        {active === "Battles" && (
          <>
            <div className="section-title">
              <h2>Project battles</h2>
              <button
                className="btn secondary compact"
                onClick={() => go("arena")}
              >
                Open arena <ArrowUpRight size={12} />
              </button>
            </div>
            {projectBattles.map((b) => (
              <button
                className="record-row"
                key={b.id}
                onClick={() => go("arena", { id: b.id })}
              >
                <span className="mono muted">{b.label}</span>
                <strong>{scenarioNames[b.scenario || ""] || b.mode.replace(/_/g, " ")}</strong>
                <Tag color={battleBlocked(b) ? "red" : stageIndex(b) >= 5 ? "green" : "cyan"}>
                  {stateLabel(b)}
                </Tag>
                <ChevronRight size={14} />
              </button>
            ))}
            {!projectBattles.length && (
              <Empty
                title="No battles yet"
                description="Open the arena to unleash the saboteur, or connect the GitHub webhook to gate pull requests."
              />
            )}
          </>
        )}
        {active === "Coverage" && (
          <div className="coverage-summary">
            <Waypoints size={34} className="gold" />
            <h2>
              {project.covered} of {project.requirements.filter((r) => r.trust !== "stale").length} requirements proven
            </h2>
            <p>
              Inspect requirement relationships and generate specifications for
              uncovered claims.
            </p>
            <button className="btn primary" onClick={() => go("coverage")}>
              Open assurance map
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
      {sync && (
        <Modal
          title="Sync project specification"
          eyebrow="REQUIREMENT INGESTION"
          onClose={() => setSync(false)}
        >
          <div className="modal-body form-stack">
            <p className="description">
              {project.spec ? `Replace ${project.spec} with` : "Upload"} a Markdown PRD or README. List
              items are indexed as requirements; claims that disappear are marked stale.
            </p>
            <label className="field">
              Markdown document
              <input
                type="file"
                accept=".md,.markdown"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            {error && <p className="error-message">{error}</p>}
          </div>
          <div className="modal-footer">
            <button className="btn secondary" onClick={() => setSync(false)}>
              Cancel
            </button>
            <button className="btn primary" disabled={!file} onClick={syncFile}>
              <Upload size={13} />
              Sync specification
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
type Stream = "idle" | "live" | "replay";
const fmt = (at: number) => new Date(at).toISOString().slice(11, 19);
const brief = (e: EventDTO) => {
  if (e.remark) return e.remark;
  const rest = Object.fromEntries(Object.entries(e.payload).filter(([k]) => !["type", "v", "ts"].includes(k)));
  return JSON.stringify(rest).slice(0, 320);
};

export function RunTheater() {
  const { runs, query, projectRuns, go, startRun, copy, act, refresh } = useWorkspace();
  const id = query.id || projectRuns[0]?.id;
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [error, setError] = useState("");
  const [stream, setStream] = useState<Stream>("idle");
  const [replayKey, setReplayKey] = useState(0);
  const [tab, setTab] = useState("NDJSON stream");
  const [frame, setFrame] = useState<number | null>(null);
  const [view, setView] = useState(false);
  const [share, setShare] = useState(false);
  const terminal = useRef<HTMLDivElement>(null);
  const wantsReplay = query.replay === "1" || replayKey > 0;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let source: EventSource | null = null;
    setDetail(null);
    setEvents([]);
    setError("");
    setFrame(null);
    const finish = () => {
      source?.close();
      setStream("idle");
      api<RunDetail>(`/api/runs/${id}`).then((d) => {
        if (cancelled) return;
        setDetail(d);
        refresh();
      });
    };
    api<RunDetail>(`/api/runs/${id}`)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        const live = runActive(d.run);
        if (!live && !(wantsReplay && d.events.length)) {
          setEvents(d.events);
          return;
        }
        // Live runs tail the event table; sealed runs are re-emitted at 5x.
        setEvents(live ? d.events : []);
        setStream(live ? "live" : "replay");
        source = new EventSource(
          live ? `/api/runs/${id}/stream?after=${d.events.at(-1)?.seq ?? -1}` : `/api/runs/${id}/stream?replay=5`,
        );
        source.addEventListener("ndjson", (m) => {
          const e = JSON.parse((m as MessageEvent).data) as EventDTO;
          setEvents((old) => (old.some((x) => x.seq === e.seq) ? old : [...old, e]));
        });
        source.addEventListener("end", finish);
        source.addEventListener("fault", finish);
      })
      .catch((e) => !cancelled && setError(errorText(e)));
    return () => {
      cancelled = true;
      source?.close();
      setStream("idle");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, replayKey, query.replay]);
  useEffect(() => {
    if (stream !== "idle")
      terminal.current?.scrollTo({ top: terminal.current.scrollHeight, behavior: "smooth" });
  }, [events.length, stream]);

  if (!id)
    return (
      <Empty
        title="No runs recorded yet"
        description="Trigger a Kane CLI run to watch its NDJSON stream here."
      />
    );
  if (error) return <Empty title="Run not found" description={error} />;
  const run = detail?.run || runs.find((r) => r.id === id);
  if (!run) return <Empty title="Loading run" description="Reading the execution ledger." />;

  const evidence = detail?.evidence ?? null;
  const steps = completedSteps(events);
  const shown = frame !== null ? steps[frame] : steps.at(-1);
  const link = `${location.origin}${location.pathname}#/theater?id=${run.id}&replay=1`;
  const spec = `${run.objective || ""} ${run.testmdPath || ""}`.toLowerCase();
  const failedText = events.filter((e) => e.stepStatus === "failed").map((e) => e.remark || "").join(" ").toLowerCase();
  const net = evidence?.devtools?.network as { requests: number; status4xx: number; status5xx: number } | undefined;
  const con = evidence?.devtools?.console as { messages: number; errors: number; warnings: number } | undefined;
  const domains: [typeof Network, string, RegExp, string | null, boolean][] = [
    [Network, "Network", /network|status code|5xx|http status|request/, net ? `${net.requests} request${net.requests === 1 ? "" : "s"}, ${net.status5xx} 5xx, ${net.status4xx} 4xx` : null, !!net?.status5xx],
    [Terminal, "Console", /console|exception/, con ? `${con.errors} error${con.errors === 1 ? "" : "s"}, ${con.warnings} warning${con.warnings === 1 ? "" : "s"}` : null, !!con?.errors],
    [Activity, "Performance", /lcp|largest contentful|layout shift|\bcls\b|\binp\b|ttfb/, null, false],
    [Cookie, "Cookies", /cookie|httponly/, null, false],
    [Database, "Storage", /localstorage|local storage/, null, false],
    [Clipboard, "Clipboard", /clipboard/, null, false],
  ];
  const rerun = () =>
    startRun({
      executionMode: "live_cloud",
      name: run.name,
      objective: run.objective || undefined,
      testmdPath: run.testmdPath || undefined,
      surface: run.platform === "desktop_web" ? run.surface : undefined,
      targets: [run.platform],
      url: run.targetUrl || undefined,
      requirementId: run.requirementId || undefined,
    });
  return (
    <>
      <PageHead
        eyebrow={`EXECUTION THEATER / ${run.label}`}
        title={run.name}
        description={`${platformNames[run.platform] || run.platform}  /  kane-cli ${run.surface}  /  ${stream === "replay" ? "instant replay at 5x" : stream === "live" ? "live cloud stream" : `started ${stamp(run.at)} UTC`}`}
        action={
          <Tag color={statusColor(run.display)}>
            <Dot color={statusColor(run.display)} pulse={runActive(run)} />
            {run.display.toUpperCase()}
          </Tag>
        }
      />
      <div className="page-content theater-content">
        {(run.status === "error" || run.status === "timeout") && (
          <div className="notice-banner red" role="alert">
            <AlertTriangle size={15} />
            <span>
              <b>Exit code {run.exitCode}: {run.status === "timeout" ? "timeout or cancelled" : "auth, setup or infrastructure error"}.</b>{" "}
              {run.error} This is not a product bug, so no repair is triggered.
            </span>
          </div>
        )}
        {run.warnings.map((w, i) => (
          <div className="notice-banner" key={i}>
            <AlertTriangle size={15} />
            <span>
              <b>{String(w.code || "warning")}:</b> {String(w.message || "")}
              {Array.isArray(w.variables) &&
                ` (${(w.variables as { name: string; reason: string }[]).map((v) => `${v.name}: ${v.reason}`).join(", ")})`}
              {w.suggested_file ? ` Add them to ${String(w.suggested_file)}.` : ""}
            </span>
          </div>
        ))}
        <div className="theater-grid">
          <section className="panel terminal-panel">
            <div className="terminal-tabs">
              <Tabs items={["NDJSON stream", "Browser mirror"]} active={tab} onChange={setTab} />
              <IconButton
                icon={Rewind}
                label="Replay the recorded stream at 5x"
                disabled={stream !== "idle" || !detail?.events.length}
                onClick={() => setReplayKey((k) => k + 1)}
              />
            </div>
            {tab === "NDJSON stream" ? (
              <div className="event-stream" ref={terminal}>
                <div className="terminal-banner">
                  <Terminal size={16} />
                  <span>
                    kane-cli <b>/ {run.surface}</b>
                    {run.cliVersion ? ` / v${run.cliVersion}` : ""}
                  </span>
                </div>
                {events.map((e) => (
                  <div className="event-row" key={e.seq}>
                    <span className="event-time">{fmt(e.at)}</span>
                    <div>
                      <small
                        className={
                          e.stepStatus === "failed" || e.type === "error"
                            ? "red"
                            : e.type === "bifurcation" || e.type === "warning"
                              ? "cyan"
                              : /_end$|_done$|^done$/.test(e.type)
                                ? "green"
                                : "gold"
                        }
                      >
                        <ChevronRight size={10} />
                        {e.type === "progress" ? `step ${e.step}${e.childId ? ` / ${e.childId}` : ""}` : e.type}
                      </small>
                      <p>{brief(e)}</p>
                      {e.stepStatus && (
                        <Tag color={e.stepStatus === "failed" ? "red" : e.stepStatus === "done" ? "green" : "gold"}>
                          {e.stepStatus}
                        </Tag>
                      )}
                    </div>
                  </div>
                ))}
                {!events.length && (
                  <p className="muted small-note">
                    {runActive(run)
                      ? "Waiting for the worker to emit stream_start."
                      : run.error
                        ? "Kane CLI emitted no events for this run."
                        : "No NDJSON events were recorded."}
                  </p>
                )}
                {stream !== "idle" && <span className="terminal-cursor" />}
              </div>
            ) : (
              <div className="browser-mirror">
                <span className="eyebrow muted">
                  {shown ? `CAPTURED FRAME / STEP ${shown.n} OF ${steps.length}` : "NO CAPTURED FRAMES"}
                </span>
                <EvidenceFrame
                  src={shown ? shotFor(evidence, shown.step) : null}
                  url={run.targetUrl}
                  mobile={isMobile(run.platform)}
                  alt={shown ? `Kane CLI screenshot at step ${shown.n}: ${shown.remark}` : "No screenshot"}
                  note={
                    runActive(run)
                      ? "Screenshots arrive when Kane CLI seals the evidence pack."
                      : evidence
                        ? "No screenshot for this step in the pack"
                        : "This run has no evidence pack"
                  }
                />
                <div className="inline-icon">
                  <button className="btn secondary compact" disabled={!steps.length || (frame ?? steps.length - 1) <= 0} onClick={() => setFrame((frame ?? steps.length - 1) - 1)}>
                    Previous step
                  </button>
                  <button className="btn secondary compact" disabled={!steps.length || (frame ?? steps.length - 1) >= steps.length - 1} onClick={() => setFrame((frame ?? steps.length - 1) + 1)}>
                    Next step
                  </button>
                </div>
              </div>
            )}
          </section>
          <aside className="inspector">
            <Accord title="Run metadata" icon={Braces}>
              <div className="kv-row">
                <span>Surface</span>
                <code>{run.surface}</code>
              </div>
              <div className="kv-row">
                <span>Platform</span>
                <b>{platformNames[run.platform] || run.platform}</b>
              </div>
              <div className="kv-row">
                <span>Exit code</span>
                <code>{run.exitCode ?? "running"}{run.resultCode ? ` / result_code ${run.resultCode}` : ""}</code>
              </div>
              <div className="kv-row">
                <span>Steps</span>
                <code>{run.stepsDone} done / {run.stepsFailed} failed</code>
              </div>
              {run.sha && (
                <div className="kv-row">
                  <span>Commit SHA</span>
                  <button className="inline-icon mono" onClick={() => copy(run.sha!, "Commit SHA")}>
                    {run.sha.slice(0, 7)}
                    <Copy size={11} />
                  </button>
                </div>
              )}
              <div className="kv-row">
                <span>Start / end</span>
                <code>
                  {time(run.at)} / {run.completedAt ? time(run.completedAt) : "--:--"} UTC
                </code>
              </div>
              <div className="kv-row">
                <span>Duration / credits</span>
                <code>{run.completedAt ? duration(run.duration) : "live"} / {run.credits.toFixed(1)}</code>
              </div>
              {run.testManagerUrl && (
                <div className="kv-row">
                  <span>Test Manager</span>
                  <a className="inline-icon" href={run.testManagerUrl} target="_blank" rel="noreferrer">
                    Open <ArrowUpRight size={11} />
                  </a>
                </div>
              )}
            </Accord>
            {(run.objective || run.testmdPath) && (
              <Accord title="Objective" icon={Terminal} open={false}>
                <p className="description pre-wrap">{run.objective || run.testmdPath}</p>
              </Accord>
            )}
            <Accord title="DevTools assertion scorecard" icon={ListChecks}>
              <div className="scorecard">
                {domains.map(([I, label, pattern, captured, bad]) => {
                  const asserted = pattern.test(spec);
                  const violated = bad || (asserted && pattern.test(failedText));
                  const passed = asserted && run.status === "passed";
                  return (
                    <div key={label} className={violated ? "red" : passed ? "gold" : "muted"}>
                      <span>
                        <I size={12} />
                        {label}
                        {passed && !violated && <Check size={11} />}
                      </span>
                      <small>
                        {violated
                          ? `Violation recorded${captured ? `: ${captured}` : ""}`
                          : !asserted
                            ? captured || "Not asserted in this spec"
                            : passed
                              ? captured || "Asserted, passed"
                              : runActive(run)
                                ? "Asserted, awaiting verdict"
                                : captured || "Asserted"}
                      </small>
                    </div>
                  );
                })}
              </div>
            </Accord>
            <Accord title="Final state extraction" icon={Database} open={!!run.finalState && Object.keys(run.finalState).length > 0}>
              {Object.entries(run.finalState || {}).map(([k, v]) => (
                <div className="kv-row" key={k}>
                  <code>{k}</code>
                  <button className="inline-icon mono" onClick={() => copy(String(v), k)}>
                    {String(v).slice(0, 40)}
                    <Copy size={11} />
                  </button>
                </div>
              ))}
              {!Object.keys(run.finalState || {}).length && (
                <p className="description">
                  No values were stored. Kane CLI only extracts state when the objective says
                  &quot;store ... as &apos;name&apos;&quot;.
                </p>
              )}
            </Accord>
            {run.assurance && (
              <Accord title="Assurance audit" icon={ShieldCheck} open={false}>
                <pre className="diff-block">{JSON.stringify(run.assurance, null, 2)}</pre>
              </Accord>
            )}
            {run.status === "failed" && (
              <div className="verdict-panel">
                <div className="eyebrow red">
                  <AlertTriangle size={12} />
                  {run.verdict?.confirmed ? "CONFIRMED PRODUCT BUG" : "REFEREE VERDICT: FAILED"}
                </div>
                <h3>{String(run.verdict?.one_liner || run.oneLiner || run.reason || "The objective did not pass")}</h3>
                <p>
                  Exit 1{run.resultCode ? ` / result ${run.resultCode}` : ""}
                  {run.verdict?.severity ? ` / ${String(run.verdict.severity)} severity` : ""}
                  {typeof run.verdict?.confidence === "number" ? ` / ${Math.round(run.verdict.confidence * 100)}% confidence` : ""}
                  {run.verdict?.category ? ` / ${String(run.verdict.category)}` : ""}
                </p>
                {run.summary && <p>{run.summary}</p>}
                {run.battleId ? (
                  <button
                    className="btn secondary compact"
                    onClick={async () => {
                      await act(() => api("/api/agent/heal", { json: { battleId: run.battleId, failedRunId: run.id } }), "Blue-Team healer engaged");
                      go("arena", { id: run.battleId! });
                    }}
                  >
                    <Sparkles size={12} />
                    Send to Blue-Team Healer
                  </button>
                ) : (
                  <p className="small-note muted">
                    Repairs are committed to a battle branch, never the default branch. Launch a
                    battle from the Arena or gate a pull request to engage the healer.
                  </p>
                )}
                {run.review && (
                  <button
                    className="text-button"
                    onClick={() => act(() => api(`/api/runs/${run.id}`, { method: "PATCH", json: { reviewed: true } }), "Verdict reviewed")}
                  >
                    <CheckCheck size={12} />
                    Mark reviewed
                  </button>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
      <div className="theater-actions">
        {evidence?.packUrl ? (
          <a className="btn secondary compact" href={evidence.packUrl} download={packName(run)}>
            <ArrowDownToLine size={13} />
            Download .evidence
          </a>
        ) : (
          <button className="btn secondary compact" disabled title={evidence ? "The worker has no storage bucket, so the sealed pack was not uploaded." : "This run has no evidence pack."}>
            <ArrowDownToLine size={13} />
            Download .evidence
          </button>
        )}
        <button className="btn secondary compact" disabled={!evidence} onClick={() => setView(true)}>
          <Layers3 size={13} />
          Evidence viewer
        </button>
        <button className="btn secondary compact" disabled={runActive(run) || (!run.objective && !run.testmdPath)} onClick={rerun}>
          <Play size={13} />
          Re-run live
        </button>
        <button className="btn primary compact" onClick={() => setShare(true)}>
          <Link size={13} />
          Share replay
        </button>
      </div>
      {view && <EvidenceViewer run={run} onClose={() => setView(false)} />}
      {share && (
        <Modal title="Share this replay" eyebrow="INSTANT REPLAY LINK" onClose={() => setShare(false)}>
          <div className="modal-body form-stack">
            <p className="description">
              Anyone who can reach this workspace can open the link and watch the recorded NDJSON
              stream replay at 5x speed. No credentials or credits are needed.
            </p>
            <label className="field">
              Replay URL
              <input readOnly value={link} onFocus={(e) => e.target.select()} />
            </label>
            <button className="btn primary self-start" onClick={() => copy(link, "Replay link")}>
              <Copy size={13} />
              Copy replay link
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
