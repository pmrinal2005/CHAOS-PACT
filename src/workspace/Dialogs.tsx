import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Box,
  Check,
  CheckCheck,
  ChevronRight,
  CircleCheck,
  Code2,
  FileText,
  GitBranch,
  Github,
  Globe,
  Layers3,
  Play,
  Radio,
  Rewind,
  Search,
  ShieldCheck,
  Swords,
  Terminal,
  Upload,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";
import { platformNames } from "@/lib/types";
import { navigation } from "./Shell";
import { Dot, Empty, Modal, Tag } from "./ui";
import {
  api,
  errorText,
  pageNames,
  stamp,
  useProject,
  useWorkspace,
} from "./workspace";

const validUrl = (v: string) => {
  try {
    return ["https:", "http:"].includes(new URL(v).protocol);
  } catch {
    return false;
  }
};
const repoPattern =
  /^(?:https?:\/\/github\.com\/)?[\w.-]+\/[\w.-]+?(?:\.git)?\/?$/;

export function Onboarding() {
  const { setDialog, setProjectId, go, toast, refresh } = useWorkspace();
  const [step, setStep] = useState(0);
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [staging, setStaging] = useState("");
  const [production, setProduction] = useState("");
  const [file, setFile] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState("live_cloud");
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function ingest(f?: File) {
    if (!f) return;
    if (!/\.(md|markdown)$/i.test(f.name))
      return setError("Choose a Markdown (.md or .markdown) file.");
    if (f.size > 2e6)
      return setError("The specification must be smaller than 2 MB.");
    const text = await f.text();
    if (!text.trim())
      return setError("The file is empty. Add a requirement and try again.");
    setError("");
    setFile(f.name);
    setMarkdown(text);
  }
  const complete = async () => {
    setSaving(true);
    setError("");
    try {
      const { project } = await api<{
        project: { id: string; name: string; requirements: unknown[] };
      }>("/api/projects", {
        json: {
          repoUrl: repo.trim(),
          defaultBranch: branch.trim(),
          stagingUrl: staging,
          prodUrl: production,
          prdMarkdown: markdown,
          specFilename: file,
          executionMode: mode,
        },
      });
      await refresh();
      setProjectId(project.id);
      go("dashboard");
      toast(
        `${project.name} connected${project.requirements.length ? ` with ${project.requirements.length} requirements indexed` : ""}.`,
      );
    } catch (e) {
      setError(errorText(e));
    }
    setSaving(false);
  };
  const ready = [
    repoPattern.test(repo.trim()) && !!branch.trim(),
    validUrl(staging) && validUrl(production),
    true,
    !saving,
  ][step];
  return (
    <Modal
      title="Connect a project"
      eyebrow="WORKSPACE SETUP"
      wide
      onClose={() => setDialog(null)}
    >
      <div className="wizard-track">
        {[Github, Globe, FileText, Zap].map((Icon, i) => (
          <div className={`wizard-node ${step >= i ? "reached" : ""}`} key={i}>
            <span>{step > i ? <Check size={17} /> : <Icon size={17} />}</span>
            <small>
              {["Repository", "Targets", "Specification", "Starting mode"][i]}
            </small>
          </div>
        ))}
      </div>
      <div className="wizard-step">
        <span className="eyebrow muted">STEP 0{step + 1} / 04</span>
        <h3>
          {
            [
              "Connect your repository",
              "Declare your target URLs",
              "Ingest your PRD or README",
              "Choose your starting mode",
            ][step]
          }
        </h3>
        <p className="description">
          {
            [
              "The GitHub repository CHAOS-PACT guards. Chaos branches and pull-request gates run against it.",
              "The deployments Kane CLI will drive in a real browser.",
              "Optional. Each list item in the Markdown becomes a requirement to prove with a passing run.",
              "Instant replay reads this project’s existing event timelines. Live cloud sends a new verification to your configured worker.",
            ][step]
          }
        </p>
        {step === 0 && (
          <div className="form-stack">
            <label className="field">
              <span>GitHub repository</span>
              <div className="url-input">
                <Github size={14} />
                <input
                  autoFocus
                  placeholder="owner/repository"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                />
                {repoPattern.test(repo.trim()) && <Dot />}
              </div>
            </label>
            <label className="field">
              <span>Default branch</span>
              <div className="url-input">
                <GitBranch size={14} />
                <input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
              </div>
            </label>
          </div>
        )}
        {step === 1 && (
          <div className="form-stack">
            {(
              [
                [
                  "Staging",
                  staging,
                  setStaging,
                  "https://staging.your-app.com",
                ],
                [
                  "Production",
                  production,
                  setProduction,
                  "https://your-app.com",
                ],
              ] as const
            ).map(([label, value, setter, placeholder]) => (
              <label className="field" key={label}>
                <span>{label} URL</span>
                <div className="url-input">
                  <Globe size={14} />
                  <input
                    type="url"
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => setter(e.target.value)}
                  />
                  {validUrl(value) && <Dot />}
                </div>
              </label>
            ))}
            <div className="form-note">
              <ShieldCheck size={15} />
              URLs are format-checked here. Reachability is proven by the first
              Kane CLI run.
            </div>
          </div>
        )}
        {step === 2 && (
          <>
            <input
              ref={input}
              type="file"
              accept=".md,.markdown"
              hidden
              onChange={(e) => ingest(e.target.files?.[0])}
            />
            <button
              className="upload-tray"
              onClick={() => input.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                ingest(e.dataTransfer.files[0]);
              }}
            >
              {file ? (
                <CircleCheck size={29} className="green" />
              ) : (
                <Upload size={29} />
              )}
              <strong>{file || "Drop your Markdown file here"}</strong>
              <span>
                {file
                  ? "Requirements are indexed when the project is created"
                  : "or click to browse files, up to 2 MB. You can also skip this step."}
              </span>
            </button>
          </>
        )}
        {step === 3 && (
          <div className="mode-options">
            {(
              [
                [
                  "live_cloud",
                  Zap,
                  "Live Cloud execution",
                  "Dispatch real headless Chrome and cloud-grid Kane CLI runs to your worker.",
                ],
                [
                  "judge_instant_replay",
                  Rewind,
                  "Judge Instant-Replay",
                  "Re-emit the recorded NDJSON of sealed runs. Needs at least one completed live run.",
                ],
              ] as const
            ).map(([id, I, title, text]) => (
              <button
                key={id}
                className={mode === id ? "chosen" : ""}
                onClick={() => setMode(id)}
              >
                <I size={23} />
                <strong>{title}</strong>
                <p>{text}</p>
                {mode === id && <Check size={13} className="mode-check" />}
              </button>
            ))}
          </div>
        )}
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
      </div>
      <div className="modal-footer">
        <button
          className="btn secondary"
          onClick={() => (step ? setStep(step - 1) : setDialog(null))}
        >
          <ArrowLeft size={14} />
          {step ? "Back" : "Cancel"}
        </button>
        <button
          className="btn primary"
          disabled={!ready}
          onClick={() => (step === 3 ? complete() : setStep(step + 1))}
        >
          {step === 3
            ? saving
              ? "Connecting..."
              : "Enter workspace"
            : step === 2 && !file
              ? "Skip for now"
              : "Continue"}
          <ArrowRight size={14} />
        </button>
      </div>
    </Modal>
  );
}

