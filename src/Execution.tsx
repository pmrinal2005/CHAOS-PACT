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
  Pause,
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
import { EvidenceVault, EvidenceViewer, savePack } from "./Evidence";
import {
  Accord,
  BrowserPreview,
  Dot,
  Empty,
  IconButton,
  Modal,
  PageHead,
  PanelHeading,
  RunTable,
  Tabs,
  Tag,
  statusColor,
} from "./ui";
import {
  duration,
  parseRequirements,
  time,
  useWorkspace,
  type Run,
} from "./workspace";

export function ProjectSettings() {
  const { project, patchProject, toast } = useWorkspace();
  const [name, setName] = useState(project.name);
  const [branch, setBranch] = useState(project.branch);
  const [staging, setStaging] = useState(project.staging);
  const [production, setProduction] = useState(project.production);
  return (
    <form
      className="settings-form form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        patchProject({
          name: name.trim(),
          branch: branch.trim(),
          staging,
          production,
        });
        toast("Project configuration saved");
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
    toast,
  } = useWorkspace();
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
        (filter === "review" ? r.review : r.status === filter)) &&
      `${r.id} ${r.name} ${r.platform}`
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
    const claims = parseRequirements(text);
    if (!claims.length) {
      setError("The document is empty. Add a requirement and try again.");
      return;
    }
    const requirements = claims.length;
    patchProject({ spec: file.name, requirements, claims, covered: 0 });
    setSync(false);
    toast(`Specification synced: ${requirements} requirements indexed`);
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
        <Tag>
          <Dot />
          Staging configured
        </Tag>
        <Tag>
          <Dot />
          Production configured
        </Tag>
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
                <span>Replay battles</span>
              </button>
              <button onClick={() => switchTab("Coverage")}>
                <Waypoints />
                <strong>
                  {(
                    (project.covered / Math.max(1, project.requirements)) *
                    100
                  ).toFixed(1)}
                  %
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
                <span className="mono muted">{b.id}</span>
                <strong>{b.scenario}</strong>
                <Tag color={b.step === 5 ? "green" : "cyan"}>
                  {b.step === 5 ? "Resolved" : "In progress"}
                </Tag>
                <ChevronRight size={14} />
              </button>
            ))}
            {!projectBattles.length && (
              <Empty
                title="No battles yet"
                description="Open the arena to launch a local scenario."
              />
            )}
          </>
        )}
        {active === "Coverage" && (
          <div className="coverage-summary">
            <Waypoints size={34} className="gold" />
            <h2>
              {project.covered} of {project.requirements} requirements covered
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
              Replace {project.spec} with a new Markdown specification. List
              items are indexed as requirements.
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
const events = [
  ["stream_start", "Sandbox worker connected."],
  ["step_start", "Opening the storefront fixture."],
  ["step_done", "Product detail view is ready."],
  ["assertion", "Network response matches the expected schema."],
  ["step_start", "Adding Arc One to the cart."],
  ["step_done", "Cart state persisted successfully."],
  ["bifurcation", "Kane checkpoint: validating checkout state."],
  ["assertion", "All six DevTools domains evaluated."],
  ["terminal", "Evidence pack sealed. Execution complete."],
];
function sharedRun(raw?: string): Run | undefined {
  if (!raw) return;
  try {
    const r = JSON.parse(raw);
    if (
      ["id", "project", "name", "platform", "surface", "sha"].every(
        (k) => typeof r[k] === "string",
      ) &&
      ["passed", "failed", "healed", "running"].includes(r.status) &&
      ["at", "duration", "credits"].every((k) => Number.isFinite(r[k]))
    )
      return r;
  } catch {
    return;
  }
}
export function RunTheater() {
  const {
    runs,
    query,
    projectRuns,
    go,
    startRun,
    copy,
    toast,
    setRuns,
    setBattles,
    project,
  } = useWorkspace();
  const run =
    sharedRun(query.replay) ||
    runs.find((r) => r.id === query.id) ||
    (!query.id ? projectRuns[0] : undefined);
  const [tab, setTab] = useState("NDJSON stream");
  const [count, setCount] = useState(
    run?.status === "running" ? 1 : events.length,
  );
  const [playing, setPlaying] = useState(run?.status === "running");
  const [view, setView] = useState(false);
  const [share, setShare] = useState(false);
  const terminal = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setCount(run?.status === "running" ? 1 : events.length);
    setPlaying(run?.status === "running");
  }, [run?.id]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(
      () => setCount((c) => Math.min(c + 1, events.length)),
      900,
    );
    return () => clearInterval(t);
  }, [playing]);
  useEffect(() => {
    if (count >= events.length) setPlaying(false);
    if (playing)
      terminal.current?.scrollTo({
        top: terminal.current.scrollHeight,
        behavior: "smooth",
      });
  }, [count, playing]);
  if (!run)
    return (
      <Empty
        title="Run not found"
        description="This replay is not in the workspace. Open a run from Project history."
      />
    );
  const replay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (count >= events.length) setCount(1);
    setPlaying(true);
  };
  const link = `${location.origin}${location.pathname}#/theater?${new URLSearchParams({ id: run.id, replay: JSON.stringify({ ...run, status: run.status === "running" ? "passed" : run.status }) })}`;
  const sendHealer = () => {
    const id = `BTL-${Date.now().toString().slice(-6)}`;
    setBattles((old) => [
      {
        id,
        project: project.id,
        scenario: run.name,
        step: 3,
        attempts: 1,
        at: Date.now(),
        run: run.id,
      },
      ...old,
    ]);
    go("arena", { id });
    toast("Opened a local healing replay for this verdict");
  };
  return (
    <>
      <PageHead
        eyebrow={`EXECUTION THEATER / ${run.id}`}
        title={run.name}
        description={`${run.platform}  /  ${run.surface}  /  replay sandbox`}
        action={
          <Tag color={statusColor(run.status)}>
            <Dot color={statusColor(run.status)} />
            {run.status.toUpperCase()}
          </Tag>
        }
      />
      <div className="page-content theater-content">
        <div className="theater-grid">
          <section className="panel terminal-panel">
            <div className="terminal-tabs">
              <Tabs
                items={["NDJSON stream", "Browser mirror"]}
                active={tab}
                onChange={setTab}
              />
              <IconButton
                icon={playing ? Pause : Play}
                label={playing ? "Pause replay" : "Play replay"}
                onClick={replay}
              />
            </div>
            {tab === "NDJSON stream" ? (
              <div className="event-stream" ref={terminal}>
                <div className="terminal-banner">
                  <Terminal size={16} />
                  <span>
                    chaos-pact <b>/ execute</b>
                  </span>
                </div>
                {events.slice(0, count).map(([type, msg], i) => (
                  <div className="event-row" key={i}>
                    <span className="event-time">
                      {time(run.at)}:{String(i * 3).padStart(2, "0")}
                    </span>
                    <div>
                      <small
                        className={
                          type === "bifurcation"
                            ? "cyan"
                            : type === "terminal"
                              ? "green"
                              : "gold"
                        }
                      >
                        <ChevronRight size={10} />
                        {type}
                      </small>
                      <p>
                        {run.status === "failed" && i === 7
                          ? "Checkout assertion failed: response status 500."
                          : msg}
                      </p>
                      {type.startsWith("step") && (
                        <Tag color={type === "step_start" ? "gold" : "green"}>
                          {type === "step_start" ? "running" : "done"}
                        </Tag>
                      )}
                    </div>
                  </div>
                ))}
                <span className="terminal-cursor" />
              </div>
            ) : (
              <div className="browser-mirror">
                <span className="eyebrow muted">
                  CAPTURED BROWSER FRAME / {Math.min(5, Math.ceil(count / 2))}
                </span>
                <BrowserPreview
                  step={Math.min(4, Math.floor(count / 2))}
                  annotation
                />
                <button className="btn secondary compact" onClick={replay}>
                  {playing ? <Pause size={12} /> : <Rewind size={12} />}{" "}
                  {playing ? "Pause flipbook" : "Replay browser frames"}
                </button>
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
                <b>{run.platform}</b>
              </div>
              <div className="kv-row">
                <span>Commit SHA</span>
                <button
                  className="inline-icon mono"
                  onClick={() => copy(run.sha, "Commit SHA")}
                >
                  {run.sha}
                  <Copy size={11} />
                </button>
              </div>
              <div className="kv-row">
                <span>Start / end</span>
                <code>
                  {time(run.at)} / {time(run.at + run.duration * 1000)} UTC
                </code>
              </div>
              <div className="kv-row">
                <span>Duration</span>
                <code>{duration(run.duration)}</code>
              </div>
            </Accord>
            <Accord title="DevTools assertion scorecard" icon={ListChecks}>
              <div className="scorecard">
                {[
                  [Network, "Network", "Response validated"],
                  [Terminal, "Console", "No unhandled errors"],
                  [Activity, "Performance", "LCP within budget"],
                  [Cookie, "Cookies", "Session preserved"],
                  [Database, "Storage", "Cart state retained"],
                  [Clipboard, "Clipboard", "No unexpected writes"],
                ].map(([Icon, label, result], i) => {
                  const I = Icon as typeof Network;
                  const checked = count > i + 1;
                  const failed = run.status === "failed" && i === 0;
                  return (
                    <div
                      key={String(label)}
                      className={checked ? (failed ? "red" : "gold") : "muted"}
                    >
                      <span>
                        <I size={12} />
                        {String(label)}
                        {checked && <Check size={11} />}
                      </span>
                      <small>
                        {checked
                          ? failed
                            ? "Unexpected 500 response"
                            : String(result)
                          : "Awaiting evaluation"}
                      </small>
                    </div>
                  );
                })}
              </div>
            </Accord>
            <Accord title="Final state extraction" icon={Database} open={false}>
              {Object.entries({
                product: "arc-one",
                cart_total: "249.00",
                currency: "USD",
              }).map(([k, v]) => (
                <div className="kv-row" key={k}>
                  <code>{k}</code>
                  <button
                    className="inline-icon mono"
                    onClick={() => copy(v, k)}
                  >
                    {v}
                    <Copy size={11} />
                  </button>
                </div>
              ))}
            </Accord>
            {run.status === "failed" && (
              <div className="verdict-panel">
                <div className="eyebrow red">
                  <AlertTriangle size={12} />
                  CONFIRMED VERDICT
                </div>
                <h3>Checkout response mismatch</h3>
                <p>Result 740 / High severity / 98% confidence</p>
                <button className="btn secondary compact" onClick={sendHealer}>
                  <Sparkles size={12} />
                  Send to Blue-Team Healer
                </button>
                {run.review && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setRuns((old) =>
                        old.map((r) =>
                          r.id === run.id ? { ...r, review: false } : r,
                        ),
                      );
                      toast("Verdict reviewed");
                    }}
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
        <button className="btn secondary compact" onClick={() => savePack(run)}>
          <ArrowDownToLine size={13} />
          Download .evidence
        </button>
        <button className="btn secondary compact" onClick={() => setView(true)}>
          <Layers3 size={13} />
          Evidence viewer
        </button>
        <button
          className="btn secondary compact"
          onClick={() => startRun(run.name, run.platform, run.surface)}
        >
          <Rewind size={13} />
          Re-run spec
        </button>
        <button className="btn primary compact" onClick={() => setShare(true)}>
          <Link size={13} />
          Share replay
        </button>
      </div>
      {view && <EvidenceViewer run={run} onClose={() => setView(false)} />}{" "}
      {share && (
        <Modal
          title="Share this replay"
          eyebrow="PORTABLE SANDBOX REPLAY"
          onClose={() => setShare(false)}
        >
          <div className="modal-body form-stack">
            <p className="description">
              This link includes a snapshot of the run. Anyone with the link can
              inspect its sandbox replay without your local workspace.
            </p>
            <label className="field">
              Replay URL
              <input readOnly value={link} onFocus={(e) => e.target.select()} />
            </label>
            <button
              className="btn primary self-start"
              onClick={() => copy(link, "Replay link")}
            >
              <Copy size={13} />
              Copy replay link
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
