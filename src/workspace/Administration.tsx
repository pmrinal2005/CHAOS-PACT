import {
  ArrowUpRight,
  Bot,
  Check,
  Copy,
  Fingerprint,
  Github,
  HardDrive,
  Monitor,
  Play,
  Server,
  Smartphone,
  Trash2,
  UserPlus,
  Webhook,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { PLATFORMS, platformNames } from "@/lib/types";
import {
  Empty,
  EvidenceFrame,
  Gauge,
  PageHead,
  PanelHeading,
  RunTable,
  Tag,
  isMobile,
  statusColor,
} from "./ui";
import { api, duration, stamp, useProject, useWorkspace } from "./workspace";

/** Real configuration state of every external surface. No toggles that pretend. */
export function Integrations() {
  const { system, copy, runs } = useWorkspace();
  const origin = system?.appUrl || location.origin;
  const report = system?.workerReport;
  const webhookRuns = runs.filter((r) => r.trigger === "github_webhook").length;
  const rows: {
    icon: LucideIcon;
    name: string;
    ok: boolean;
    detail: string;
    env: string;
  }[] = [
    {
      icon: Server,
      name: "Cloud Kane worker",
      ok: !!system?.worker,
      detail: system?.worker
        ? report
          ? `Last preflight ${stamp(report.at)} UTC. kane-cli ${report.cliVersion || "version unknown"}, ${report.authenticated ? `authenticated${report.whoami ? ` (${report.whoami})` : ""}` : "NOT authenticated"}${typeof report.balance === "number" ? `, balance ${report.balance.toLocaleString()} credits` : ""}.`
          : "Configured. It reports its Kane CLI version, auth state and credit balance on its first job."
        : "Not configured. Live runs are recorded as exit code 2 (setup error) and nothing executes.",
      env: "KANE_WORKER_URL, WORKER_SHARED_SECRET",
    },
    {
      icon: Github,
      name: "GitHub repository access",
      ok: !!system?.github,
      detail: system?.github
        ? "Token present. Used to create chaos branches, commit audited repairs and comment on pull requests."
        : "Not configured. The saboteur and healer cannot read or commit to repositories.",
      env: "GITHUB_TOKEN",
    },
    {
      icon: Webhook,
      name: "GitHub webhook (PR gate, README lie detector)",
      ok: !!system?.githubWebhook,
      detail: system?.githubWebhook
        ? `Signature verification active. ${webhookRuns} run${webhookRuns === 1 ? "" : "s"} triggered by webhooks so far.`
        : "Not configured. Incoming webhooks are rejected because their signature cannot be verified.",
      env: "GITHUB_WEBHOOK_SECRET",
    },
    {
      icon: Bot,
      name: "Agent model (Red-Team saboteur, Blue-Team healer)",
      ok: !!system?.llm,
      detail: system?.llm
        ? `Using ${system.llm === "groq" ? "Groq (Llama 3.3 70B)" : "Gemini"}. The anti-cheat audit itself is deterministic and needs no model.`
        : "Not configured. Battles cannot generate mutations or repairs.",
      env: "GROQ_API_KEY or GEMINI_API_KEY",
    },
    {
      icon: Fingerprint,
      name: "HMAC receipt signing",
      ok: !!system?.hmac,
      detail: system?.hmac
        ? "Receipts are signed with HMAC-SHA256 and can be recomputed at /api/receipt/[id]."
        : "Not configured. Healed battles cannot be sealed with a receipt or published.",
      env: "HMAC_SECRET",
    },
    {
      icon: HardDrive,
      name: "Evidence storage (worker side)",
      ok: runs.some((r) => r.thumb),
      detail: runs.some((r) => r.thumb)
        ? "Screenshots from unpacked evidence packs are being uploaded."
        : "No uploaded screenshots yet. The worker uploads packs and screenshots when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set on it; logs and failure records are stored either way.",
      env: "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (worker)",
    },
  ];
  return (
    <>
      <PageHead
        eyebrow="WORKFLOW AUTOMATION"
        title="Integrations"
        description="What is actually connected, read from the server's configuration."
      />
      <div className="page-content narrow-content">
        <div className="section-intro">
          <span className="eyebrow gold">CONNECTED SURFACES</span>
          <p>
            Secrets live in environment variables and are never shown here. Each
            row reports whether the server can use that integration right now.
          </p>
        </div>
        <div className="status-list">
          {rows.map(({ icon: Icon, name, ok, detail, env }) => (
            <div key={name}>
              <Icon size={18} className={ok ? "green" : "muted"} />
              <strong>{name}</strong>
              <small>
                {detail} <code>{env}</code>
              </small>
              <Tag color={ok ? "green" : "gold"}>
                {ok ? <Check size={11} /> : <X size={11} />}
                {ok ? "Ready" : "Not set"}
              </Tag>
            </div>
          ))}
        </div>
        <div className="section-title spaced">
          <h2>Endpoints</h2>
        </div>
        <section className="panel" style={{ padding: 18 }}>
          {(
            [
              [
                "GitHub webhook payload URL",
                `${origin}/api/webhooks/github`,
                "Content type application/json. Events: Pull requests, Pushes.",
              ],
              [
                "Worker callback",
                `${origin}/api/worker/events`,
                "The worker posts NDJSON batches and results here with the shared secret.",
              ],
              [
                "Receipt verification",
                `${origin}/api/receipt/<battle-or-run-id>`,
                "Public. Append ?format=svg for a README badge.",
              ],
              [
                "Public post-mortems",
                `${origin}/postmortems`,
                "Articles Kane CLI has self-verified.",
              ],
            ] as const
          ).map(([label, value, hint]) => (
            <div className="kv-row" key={label} title={hint}>
              <span>{label}</span>
              <button
                className="inline-icon mono"
                onClick={() => copy(value, label)}
              >
                <code>{value}</code>
                <Copy size={11} />
              </button>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

/** Latest real verdict per execution target, side by side. */
export function Devices() {
  const { projectRuns, go, startRun, project } = useProject();
  const [busy, setBusy] = useState("");
  const latestDesktop = projectRuns.find(
    (r) => r.platform === "desktop_web" && (r.objective || r.testmdPath),
  );
  return (
    <>
      <PageHead
        eyebrow="CROSS-DEVICE VERIFICATION"
        title="Mobile Grid"
        description="Desktop Chrome and TestMu AI cloud devices, verified from the same spec."
      />
      <div className="page-content">
        <div className="device-grid">
          {PLATFORMS.map((platform) => {
            const mine = projectRuns.filter((r) => r.platform === platform);
            const latest = mine.find((r) => r.completedAt) || mine[0];
            const passed = mine.filter((r) => r.status === "passed").length;
            const done = mine.filter((r) => r.completedAt).length;
            return (
              <section className="panel device-card" key={platform}>
                <PanelHeading
                  icon={isMobile(platform) ? Smartphone : Monitor}
                  action={
                    latest ? (
                      <Tag color={statusColor(latest.display)}>
                        {latest.display}
                      </Tag>
                    ) : (
                      <Tag>No runs</Tag>
                    )
                  }
                >
                  {platformNames[platform]}
                </PanelHeading>
                <EvidenceFrame
                  small
                  mobile={isMobile(platform)}
                  src={mine.find((r) => r.thumb)?.thumb}
                  url={latest?.targetUrl}
                  alt={`Latest captured frame on ${platformNames[platform]}`}
                />
                <div className="kv-row">
                  <span>Runs / passed</span>
                  <b className="mono">
                    {mine.length} / {passed}
                    {done ? ` (${Math.round((passed / done) * 100)}%)` : ""}
                  </b>
                </div>
                <div className="kv-row">
                  <span>Latest</span>
                  <b className="mono">
                    {latest
                      ? `${latest.label}, ${latest.completedAt ? duration(latest.duration) : "live"}`
                      : "none"}
                  </b>
                </div>
                <div className="device-foot">
                  <button
                    className="text-button"
                    disabled={!latest}
                    onClick={() => latest && go("theater", { id: latest.id })}
                  >
                    Open latest run <ArrowUpRight size={12} />
                  </button>
                  {platform !== "desktop_web" && (
                      <button
                        className="btn secondary compact"
                        disabled={!latestDesktop || !!busy}
                        title={
                          latestDesktop
                            ? `Re-run ${latestDesktop.label} on this target`
                            : "Run a desktop verification first"
                        }
                        onClick={async () => {
                          setBusy(platform);
                          await startRun({
                            executionMode: "live_cloud",
                            name: latestDesktop!.name,
                            objective: latestDesktop!.objective || undefined,
                            testmdPath: latestDesktop!.testmdPath || undefined,
                            url: latestDesktop!.targetUrl || project.staging,
                            targets: [platform],
                          });
                          setBusy("");
                        }}
                      >
                        <Play size={12} />
                        {busy === platform
                          ? "Dispatching..."
                          : "Mirror latest desktop spec"}
                      </button>
                    )}
                </div>
              </section>
            );
          })}
        </div>
        <div className="section-title spaced">
          <h2>Mobile and cloud-grid executions</h2>
          <span className="mono muted">
            {projectRuns.filter((r) => isMobile(r.platform)).length} records
          </span>
        </div>
        <section className="panel">
          <RunTable
            runs={projectRuns.filter((r) => isMobile(r.platform)).slice(0, 12)}
          />
        </section>
      </div>
    </>
  );
}

export function Team() {
  const { members, act, operator } = useWorkspace();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Engineer");
  return (
    <>
      <PageHead
        eyebrow="WORKSPACE ACCESS"
        title="Team"
        description="The people recorded against this workspace."
      />
      <div className="page-content narrow-content">
        <form
          className="invite-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await act(
              () => api("/api/team", { json: { name, email, role } }),
              `${name} added to the roster`,
            );
            if (ok) {
              setName("");
              setEmail("");
            }
          }}
        >
          <label className="field">
            Name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            Role
            <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option>Owner</option>
              <option>Engineer</option>
              <option>Viewer</option>
            </select>
          </label>
          <button className="btn primary">
            <UserPlus size={14} />
            Add member
          </button>
        </form>
        <p className="subtle-note">
          Role labels describe this roster; they do not grant access. Private
          workspace protection is configured separately, and no invitation email
          is sent.
          {operator.name ? ` Current operator profile: ${operator.name}.` : ""}
        </p>
        <section className="panel table-scroll">
          {members.length ? (
            <table className="data-table team-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Added</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className="member-cell">
                        <span>
                          <strong>{m.name}</strong>
                          <small>{m.email}</small>
                        </span>
                      </span>
                    </td>
                    <td>
                      <Tag>{m.role}</Tag>
                    </td>
                    <td className="mono">{stamp(m.at)}</td>
                    <td>
                      <button
                        className="text-button"
                        aria-label={`Remove ${m.name}`}
                        onClick={() =>
                          act(
                            () =>
                              api(`/api/team?id=${m.id}`, { method: "DELETE" }),
                            `${m.name} removed`,
                          )
                        }
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty
              title="No team members recorded"
              description="Add the people who operate this workspace."
            />
          )}
        </section>
      </div>
    </>
  );
}

export function Billing() {
  const {
    runs,
    projects,
    credits,
    creditsKnown,
    limit,
    consumed,
    budget,
    reportedBalance,
    saveSetting,
    system,
  } = useWorkspace();
  const [draft, setDraft] = useState(String(budget || ""));
  const billed = runs.filter((r) => r.credits > 0);
  const byPlatform = PLATFORMS.map((p) => ({
    label: platformNames[p],
    credits: billed
      .filter((r) => r.platform === p)
      .reduce((n, r) => n + r.credits, 0),
    runs: runs.filter((r) => r.platform === p).length,
  }));
  const byProject = projects.map((p) => ({
    label: p.name,
    credits: billed
      .filter((r) => r.projectId === p.id)
      .reduce((n, r) => n + r.credits, 0),
    runs: runs.filter((r) => r.projectId === p.id).length,
  }));
  const max = Math.max(1, ...byPlatform.map((b) => b.credits));
  return (
    <>
      <PageHead
        eyebrow="USAGE"
        title="Billing & Credits"
        description="TestMu AI credits consumed by Kane CLI, as reported in each run's terminal event."
      />
      <div className="page-content">
        <div className="billing-top">
          <section className="panel billing-gauge">
            {creditsKnown && (
              <Gauge
                value={Math.round(credits)}
                limit={Math.round(limit)}
                large
              />
            )}
            <p className="billing-gauge-note">
              {!creditsKnown
                ? "No balance to show yet. The worker reports kane-cli balance on its first job; until then you can set a budget below."
                : reportedBalance !== null
                  ? `Balance reported by the worker's kane-cli balance${system?.workerReport ? ` at ${stamp(system.workerReport.at)} UTC` : ""}.`
                  : "Budget minus recorded consumption. The worker reports the authoritative balance on its first job."}
            </p>
          </section>
          <section className="panel usage-chart" style={{ padding: 18 }}>
            <div className="micro-label">CREDITS BY EXECUTION TARGET</div>
            <div className="usage-total">
              {consumed.toFixed(1)}{" "}
              <span className="muted">
                credits across {billed.length} billed run
                {billed.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="spend-legend">
              {byPlatform.map((b) => (
                <div className="spend-item" key={b.label}>
                  <div>
                    <span>
                      {b.label} <span className="muted">({b.runs} runs)</span>
                    </span>
                    <strong>{b.credits.toFixed(1)}</strong>
                  </div>
                  <div className="spend-track">
                    <i
                      className="gold"
                      style={{ width: `${(b.credits / max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="section-title spaced">
          <h2>Credit budget</h2>
        </div>
        <form
          className="invite-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveSetting(
              "credit_budget",
              Number(draft),
              "Credit budget updated",
            );
          }}
        >
          <label className="field">
            Budget for this workspace (credits)
            <input
              type="number"
              min="1"
              required
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </label>
          <button
            className="btn primary"
            disabled={!Number(draft) || Number(draft) === budget}
          >
            <Check size={14} />
            Save budget
          </button>
        </form>
        <p className="subtle-note">
          Live runs are also limited to{" "}
          {system?.rateLimitPerHour ?? "a fixed number of"} per requester per
          hour, and are refused once the reported balance reaches zero.
        </p>
        <div className="section-title spaced">
          <h2>Usage by project</h2>
        </div>
        <section className="panel table-scroll">
          {byProject.length ? (
            <table className="data-table plans-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Runs</th>
                  <th>Credits consumed</th>
                </tr>
              </thead>
              <tbody>
                {byProject.map((b) => (
                  <tr key={b.label}>
                    <td>
                      <strong>{b.label}</strong>
                    </td>
                    <td className="mono">{b.runs}</td>
                    <td className="mono gold">{b.credits.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty
              title="No usage yet"
              description="Usage appears after the first Kane CLI run completes."
            />
          )}
        </section>
      </div>
    </>
  );
}