function NewRun() {
  const {
    project,
    setDialog,
    startRun,
    projectRuns,
    system,
    credits,
    creditsKnown,
  } = useProject();
  const live = project.mode === "live_cloud";
  const sealed = projectRuns.filter(
    (r) =>
      r.completedAt && (r.stepsDone > 0 || r.stepsFailed > 0 || r.hasEvidence),
  );
  const [replayId, setReplayId] = useState(sealed[0]?.id || "");
  const [surface, setSurface] = useState("run");
  const [objective, setObjective] = useState("");
  const [testmdPath, setTestmdPath] = useState("");
  const [url, setUrl] = useState(project.staging);
  const [targets, setTargets] = useState<string[]>(["desktop_web"]);
  const [bugs, setBugs] = useState("continue");
  const [busy, setBusy] = useState(false);
  const valid = live
    ? targets.length > 0 &&
      validUrl(url) &&
      (surface === "explore" ||
        (surface === "testmd" ? !!testmdPath.trim() : !!objective.trim()))
    : !!replayId;
  return (
    <Modal
      title={live ? "Run live cloud verification" : "Replay an execution"}
      eyebrow="EXECUTION CONTROL"
      onClose={() => setDialog(null)}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await startRun(
            live
              ? {
                  surface,
                  objective: surface === "run" ? objective : undefined,
                  testmdPath:
                    surface === "testmd" ? testmdPath.trim() : undefined,
                  url,
                  targets,
                  bugDetectionMode: bugs,
                }
              : { replayRunId: replayId },
          );
          setBusy(false);
        }}
      >
        <div className="modal-body form-stack">
          <div className="selected-project">
            <Box size={18} className="gold" />
            <strong>{project.name}</strong>
            <Tag>
              <GitBranch size={10} />
              {project.branch}
            </Tag>
          </div>
          {live ? (
            <>
              <div className="form-columns">
                <label className="field">
                  Execution surface
                  <select
                    value={surface}
                    onChange={(e) => setSurface(e.target.value)}
                  >
                    <option value="run">run (plain-English objective)</option>
                    <option value="testmd">
                      testmd run (spec in the repository)
                    </option>
                    <option value="explore">explore run (map the app)</option>
                  </select>
                </label>
                <label className="field">
                  Bug detection
                  <select
                    value={bugs}
                    onChange={(e) => setBugs(e.target.value)}
                  >
                    <option value="continue">
                      continue (record 740, keep going)
                    </option>
                    <option value="stop">stop on confirmed bug</option>
                    <option value="off">off</option>
                  </select>
                </label>
              </div>
              {surface === "run" && (
                <label className="field">
                  Objective
                  <textarea
                    rows={4}
                    required
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder={
                      'Add the flagship plan to the cart and check out. Assert that no network request returned a 5xx status. Assert there are zero console errors. Store the confirmation code as "order_id".'
                    }
                  />
                </label>
              )}
              {surface === "testmd" && (
                <label className="field">
                  Spec path in {project.repo}
                  <input
                    required
                    value={testmdPath}
                    onChange={(e) => setTestmdPath(e.target.value)}
                    placeholder=".testmuai/tests/checkout_revenue_test.md"
                  />
                </label>
              )}
              <label className="field">
                Target URL
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </label>
              <div className="target-checks">
                {["desktop_web", "remote_pixel_7"].map((t) => (
                  <label key={t}>
                    <input
                      type="checkbox"
                      checked={targets.includes(t)}
                      disabled={surface === "explore" && t !== "desktop_web"}
                      onChange={() =>
                        setTargets(
                          targets.includes(t)
                            ? targets.filter((x) => x !== t)
                            : [...targets, t],
                        )
                      }
                    />
                    {platformNames[t]}
                  </label>
                ))}
              </div>
              <div className="form-note">
                <Zap size={15} />
                <span>
                  {system?.worker
                    ? `Dispatches to the cloud worker and consumes TestMu AI credits${creditsKnown ? ` (${Math.round(credits).toLocaleString()} remain)` : ""}. Limit: ${system.rateLimitPerHour} live runs per hour.`
                    : "No cloud worker is configured, so this run will be recorded as exit code 2 (setup error) without executing."}
                </span>
              </div>
            </>
          ) : (
            <>
              <label className="field">
                Execution timeline
                <select
                  value={replayId}
                  onChange={(e) => setReplayId(e.target.value)}
                >
                  {sealed.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label} / {r.display} / {r.name.slice(0, 60)} /{" "}
                      {stamp(r.at)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-note">
                <Rewind size={15} />
                <span>
                  {sealed.length
                    ? "Replay recorded events at 5× speed. No additional credits are used."
                    : "No sealed runs exist yet. Switch to Live Cloud mode to record the first one."}
                </span>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="btn secondary"
            type="button"
            onClick={() => setDialog(null)}
          >
            Cancel
          </button>
          <button
            className="btn primary"
            type="submit"
            disabled={!valid || busy}
          >
            {live ? (
              <Play size={13} fill="currentColor" />
            ) : (
              <Rewind size={13} />
            )}
            {busy ? "Starting..." : live ? "Start live run" : "Replay run"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CommandSearch() {
  const { setDialog, go, projectRuns } = useWorkspace();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const results = [
    ...navigation.map(([id, icon]) => ({
      key: id,
      label: id === "project" ? "Run ledger" : pageNames[id],
      icon,
      type: "Screen",
      go: () => go(id, id === "project" ? { tab: "Run history" } : undefined),
    })),
    ...projectRuns.map((r) => ({
      key: r.id,
      label: `${r.label} / ${r.name}`,
      icon: Terminal,
      type: r.display,
      go: () => go("theater", { id: r.id }),
    })),
  ]
    .filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 9);
  return (
    <Modal
      title="Search workspace"
      eyebrow="COMMAND PALETTE"
      onClose={() => setDialog(null)}
    >
      <div className="modal-body">
        <label className="search-field large">
          <Search size={18} />
          <input
            autoFocus
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActive(0);
            }}
            placeholder="Find a screen or a run..."
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setActive(
                  (a) =>
                    (a + (e.key === "ArrowDown" ? 1 : -1) + results.length) %
                    Math.max(1, results.length),
                );
              }
              if (e.key === "Enter") results[active]?.go();
            }}
          />
        </label>
        <div className="command-results">
          {results.map((r, i) => (
            <button
              className={i === active ? "focused" : ""}
              key={r.key}
              onClick={r.go}
              onMouseEnter={() => setActive(i)}
            >
              <r.icon size={15} />
              <span>{r.label}</span>
              <small>{r.type}</small>
              <ChevronRight size={12} />
            </button>
          ))}
          {!results.length && <Empty />}
        </div>
      </div>
    </Modal>
  );
}

