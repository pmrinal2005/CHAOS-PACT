import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarClock,
  Check,
  ChevronDown,
  Chrome,
  Coins,
  Github,
  Globe,
  Link,
  Mail,
  Play,
  Plus,
  ShieldCheck,
  Smartphone,
  Webhook,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  BrowserPreview,
  Dot,
  Empty,
  Gauge,
  Modal,
  PageHead,
  PanelHeading,
  Tag,
  Toggle,
} from "./ui";
import { useStored, useWorkspace, type Run } from "./workspace";

const surfaces = [
  {
    name: "GitHub PR Gate",
    icon: Github,
    description: "Bring verification results directly into your pull requests.",
  },
  {
    name: "Scheduled Cron Audits",
    icon: CalendarClock,
    description: "Keep your assurance checks on a predictable schedule.",
  },
  {
    name: "Slack Alerts",
    icon: Bell,
    description: "Route important execution events to your team channel.",
  },
  {
    name: "Webhook Endpoints",
    icon: Webhook,
    description: "Deliver structured event payloads to your workflow.",
  },
];
export function Integrations() {
  const { toast, project } = useWorkspace();
  const [enabled, setEnabled] = useStored("integrations-enabled", [
    true,
    true,
    false,
    false,
  ]);
  const [expanded, setExpanded] = useState(0);
  const [cfg, setCfg] = useStored("integration-config", {
    branch: "main",
    required: true,
    frequency: "Every day",
    hour: "02:00",
    channel: "#verification",
    endpoint: "https://example.com/hooks/chaos-pact",
    events: "Failures and healing",
  });
  const [draft, setDraft] = useState(cfg);
  return (
    <>
      <PageHead
        eyebrow="WORKFLOW AUTOMATION"
        title="Integrations"
        description="Configure the surfaces that connect your verification workflow."
      />
      <div className="page-content narrow-content">
        <div className="section-intro">
          <span className="eyebrow gold">CONNECTED SURFACES</span>
          <p>
            Sandbox configurations are saved locally. No external messages or
            requests are sent.
          </p>
        </div>
        {surfaces.map(({ name, icon: Icon, description }, i) => (
          <section
            className={`integration-row ${expanded === i ? "expanded" : ""}`}
            key={name}
          >
            <div className="integration-summary">
              <span className="integration-icon">
                <Icon size={22} />
              </span>
              <button
                onClick={() => {
                  setExpanded(expanded === i ? -1 : i);
                  setDraft(cfg);
                }}
                className="integration-title"
              >
                <strong>{name}</strong>
                <span>{description}</span>
              </button>
              <Toggle
                label={`Enable ${name}`}
                value={enabled[i]}
                onChange={(v) => {
                  setEnabled((a) => a.map((x, n) => (n === i ? v : x)));
                  toast(
                    `${name} ${v ? "enabled" : "disabled"} in this sandbox`,
                  );
                }}
              />
              <button
                className="inline-arrow"
                aria-label={`Configure ${name}`}
                onClick={() => {
                  setExpanded(expanded === i ? -1 : i);
                  setDraft(cfg);
                }}
              >
                <ChevronDown size={16} />
              </button>
            </div>
            {expanded === i && (
              <form
                className="integration-config form-stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  setCfg(draft);
                  toast(`${name} configuration saved`);
                }}
              >
                {i === 0 ? (
                  <>
                    <div className="form-columns">
                      <label className="field">
                        Protected branch
                        <input
                          required
                          value={draft.branch}
                          onChange={(e) =>
                            setDraft({ ...draft, branch: e.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        Required status check
                        <span className="checkbox-control">
                          <input
                            type="checkbox"
                            checked={draft.required}
                            onChange={(e) =>
                              setDraft({ ...draft, required: e.target.checked })
                            }
                          />
                          chaos-pact / verify
                        </span>
                      </label>
                    </div>
                    <div className="micro-label">
                      PULL REQUEST COMMENT PREVIEW
                    </div>
                    <div className="github-comment">
                      <div>
                        <Github size={16} />
                        <strong>chaos-pact</strong>
                        <Tag>bot</Tag>
                        <span>commented just now</span>
                      </div>
                      <h4>
                        <ShieldCheck size={15} className="green" />
                        Verification passed
                      </h4>
                      <p>
                        All checks passed for <code>{project.repo}</code> on{" "}
                        <code>{draft.branch}</code>.
                      </p>
                      <span className="mono">
                        6 assertion domains / evidence pack sealed
                      </span>
                    </div>
                  </>
                ) : i === 1 ? (
                  <div className="form-columns">
                    <label className="field">
                      Frequency
                      <select
                        value={draft.frequency}
                        onChange={(e) =>
                          setDraft({ ...draft, frequency: e.target.value })
                        }
                      >
                        <option>Every day</option>
                        <option>Weekdays</option>
                        <option>Every Monday</option>
                      </select>
                    </label>
                    <label className="field">
                      Start time (UTC)
                      <input
                        type="time"
                        required
                        value={draft.hour}
                        onChange={(e) =>
                          setDraft({ ...draft, hour: e.target.value })
                        }
                      />
                    </label>
                  </div>
                ) : i === 2 ? (
                  <>
                    <label className="field">
                      Slack channel
                      <input
                        required
                        pattern="#[a-zA-Z0-9_-]+"
                        value={draft.channel}
                        onChange={(e) =>
                          setDraft({ ...draft, channel: e.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      Notify on
                      <select
                        value={draft.events}
                        onChange={(e) =>
                          setDraft({ ...draft, events: e.target.value })
                        }
                      >
                        <option>Failures and healing</option>
                        <option>All executions</option>
                        <option>Critical failures only</option>
                      </select>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="field">
                      Endpoint URL
                      <input
                        type="url"
                        required
                        value={draft.endpoint}
                        onChange={(e) =>
                          setDraft({ ...draft, endpoint: e.target.value })
                        }
                      />
                    </label>
                    <pre className="code-preview">
                      {
                        '{\n  "event": "run.completed",\n  "source": "chaos-pact.sandbox",\n  "status": "passed"\n}'
                      }
                    </pre>
                  </>
                )}
                <button
                  className="btn secondary compact self-start"
                  type="submit"
                >
                  <Check size={12} />
                  Save configuration
                </button>
              </form>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
const devices = [
  { name: "Pixel 8", os: "Android 14", size: "412 x 915", icon: Smartphone },
  { name: "iPhone 15", os: "iOS 17", size: "393 x 852", icon: Smartphone },
  {
    name: "Chrome",
    os: "Desktop / Chromium",
    size: "1440 x 900",
    icon: Chrome,
  },
  { name: "Safari", os: "Desktop / WebKit", size: "1440 x 900", icon: Globe },
];
export function Devices() {
  const { project, runs, setRuns, credits, setCredits, toast, go } =
    useWorkspace();
  const [selected, setSelected] = useStored("selected-devices", [
    "Pixel 8",
    "iPhone 15",
    "Chrome",
  ]);
  const [results, setResults] = useStored<Record<string, string>>(
    "device-results",
    {},
  );
  const [step, setStep] = useState(1);
  const toggle = (d: string) =>
    setSelected((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]));
  const batch = () => {
    if (credits < selected.length * 24) {
      toast("Insufficient credits for this batch");
      return;
    }
    const max = Math.max(
      128,
      ...runs.map((r) => Number(r.id.split("-")[1]) || 0),
    );
    const added: Run[] = selected.map((name, i) => ({
      id: `RUN-${String(max + i + 1).padStart(4, "0")}`,
      project: project.id,
      name: "Cross-browser checkout comparison",
      platform: name,
      surface: "testrun",
      status: "running",
      at: Date.now(),
      duration: 9,
      credits: 24,
      sha: "9b3f21c",
      review: false,
    }));
    setRuns((old) => [...added, ...old]);
    setCredits((c) => c - added.length * 24);
    setResults(Object.fromEntries(added.map((r) => [r.platform, r.id])));
    toast(`Started ${added.length} local device replays`);
  };
  const active = Object.values(results).some(
    (id) => runs.find((r) => r.id === id)?.status === "running",
  );
  return (
    <>
      <PageHead
        eyebrow="CROSS-BROWSER CONSOLE"
        title="Mobile Grid"
        description="Compare the same flow across your device fleet."
        action={
          <button
            className="btn primary"
            disabled={!selected.length || active}
            onClick={batch}
          >
            <Play size={13} />
            {active ? "Replaying devices..." : `Run ${selected.length} devices`}
          </button>
        }
      />
      <div className="page-content">
        <div className="section-title">
          <h2>Device selection</h2>
          <span className="mono muted">{selected.length} / 4 enabled</span>
        </div>
        <div className="device-options">
          {devices.map((d) => (
            <button
              className={selected.includes(d.name) ? "chosen" : ""}
              key={d.name}
              onClick={() => toggle(d.name)}
              aria-pressed={selected.includes(d.name)}
            >
              <d.icon size={26} />
              <span>
                <strong>{d.name}</strong>
                <small>{d.os}</small>
              </span>
              <span className="choose-mark">
                {selected.includes(d.name) && <Check size={10} />}
              </span>
            </button>
          ))}
        </div>
        <div className="section-title spaced">
          <h2>Render comparison</h2>
          <select
            className="control"
            aria-label="Compare flow step"
            value={step}
            onChange={(e) => setStep(Number(e.target.value))}
          >
            {[
              "Storefront",
              "Product detail",
              "Cart",
              "Checkout",
              "Confirmation",
            ].map((s, i) => (
              <option value={i} key={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="device-grid">
          {devices
            .filter((d) => selected.includes(d.name))
            .map((d) => {
              const run = runs.find(
                (r) => r.id === results[d.name] && r.project === project.id,
              );
              return (
                <section className="panel device-card" key={d.name}>
                  <PanelHeading
                    icon={d.icon}
                    action={
                      <Tag
                        color={
                          run?.status === "running"
                            ? "gold"
                            : run
                              ? "green"
                              : "muted"
                        }
                      >
                        {run?.status || "Cached frame"}
                      </Tag>
                    }
                  >
                    {d.name}
                  </PanelHeading>
                  <div
                    className={`device-frame ${d.icon === Smartphone ? "phone" : "desktop"}`}
                  >
                    <BrowserPreview
                      step={step}
                      mobile={d.icon === Smartphone}
                    />
                  </div>
                  <div className="device-foot">
                    <span className="mono">{d.size}</span>
                    {run ? (
                      <button
                        className="text-button"
                        onClick={() => go("theater", { id: run.id })}
                      >
                        Inspect run
                        <ArrowUpRight size={12} />
                      </button>
                    ) : (
                      <span>Sandbox fixture</span>
                    )}
                  </div>
                </section>
              );
            })}
        </div>
        {!selected.length && (
          <Empty
            title="Select a target device"
            description="Choose one or more devices above to compare their captured frames."
          />
        )}
      </div>
    </>
  );
}
type Member = {
  name: string;
  email: string;
  role: string;
  active: string;
  pending: boolean;
  token?: string;
};
export function Team() {
  const { toast, copy, query, go, operator } = useWorkspace();
  const [members, setMembers] = useStored<Member[]>("team-members", [
    {
      name: "Alex Kim",
      email: "alex@acme.team",
      role: "Owner",
      active: "Now",
      pending: false,
    },
    {
      name: "Morgan Chen",
      email: "morgan@acme.team",
      role: "Editor",
      active: "12 min ago",
      pending: false,
    },
    {
      name: "Sam Rivera",
      email: "sam@acme.team",
      role: "Editor",
      active: "1 hour ago",
      pending: false,
    },
    {
      name: "Jordan Lee",
      email: "jordan@acme.team",
      role: "Viewer",
      active: "Yesterday",
      pending: false,
    },
  ]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Editor");
  const [error, setError] = useState("");
  const invite = (e: React.FormEvent) => {
    e.preventDefault();
    if (members.some((m) => m.email === email.toLowerCase().trim())) {
      setError("This email already belongs to a member or pending invite.");
      return;
    }
    setMembers((old) => [
      ...old,
      {
        email: email.toLowerCase().trim(),
        name: email.split("@")[0],
        role,
        active: "Invitation created",
        pending: true,
        token: crypto.randomUUID(),
      },
    ]);
    setEmail("");
    setError("");
    toast("Local invitation created. Copy its link to share it.");
  };
  const linkFor = (m: Member) =>
    `${location.origin}${location.pathname}#/team?${new URLSearchParams({ invite: m.email, token: m.token || "" })}`;
  const invitation = members.find(
    (m) =>
      m.pending &&
      m.email === query.invite &&
      m.token &&
      m.token === query.token,
  );
  const roster = members.map((m) =>
    m.role === "Owner"
      ? { ...m, name: operator.name, email: operator.email }
      : m,
  );
  return (
    <>
      <PageHead
        eyebrow="WORKSPACE ACCESS"
        title="Team"
        description="Manage operators, permissions, and invitations."
      />
      <div className="page-content narrow-content">
        {query.invite && !invitation && (
          <div className="form-note">
            This invitation is unavailable or has been revoked. Local invites
            must be opened in the workspace that issued them.
          </div>
        )}
        {invitation && (
          <div className="invite-banner">
            <Mail size={18} />
            <div>
              <strong>Workspace invitation</strong>
              <p>Join this local workspace as {query.invite}.</p>
            </div>
            <button
              className="btn primary compact"
              onClick={() => {
                const m = {
                  ...invitation,
                  active: "Now",
                  pending: false,
                  token: undefined,
                };
                setMembers((old) => [
                  ...old.filter((p) => p.email !== m.email),
                  m,
                ]);
                go("team");
                toast("Invitation accepted in this workspace");
              }}
            >
              Accept invite
            </button>
          </div>
        )}
        <div className="section-title">
          <h2>Invite a teammate</h2>
          <Tag>LOCAL INVITATIONS</Tag>
        </div>
        <form className="invite-form" onSubmit={invite}>
          <label className="search-field">
            <Mail size={15} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              aria-label="Teammate email"
            />
          </label>
          <select
            className="control"
            aria-label="Invitation role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option>Editor</option>
            <option>Viewer</option>
          </select>
          <button className="btn primary">
            <Plus size={13} />
            Create invite
          </button>
        </form>
        {error && <p className="error-message">{error}</p>}
        <div className="section-title spaced">
          <h2>Workspace roster</h2>
          <span className="mono muted">
            {members.filter((m) => !m.pending).length} members
          </span>
        </div>
        <div className="panel table-scroll">
          <table className="data-table team-table">
            <thead>
              <tr>
                <th>Operator</th>
                <th>Role</th>
                <th>Last active</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((m, i) => (
                <tr key={m.email}>
                  <td>
                    <div className="member-cell">
                      <span className={`member-avatar tone-${i % 4}`}>
                        {m.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <span>
                        <strong>{m.name}</strong>
                        <small>{m.email}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <select
                      className="control sm"
                      aria-label={`Role for ${m.name}`}
                      value={m.role}
                      disabled={m.role === "Owner"}
                      onChange={(e) => {
                        setMembers((a) =>
                          a.map((p) =>
                            p.email === m.email
                              ? { ...p, role: e.target.value }
                              : p,
                          ),
                        );
                        toast("Member role updated");
                      }}
                    >
                      {m.role === "Owner" && <option>Owner</option>}
                      <option>Editor</option>
                      <option>Viewer</option>
                    </select>
                  </td>
                  <td className="muted">{m.active}</td>
                  <td>
                    {m.pending ? (
                      <div className="inline-icon">
                        <button
                          className="text-button"
                          onClick={() => copy(linkFor(m), "Invitation link")}
                        >
                          <Link size={12} />
                          Copy invite
                        </button>
                        <button
                          aria-label={`Revoke invitation for ${m.email}`}
                          onClick={() => {
                            setMembers((a) =>
                              a.filter((p) => p.email !== m.email),
                            );
                            toast("Invitation revoked");
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <Tag color="green">
                        <Dot />
                        Active
                      </Tag>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
const tiers = [
  { name: "Operator", credits: 10000, price: 29, workers: 3 },
  { name: "Studio", credits: 30000, price: 79, workers: 8 },
  { name: "Scale", credits: 100000, price: 199, workers: 24 },
];
export function Billing() {
  const { credits, limit, setCredits, setLimit, toast } = useWorkspace();
  const [plan, setPlan] = useState<(typeof tiers)[number] | null>(null);
  const [period, setPeriod] = useState("14 days");
  const active = tiers.find((t) => t.credits === limit) || tiers[0];
  const days = [
    168, 142, 184, 164, 209, 192, 156, 213, 177, 224, 187, 263, 219,
  ];
  days.push(Math.max(0, limit - credits - days.reduce((a, b) => a + b, 0)));
  const history = period === "7 days" ? days.slice(-7) : days;
  const points = history.map((n, i) => [
    24 + (i * 366) / (history.length - 1),
    142 - (n / Math.max(...history)) * 108,
  ]);
  return (
    <>
      <PageHead
        eyebrow="RESOURCE MANAGEMENT"
        title="Billing & Credits"
        description="Track execution capacity and manage your workspace plan."
        action={<Tag color="gold">{active.name} plan</Tag>}
      />
      <div className="page-content">
        <div className="billing-top">
          <section className="panel billing-gauge">
            <PanelHeading icon={Coins}>Execution balance</PanelHeading>
            <Gauge value={credits} limit={limit} large />
            <div className="billing-gauge-note">
              {(limit - credits).toLocaleString()} credits consumed this cycle
            </div>
          </section>
          <section className="panel usage-chart">
            <PanelHeading
              icon={Activity}
              action={
                <select
                  className="control sm"
                  aria-label="Usage chart period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <option>14 days</option>
                  <option>7 days</option>
                </select>
              }
            >
              Historical usage
            </PanelHeading>
            <div className="usage-total">
              {history.reduce((a, b) => a + b, 0).toLocaleString()}{" "}
              <span>credits consumed</span>
            </div>
            <svg
              viewBox="0 0 420 160"
              role="img"
              aria-label={`Credit usage for the last ${period}`}
            >
              {[45, 80, 115, 150].map((y) => (
                <path
                  key={y}
                  d={`M24 ${y}H398`}
                  stroke="#303234"
                  strokeDasharray="3 5"
                />
              ))}
              <path
                d={`M24 150 L${points.map((p) => p.join(" ")).join(" L")} L390 150Z`}
                fill="#d7b36e12"
              />
              <polyline
                points={points.map((p) => p.join(",")).join(" ")}
                fill="none"
                stroke="var(--gold)"
                strokeWidth="2"
              />
              {points.map(([x, y], i) => (
                <circle cx={x} cy={y} r="2.5" fill="var(--gold)" key={i}>
                  <title>
                    Day {i + 1}: {history[i]} credits
                  </title>
                </circle>
              ))}
            </svg>
            <div className="usage-axis">
              <span>{period} ago</span>
              <span>Today</span>
            </div>
          </section>
        </div>
        <div className="section-title spaced">
          <div>
            <h2>Workspace plans</h2>
            <p>Compare capacity for your verification workload.</p>
          </div>
          <Tag>MONTHLY</Tag>
        </div>
        <div className="panel table-scroll">
          <table className="data-table plans-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Monthly price</th>
                <th>Credits / cycle</th>
                <th>Workers</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr
                  className={t.name === active.name ? "active-plan" : ""}
                  key={t.name}
                >
                  <td>
                    <strong>{t.name}</strong>
                  </td>
                  <td>
                    ${t.price}
                    <span className="muted"> / mo</span>
                  </td>
                  <td className="mono">{t.credits.toLocaleString()}</td>
                  <td>{t.workers}</td>
                  <td>
                    {t.name === active.name ? (
                      <Tag color="gold">
                        <Check size={10} />
                        Current plan
                      </Tag>
                    ) : (
                      <button
                        className="btn secondary compact"
                        onClick={() => setPlan(t)}
                      >
                        {t.credits > limit ? "Upgrade" : "Change plan"}
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="subtle-note">
          Sandbox billing only. Plan changes adjust local capacity and do not
          charge a payment method.
        </p>
      </div>
      {plan && (
        <Modal
          title={`Switch to ${plan.name}`}
          eyebrow="SANDBOX PLAN CHANGE"
          onClose={() => setPlan(null)}
        >
          <div className="modal-body form-stack">
            <p className="description">
              Your workspace will have {plan.credits.toLocaleString()} execution
              credits per cycle and {plan.workers} workers. Current usage is
              carried over.
            </p>
            <div className="kv-row">
              <span>New available balance</span>
              <b className="gold mono">
                {Math.max(0, plan.credits - (limit - credits)).toLocaleString()}
              </b>
            </div>
            <div className="form-note">
              <ShieldCheck size={15} />
              This is a local simulation. No payment is processed.
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn secondary" onClick={() => setPlan(null)}>
              Cancel
            </button>
            <button
              className="btn primary"
              onClick={() => {
                setCredits(Math.max(0, plan.credits - (limit - credits)));
                setLimit(plan.credits);
                setPlan(null);
                toast("Workspace plan updated");
              }}
            >
              Confirm plan change
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
