import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Box,
  Bug,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock3,
  Cpu,
  Crosshair,
  FlaskConical,
  GitBranch,
  History,
  Layers3,
  ListVideo,
  Monitor,
  Play,
  Radio,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Swords,
  Terminal,
  Waves,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import { SAMPLE_AT, SAMPLE_PROJECT_ID } from "@/lib/sample-workspace";
import { duration, time, useProject, type Run } from "./workspace";

type Point = [number, number];
// A monotone horizontal-tangent curve, without an external chart runtime.
function curve(points: Point[]) {
  return points.reduce((d, p, i) => {
    if (!i) return `M${p[0]},${p[1]}`;
    const a = points[i - 1],
      mid = (a[0] + p[0]) / 2;
    return `${d} C${mid},${a[1]} ${mid},${p[1]} ${p[0]},${p[1]}`;
  }, "");
}
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const id = useId().replace(/:/g, ""),
    max = Math.max(1, ...values);
  const smoothed = values.map(
    (n, i) => (n * 2 + (values[i - 1] ?? n) + (values[i + 1] ?? n)) / 4,
  );
  const p: Point[] = smoothed.map((n, i) => [
    (i / (values.length - 1)) * 92,
    30 - (n / max) * 24,
  ]);
  const path = curve(p);
  return (
    <svg viewBox="0 0 94 34" className="metric-spark" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".20" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L92,34 L0,34 Z`} fill={`url(#${id})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
function ExecutionChart({
  buckets,
  start,
  span,
  openRun,
}: {
  buckets: Run[][];
  start: number;
  span: number;
  openRun: (r: Run) => void;
}) {
  const [hover, setHover] = useState<number | null>(null),
    [shown, setShown] = useState({ runs: true, failed: true });
  const x = (i: number) => (i / (buckets.length - 1)) * 660,
    max = Math.max(
      4,
      Math.ceil(Math.max(...buckets.map((b) => b.length)) / 4) * 4,
    ),
    y = (v: number) => 140 - (v / max) * 128;
  const all = curve(buckets.map((b, i) => [x(i), y(b.length)])),
    failed = curve(
      buckets.map((b, i) => [
        x(i),
        y(b.filter((r) => r.status === "failed").length),
      ]),
    );
  const at = (i: number) => time(start + (i * span) / (buckets.length - 1));
  return (
    <section className="mc-panel activity-panel">
      <div className="mc-panel-head">
        <div className="mc-card-title">
          <Activity size={17} />
          <h2>Execution activity</h2>
        </div>
        <span className="chart-scope">RUN VOLUME</span>
      </div>
      <div className="chart-legend">
        <button
          aria-pressed={shown.runs}
          onClick={() => setShown({ ...shown, runs: !shown.runs })}
        >
          <i className="line-key violet-key" />
          Total runs
        </button>
        <button
          aria-pressed={shown.failed}
          onClick={() => setShown({ ...shown, failed: !shown.failed })}
        >
          <i className="line-key coral-key" />
          Caught failures
        </button>
      </div>
      <div className="mc-chart">
        <div className="chart-y">
          {[max, max * 0.75, max * 0.5, max * 0.25, 0].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
        <div className="plot-area" onMouseLeave={() => setHover(null)}>
          <svg
            className="plot-svg"
            viewBox="0 0 660 148"
            preserveAspectRatio="none"
            role="img"
            aria-label="Execution and failure counts across the selected time window"
          >
            <defs>
              <linearGradient id="run-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9b7ad9" stopOpacity=".36" />
                <stop offset="100%" stopColor="#9b7ad9" stopOpacity=".025" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3, 4].map((n) => (
              <line
                key={n}
                x1="0"
                x2="660"
                y1={12 + 32 * n}
                y2={12 + 32 * n}
                stroke="#303038"
                strokeDasharray="3 5"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {shown.runs && (
              <>
                <path d={`${all} L660,140 L0,140 Z`} fill="url(#run-fill)" />
                <path
                  d={all}
                  fill="none"
                  stroke="#ab91ea"
                  strokeWidth="2.2"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}
            {shown.failed && (
              <path
                d={failed}
                fill="none"
                stroke="#d78883"
                strokeWidth="1.65"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {hover !== null && (
              <>
                <line
                  x1={x(hover)}
                  x2={x(hover)}
                  y1="2"
                  y2="140"
                  stroke="#a99dc1"
                  strokeDasharray="3 4"
                />
                <circle
                  cx={x(hover)}
                  cy={y(buckets[hover]?.length || 0)}
                  r="4"
                  fill="#d0b7ff"
                  stroke="#17141d"
                  strokeWidth="2"
                />
              </>
            )}
          </svg>
          <div className="chart-hit-zones">
            {buckets.map((b, i) => (
              <button
                key={i}
                aria-label={`${at(i)} UTC, ${b.length} runs. Inspect latest run.`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => b[0] && openRun(b[0])}
              />
            ))}
          </div>
          {hover !== null && (
            <div
              className="mc-chart-tooltip"
              style={{
                left: `${Math.min(78, Math.max(2, (hover / (buckets.length - 1)) * 100))}%`,
              }}
            >
              <b>{at(hover)} UTC</b>
              <span>
                {buckets[hover].length} runs ·{" "}
                {buckets[hover].filter((r) => r.status === "failed").length}{" "}
                failures
              </span>
            </div>
          )}
          <div className="chart-x">
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <span key={n}>{time(start + (n * span) / 6)}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Dashboard() {
  const {
    project,
    projectRuns,
    projectBattles,
    go,
    setDialog,
    loadError,
    system,
    credits,
    creditsKnown,
    consumed,
  } = useProject();
  const [hours, setHours] = useState(24),
    [runFilter, setRunFilter] = useState("all");
  const sample = project.id === SAMPLE_PROJECT_ID,
    end = sample ? SAMPLE_AT : Date.now(),
    span = hours * 3600000,
    start = end - span;
  const runs = useMemo(
    () => projectRuns.filter((r) => r.at >= start && r.at <= end),
    [projectRuns, start, end],
  );
  const buckets = useMemo(() => {
    const a: Run[][] = Array.from({ length: 24 }, () => []);
    runs.forEach((r) =>
      a[
        Math.min(23, Math.max(0, Math.floor(((r.at - start) / span) * 24)))
      ].push(r),
    );
    return a;
  }, [runs, start, span]);
  const failures = runs.filter((r) => r.resultCode === "740"),
    healed = runs.filter((r) => r.display === "healed"),
    passed = runs.filter((r) => r.exitCode === 0);
  const pct = runs.filter((r) => r.exitCode !== null).length
    ? (passed.length / runs.filter((r) => r.exitCode !== null).length) * 100
    : 0;
  const metrics: {
    icon: LucideIcon;
    label: string;
    value: string;
    unit?: string;
    color: string;
    tag: string;
    sub: string;
    data: number[];
    open: () => void;
  }[] = [
    {
      icon: ListVideo,
      label: "Total executions",
      value: String(runs.length),
      color: "#baa2ef",
      tag: "violet",
      sub: "Across all targets",
      data: buckets.map((b) => b.length),
      open: () => go("project", { tab: "Run history" }),
    },
    {
      icon: ShieldCheck,
      label: "Pass rate",
      value: pct.toFixed(1),
      unit: "%",
      color: "#88cfa8",
      tag: "mint",
      sub: `${passed.length} successful runs`,
      data: buckets.map((b) => b.filter((r) => r.exitCode === 0).length),
      open: () => go("project", { tab: "Run history", filter: "success" }),
    },
    {
      icon: Bug,
      label: "Caught failures",
      value: String(failures.length),
      color: "#eaa18e",
      tag: "peach",
      sub: "Confirmed regressions",
      data: buckets.map((b) => b.filter((r) => r.resultCode === "740").length),
      open: () => go("project", { tab: "Run history", filter: "failed" }),
    },
    {
      icon: Sparkles,
      label: "Auto-healed",
      value: String(healed.length),
      color: "#82cbd6",
      tag: "aqua",
      sub: "Verified repairs",
      data: buckets.map((b) => b.filter((r) => r.display === "healed").length),
      open: () => go("project", { tab: "Run history", filter: "healed" }),
    },
  ];
  const liveRecords = projectRuns.filter((r) => r.trigger !== "sample_replay");
  const qualification = [
    {
      label: "End-to-end pass",
      ok: liveRecords.some((r) => r.exitCode === 0 && r.hasEvidence),
    },
    {
      label: "Confirmed bug detected",
      ok: liveRecords.some((r) => r.resultCode === "740" && r.hasEvidence),
    },
    {
      label: "Closed loop verified",
      ok: projectBattles.some(
        (b) => b.mode !== "sample_replay" && b.attempts > 0 && !!b.receiptHash,
      ),
    },
  ];
  const recent = projectRuns
    .filter((r) => runFilter === "all" || r.display === runFilter)
    .slice(0, 5);
  return (
    <div className="mission-page">
      <section className="mission-hero" aria-label="Operations overview">
        <img
          className="mission-terrain"
          src="/images/mission-landscape.jpg"
          alt="Violet wireframe terrain scan of a mountain range"
        />
        <div className="terrain-shade" />
        <span className="hero-cross cross-a">+</span>
        <span className="hero-cross cross-b">+</span>
        <div className="hero-coordinate">
          FIG. 01 <i /> TOPOGRAPHIC SCAN
        </div>
        <div className="mission-hero-copy">
          <div className="mission-eyebrow">
            <span className="eyebrow-bars">
              <i />
              <i />
              <i />
            </span>
            OPERATIONS OVERVIEW
          </div>
          <h1>
            Mission Control<span>.</span>
          </h1>
          <p>Your command center for continuous verification.</p>
          <div className="hero-actions">
            <button className="mc-primary" onClick={() => setDialog("new-run")}>
              <Play size={13} fill="currentColor" />
              Trigger run
            </button>
            <button
              className="mc-ghost"
              onClick={() => go("project", { tab: "Run history" })}
            >
              <ListVideo size={14} />
              Run ledger
              <ArrowUpRight size={12} />
            </button>
          </div>
        </div>
        <span className={`hero-health ${loadError ? "degraded" : ""}`}>
          <i />
          {loadError ? "READ-ONLY" : "SYSTEM ONLINE"}
        </span>
      </section>
      <div className="telemetry-heading">
        <div>
          <span className="section-mark" />
          <h2>Telemetry overview</h2>
          <span className="snapshot-tag">
            {sample ? "SAMPLE DATA" : "WORKSPACE"}
          </span>
        </div>
        <label className="mc-select">
          <Clock3 size={12} />
          <select
            aria-label="Activity time range"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          >
            <option value="24">Last 24 hours</option>
            <option value="12">Last 12 hours</option>
            <option value="6">Last 6 hours</option>
          </select>
          <ChevronDown size={11} />
        </label>
      </div>
      <div className="metric-grid">
        {metrics.map((m) => (
          <button
            key={m.label}
            className={`mc-metric ${m.tag}`}
            onClick={m.open}
          >
            <div className="metric-top">
              <span className="metric-icon">
                <m.icon size={15} />
              </span>
              <span>{m.label}</span>
              <ArrowUpRight size={12} className="metric-link" />
            </div>
            <div className="metric-middle">
              <strong>
                {m.value}
                <em>{m.unit}</em>
              </strong>
              <Sparkline values={m.data} color={m.color} />
            </div>
            <span className="metric-sub">{m.sub}</span>
          </button>
        ))}
      </div>
      <div className="mc-analysis-row">
        <ExecutionChart
          buckets={buckets}
          start={start}
          span={span}
          openRun={(r) => go("theater", { id: r.id })}
        />
        <section className="mc-panel mc-arena">
          <div className="mc-panel-head">
            <div className="mc-card-title">
              <Swords size={16} />
              <h2>Adversarial arena</h2>
            </div>
            <span className="arena-chip">{sample ? "REPLAY" : "ARENA"}</span>
          </div>
          <button
            className="arena-preview"
            aria-label="Inspect the adversarial arena"
            onClick={() => go("arena")}
          >
            <img
              src="/images/battle-stage.jpg"
              alt="Red Saboteur and blue Healer agents facing one another"
            />
            <span className="arena-reticle">
              <i />
              VS
              <i />
            </span>
            <span className="arena-team-name red-side">
              <small>RED TEAM</small>Saboteur
            </span>
            <span className="arena-team-name blue-side">
              <small>BLUE TEAM</small>Healer
            </span>
          </button>
          <div className="arena-caption">
            <span className="arena-dot" />
            {projectBattles.length} battle
            {projectBattles.length !== 1 ? "s" : ""} in the ledger
            <button onClick={() => go("arena")}>
              Open arena
              <ArrowRight size={13} />
            </button>
          </div>
        </section>
      </div>
      <section className="mc-panel recent-panel">
        <div className="mc-panel-head">
          <div className="mc-card-title">
            <History size={17} />
            <h2>Recent executions</h2>
          </div>
          <div className="table-actions">
            <label className="recent-select">
              <select
                aria-label="Filter recent executions"
                value={runFilter}
                onChange={(e) => setRunFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="healed">Healed</option>
              </select>
              <ChevronDown size={11} />
            </label>
            <span />
            <button onClick={() => go("project", { tab: "Run history" })}>
              View all
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
        <div className="mc-table-scroll">
          <table className="mc-run-table">
            <thead>
              <tr>
                <th>EXECUTION</th>
                <th>TARGET</th>
                <th>STATUS</th>
                <th>DURATION</th>
                <th>
                  STARTED <small>UTC</small>
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} onClick={() => go("theater", { id: r.id })}>
                  <td>
                    <button
                      className="run-title"
                      onClick={(e) => {
                        e.stopPropagation();
                        go("theater", { id: r.id });
                      }}
                    >
                      <span className="run-surface-symbol">
                        <Terminal size={14} />
                      </span>
                      <span>
                        <b>{r.name}</b>
                        <small>
                          {r.label}
                          <i /> {r.surface}
                        </small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <span className="table-platform">
                      {r.platform === "desktop_web" ? (
                        <Monitor size={13} />
                      ) : (
                        <Smartphone size={13} />
                      )}{" "}
                      {r.platform === "desktop_web"
                        ? "Desktop web"
                        : "Mobile grid"}
                    </span>
                  </td>
                  <td>
                    <span className={`result-pill ${r.display}`}>
                      <i />
                      {r.display === "failed"
                        ? "Caught"
                        : r.display.charAt(0).toUpperCase() +
                          r.display.slice(1)}
                    </span>
                  </td>
                  <td className="table-mono">{duration(r.duration)}</td>
                  <td className="table-mono">{time(r.at)}</td>
                  <td>
                    <ChevronRight size={13} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!recent.length && (
            <div className="mc-empty">
              No executions match this filter.{" "}
              {projectRuns.length === 0
                ? "Trigger a run to start your ledger."
                : "Choose another status."}
            </div>
          )}
        </div>
      </section>
      <div className="mc-summary-row">
        <section className="mc-panel mc-summary-box">
          <h2>
            <ShieldCheck size={15} />
            Qualification signals
          </h2>
          {qualification.map((c) => (
            <div key={c.label} className="mc-check-line">
              {c.ok ? (
                <CircleCheck size={12} className="green" />
              ) : (
                <Clock3 size={12} />
              )}{" "}
              {c.label}
              <b className={c.ok ? "ok" : ""}>
                {c.ok ? "ON RECORD" : "AWAITING LIVE RUN"}
              </b>
            </div>
          ))}
        </section>
        <section className="mc-panel mc-summary-box">
          <h2>
            <Waypoints size={15} />
            Coverage health
          </h2>
          <strong className="mc-summary-amount">
            {project.coveragePct.toFixed(1)}%
          </strong>
          <div className="mc-coverage-line">
            <i style={{ width: `${project.coveragePct}%` }} />
          </div>
          <p>
            {project.covered} of{" "}
            {project.requirements.filter((r) => r.trust !== "stale").length}{" "}
            {sample ? "sample " : ""}requirements covered
          </p>
          <button onClick={() => go("coverage")}>
            Inspect coverage
            <ArrowUpRight size={11} />
          </button>
        </section>
        <section className="mc-panel mc-summary-box">
          <h2>
            <Cpu size={15} />
            Credit economics
          </h2>
          <strong className="mc-summary-amount">
            {creditsKnown
              ? Math.round(credits).toLocaleString()
              : consumed.toFixed(1)}
          </strong>
          <p>
            {creditsKnown
              ? "Credits remaining in the workspace budget"
              : "Live credits consumed · Replay is free"}
          </p>
          <button onClick={() => go("billing")}>
            Usage details
            <ArrowUpRight size={11} />
          </button>
        </section>
      </div>
      <div className="mc-bottom">
        <span>
          <GitBranch size={12} />
          {project.repo}
          <i />
          {project.branch}
        </span>
        <span>
          <Box size={11} />
          {sample
            ? "Illustrative replay workspace"
            : system?.worker
              ? "Cloud worker configured"
              : "Local control plane"}
        </span>
      </div>
    </div>
  );
}