function Environment() {
  const { project, patchProject, setDialog, system, go } = useProject();
  return (
    <Modal
      title="Execution mode"
      eyebrow="JUDGE INSTANT-REPLAY / LIVE CLOUD"
      onClose={() => setDialog(null)}
    >
      <div className="modal-body">
        <div className="form-note">
          <Radio size={16} />
          {system?.worker
            ? `A cloud worker is configured${system.workerReport?.cliVersion ? ` (kane-cli ${system.workerReport.cliVersion})` : "; it has not reported in yet"}.`
            : "No cloud worker is configured. Live runs are recorded as setup errors until KANE_WORKER_URL and WORKER_SHARED_SECRET are set."}
        </div>
        <div className="choice-list">
          {(
            [
              ["judge_instant_replay", Rewind, "Judge Instant-Replay sandbox"],
              ["live_cloud", Zap, "Live Cloud execution"],
            ] as const
          ).map(([m, I, label]) => (
            <button
              key={m}
              className={project.mode === m ? "chosen" : ""}
              onClick={async () => {
                if (m === "live_cloud" && !system?.worker) {
                  setDialog(null);
                  go("integrations");
                  return;
                }
                await patchProject({ mode: m }, `${label} selected`);
                setDialog(null);
              }}
            >
              <I size={17} />
              <span>
                {label}
              </span>
              {project.mode === m && <Check size={15} />}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export function Dialogs() {
  const {
    dialog,
    setDialog,
    go,
    project,
    saveSetting,
    inboxEvents,
    inboxRead: read,
  } = useWorkspace();
  if (dialog === "onboarding") return <Onboarding />;
  if (dialog === "new-run") return project ? <NewRun /> : <Onboarding />;
  if (dialog === "search") return <CommandSearch />;
  if (dialog === "environment")
    return project ? <Environment /> : <Onboarding />;
  if (dialog === "help")
    return (
      <Modal
        title="Operator field guide"
        eyebrow="CHAOS-PACT DOCUMENTATION"
        onClose={() => setDialog(null)}
      >
        <div className="modal-body">
          <p className="description">
            A verification workspace for inspecting executions, evidence, and
            repair outcomes. Every project keeps its own live run ledger.
          </p>
          {(
            [
              [
                Terminal,
                "Run a verification",
                "Trigger run dispatches a plain-English objective or a _test.md spec to the cloud Kane CLI worker and streams its NDJSON here.",
              ],
              [
                Layers3,
                "Inspect the evidence",
                "Inspect network and console records in the viewer. Download a genuine uploaded pack,.",
              ],
              [
                Swords,
                "Unleash a battle",
                "The saboteur mutates a chaos branch, Kane CLI referees, and the healer patches under a patch-intent audit, up to three attempts.",
              ],
              [
                ShieldCheck,
                "Close coverage gaps",
                "A requirement only becomes trusted when a Kane CLI run linked to it exits 0.",
              ],
            ] as const
          ).map(([I, title, text]) => (
            <div className="guide-item" key={title}>
              <I size={18} />
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </div>
          ))}
          <div className="form-note">
            <Code2 size={15} />
            Press Ctrl + K or Cmd + K to search your workspace.
          </div>
          <a
            className="spec-download text-button"
            href="/design-specification.md"
            download
          >
            Download the interior design specification{" "}
            <ArrowDownToLine size={13} />
          </a>
        </div>
      </Modal>
    );
  if (dialog === "notifications")
    return (
      <Modal
        title="Activity inbox"
        eyebrow="WORKSPACE NOTIFICATIONS"
        onClose={() => setDialog(null)}
      >
        <div className="modal-body">
          <div className="inbox-heading">
            <span>
              {read
                ? "All caught up"
                : `${inboxEvents.length} workspace updates`}
            </span>
            <button
              className="text-button"
              onClick={() =>
                saveSetting(
                  "inbox_read_at",
                  Date.now(),
                  "All notifications marked as read",
                )
              }
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          </div>
          {inboxEvents.map((item) => (
            <button
              className="notification-row"
              key={item.title}
              onClick={() => {
                saveSetting("inbox_read_at", Date.now());
                go(item.page, item.id ? { id: item.id } : {});
              }}
            >
              <Bell size={16} className={read ? "muted" : "gold"} />
              <span>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </span>
              <ArrowUpRight size={13} />
            </button>
          ))}
          {!inboxEvents.length && (
            <Empty
              title="Your inbox is clear"
              description="Updates appear when runs fail, heal, or seal evidence."
            />
          )}
          <button
            className="text-button sample-link"
            onClick={() => go("settings", { tab: "Notifications" })}
          >
            Notification preferences <ArrowRight size={12} />
          </button>
        </div>
      </Modal>
    );
  return null;
}
