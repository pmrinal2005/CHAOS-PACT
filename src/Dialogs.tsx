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
  FolderGit2,
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
import { navigation } from "./Shell";
import { Dot, Empty, Modal, Tag } from "./ui";
import {
  initialProject,
  pageNames,
  parseRequirements,
  useWorkspace,
  type Project,
} from "./workspace";

const repositories = [
  "acme/atlas-storefront",
  "acme/orbit-api",
  "acme/nexus-commerce",
  "acme/mobile-checkout",
];
export function Onboarding() {
  const { setDialog, setProjects, setProjectId, go, toast } = useWorkspace();
  const [step, setStep] = useState(0);
  const [repo, setRepo] = useState("");
  const [search, setSearch] = useState("");
  const [staging, setStaging] = useState("");
  const [production, setProduction] = useState("");
  const [file, setFile] = useState("");
  const [count, setCount] = useState(0);
  const [claims, setClaims] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("sandbox");
  const input = useRef<HTMLInputElement>(null);
  const validUrl = (v: string) => {
    try {
      return ["https:", "http:"].includes(new URL(v).protocol);
    } catch {
      return false;
    }
  };
  async function ingest(f?: File) {
    if (!f) return;
    if (!/\.(md|markdown)$/i.test(f.name)) {
      setError("Choose a Markdown (.md or .markdown) file.");
      return;
    }
    if (f.size > 2e6) {
      setError("The specification must be smaller than 2 MB.");
      return;
    }
    setError("");
    setParsing(true);
    const text = await f.text();
    const parsed = parseRequirements(text);
    if (!parsed.length) {
      setError("The file is empty. Add a requirement and try again.");
      setParsing(false);
      return;
    }
    const requirements = parsed.length;
    setClaims(parsed);
    setTimeout(() => {
      setFile(f.name);
      setCount(Math.max(1, requirements));
      setParsing(false);
    }, 650);
  }
  const complete = () => {
    const slug = repo.split("/")[1];
    const p: Project = {
      ...initialProject,
      id: slug,
      name: slug
        .split("-")
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" "),
      repo,
      staging,
      production,
      spec: file,
      requirements: count,
      claims,
      covered: 0,
      mode,
    };
    setProjects((old) => [...old.filter((item) => item.id !== p.id), p]);
    setProjectId(p.id);
    go("dashboard");
    toast(`${p.name} is ready. Start your first sandbox run.`);
  };
  const ready = [
    !!repo,
    validUrl(staging) && validUrl(production),
    !!file && !parsing,
    true,
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
              "Choose a sample repository for this local workspace.",
              "Save the environments your verification specs will target.",
              "Import a Markdown specification to index its requirements.",
              "Start with a reproducible replay, or prepare a live configuration.",
            ][step]
          }
        </p>
        {step === 0 && (
          <>
            <label className="search-field">
              <Search size={15} />
              <input
                placeholder="Search repositories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className="repo-options">
              {repositories
                .filter((r) => r.includes(search.toLowerCase()))
                .map((r, i) => (
                  <button
                    className={repo === r ? "chosen" : ""}
                    key={r}
                    onClick={() => setRepo(r)}
                  >
                    <FolderGit2 size={18} />
                    <span>
                      <strong>{r}</strong>
                      <small>
                        <GitBranch size={10} />
                        main <span>Last commit {i + 1}h ago</span>
                      </small>
                    </span>
                    {repo === r ? (
                      <Check size={14} />
                    ) : (
                      <span className="radio-circle" />
                    )}
                  </button>
                ))}
              {!repositories.some((r) => r.includes(search.toLowerCase())) && (
                <Empty />
              )}
            </div>
          </>
        )}
        {step === 1 && (
          <div className="form-stack">
            {[
              ["Staging", staging, setStaging],
              ["Production", production, setProduction],
            ].map(([label, value, setter]) => (
              <label className="field" key={String(label)}>
                <span>{String(label)} URL</span>
                <div className="url-input">
                  <Globe size={14} />
                  <input
                    type="url"
                    value={String(value)}
                    placeholder={
                      label === "Staging"
                        ? "https://staging.your-app.com"
                        : "https://your-app.com"
                    }
                    onChange={(e) =>
                      (setter as (v: string) => void)(e.target.value)
                    }
                  />
                  {validUrl(String(value)) && <Dot />}
                </div>
              </label>
            ))}
            <div className="form-note">
              <ShieldCheck size={15} />
              URLs are validated locally. A live worker is needed for
              reachability checks.
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
              className={`upload-tray ${parsing ? "parsing" : ""}`}
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
              <strong>
                {parsing
                  ? "Parsing requirements..."
                  : file || "Drop your Markdown file here"}
              </strong>
              <span>
                {file
                  ? `${count} requirements indexed`
                  : "or click to browse files, up to 2 MB"}
              </span>
              {parsing && <i />}
            </button>
            <button
              className="text-button sample-link"
              onClick={() => {
                setFile("product-spec.md");
                setClaims([
                  "Product detail renders",
                  "Search returns matches",
                  "Cart retains quantity",
                  "Checkout confirms payment",
                  "Mobile CTA is visible",
                  "Session persists",
                  "Address validation",
                  "Order history renders",
                  "Navigation responds",
                  "Currency is formatted",
                  "Stock state updates",
                  "Receipt is available",
                ]);
                setCount(12);
                setError("");
              }}
            >
              Use sample specification <ArrowRight size={12} />
            </button>
          </>
        )}
        {step === 3 && (
          <>
            <div className="mode-options">
              {[
                [
                  "sandbox",
                  Rewind,
                  "Instant-replay sandbox",
                  "Recommended. Explore repeatable, local verification runs.",
                ],
                [
                  "live",
                  Zap,
                  "Go live immediately",
                  "Save live target settings for your connected worker.",
                ],
              ].map(([id, Icon, title, text]) => {
                const I = Icon as typeof Zap;
                return (
                  <button
                    key={String(id)}
                    className={mode === id ? "chosen" : ""}
                    onClick={() => setMode(String(id))}
                  >
                    <I size={23} />
                    <strong>{String(title)}</strong>
                    <p>{String(text)}</p>
                    {mode === id && <Check size={13} className="mode-check" />}
                  </button>
                );
              })}
            </div>
            {mode === "live" && (
              <p className="form-note">
                No live worker is connected. This workspace will save your
                configuration and run local simulations only.
              </p>
            )}
          </>
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
          {step === 3 ? "Enter workspace" : "Continue"}
          <ArrowRight size={14} />
        </button>
      </div>
    </Modal>
  );
}
function NewRun() {
  const { project, setDialog, startRun, credits } = useWorkspace();
  const [name, setName] = useState("Checkout flow verification");
  const [platform, setPlatform] = useState("Desktop web");
  const [surface, setSurface] = useState("testrun");
  return (
    <Modal
      title="Trigger a verification run"
      eyebrow="EXECUTION CONTROL"
      onClose={() => setDialog(null)}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startRun(name, platform, surface);
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
          <label className="field">
            Specification
            <select
              aria-label="Specification"
              value={name}
              onChange={(e) => setName(e.target.value)}
            >
              {[
                "Checkout flow verification",
                "Mobile layout assurance",
                "Session cookie persistence",
                "Product search returns results",
                "Account navigation flow",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <div className="form-columns">
            <label className="field">
              Target platform
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                {["Desktop web", "Pixel 8", "iPhone 15", "Cloud grid"].map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </select>
            </label>
            <label className="field">
              Execution surface
              <select
                value={surface}
                onChange={(e) => setSurface(e.target.value)}
              >
                {["testrun", "run", "testmd", "explore"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-note">
            <Rewind size={15} />
            <span>
              Replay sandbox. This local execution uses a deterministic fixture,
              not a live target.
            </span>
          </div>
          <div className="kv-row">
            <span>Execution budget</span>
            <b className="gold mono">24 credits</b>
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="btn secondary"
            type="button"
            onClick={() => setDialog(null)}
          >
            Cancel
          </button>
          <button className="btn primary" type="submit" disabled={credits < 24}>
            <Play size={13} fill="currentColor" />
            Start run
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
      label: pageNames[id],
      icon,
      type: "Screen",
      go: () => go(id),
    })),
    ...projectRuns.map((r) => ({
      label: `${r.id} / ${r.name}`,
      icon: Terminal,
      type: r.status,
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
            placeholder="Find a screen, run, or specification..."
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
              key={r.label}
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
export function Dialogs() {
  const {
    dialog,
    setDialog,
    go,
    project,
    patchProject,
    toast,
    inboxEvents,
    inboxRead: read,
    setInboxRead: setRead,
  } = useWorkspace();
  if (dialog === "onboarding") return <Onboarding />;
  if (dialog === "new-run") return <NewRun />;
  if (dialog === "search") return <CommandSearch />;
  if (dialog === "help")
    return (
      <Modal
        title="Operator field guide"
        eyebrow="CHAOS-PACT DOCUMENTATION"
        onClose={() => setDialog(null)}
      >
        <div className="modal-body">
          <p className="description">
            A local-first workspace for inspecting verification runs, evidence,
            and controlled replay battles.
          </p>
          {[
            [
              Terminal,
              "Run a verification",
              "Choose Trigger run, select a specification and platform, then watch the typed execution stream.",
            ],
            [
              Layers3,
              "Inspect the evidence",
              "Open a sealed pack in the Evidence Vault. Scrub its step filmstrip and inspect the captured logs.",
            ],
            [
              Swords,
              "Spectate a battle",
              "Select a predefined scenario in the Arena and follow its six-stage sandbox replay.",
            ],
            [
              ShieldCheck,
              "Close coverage gaps",
              "Select an uncovered requirement in the Coverage Map to generate a local test specification.",
            ],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof Terminal;
            return (
              <div className="guide-item" key={String(title)}>
                <I size={18} />
                <div>
                  <strong>{String(title)}</strong>
                  <p>{String(text)}</p>
                </div>
              </div>
            );
          })}
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
              onClick={() => {
                setRead(true);
                toast("All notifications marked as read");
              }}
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
                setRead(true);
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
              description="No updates match your notification preferences."
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
  if (dialog === "environment")
    return (
      <Modal
        title="Workspace environment"
        eyebrow="EXECUTION MODE"
        onClose={() => setDialog(null)}
      >
        <div className="modal-body">
          <div className="form-note">
            <Radio size={16} />
            This implementation runs locally. No external worker or repository
            credentials are connected.
          </div>
          <div className="choice-list">
            {["sandbox", "live"].map((m) => (
              <button
                key={m}
                className={project.mode === m ? "chosen" : ""}
                onClick={() => {
                  patchProject({ mode: m });
                  toast(
                    m === "sandbox"
                      ? "Replay sandbox selected"
                      : "Live configuration saved. Executions remain local.",
                  );
                  setDialog(null);
                }}
              >
                {m === "sandbox" ? <Rewind size={17} /> : <Zap size={17} />}
                <span>
                  {m === "sandbox" ? "Replay sandbox" : "Live configuration"}
                </span>
                {project.mode === m && <Check size={15} />}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    );
  return null;
}
