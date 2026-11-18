import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  Coins,
  Crosshair,
  Flag,
  GitBranch,
  Info,
  Play,
  RefreshCw,
  ShieldCheck,
  Swords,
  Timer,
  Waypoints,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Dot, Gauge, PageHead, PanelHeading } from "./ui";
import { stages, time, useWorkspace } from "./workspace";

export function Dashboard() {
  const {
    project,
    projectRuns,
    runs: allRuns,
    projectBattles,
    go,
    credits,
    limit,
    setDialog,
    toast,
  } = useWorkspace();
  const [range, setRange] = useState("24h");
  const [hover, setHover] = useState<number | null>(null);
  const [focusedTick, setFocusedTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const runs = useMemo(
    () =>
      projectRuns.filter(
        (r) => Date.now() - r.at < Number(range.slice(0, -1)) * 3600000,
      ),
    [projectRuns, range],
  );
  const current = projectRuns[0];
  const live = projectBattles.filter((b) => b.step < 5);
  const bars = [...runs].reverse();
  const p = project.requirements
    ? (project.covered / project.requirements) * 100
    : 0;
  const consumption = useMemo(() => {
    const values = [1420, 680, 420, 240];
    allRuns
      .filter((r) => Number(r.id.split("-")[1]) > 128)
      .forEach((r) => {
        const category =
          r.surface === "explore"
            ? 2
            : r.status === "healed"
              ? 3
              : /Pixel|iPhone|Mobile/i.test(r.platform)
                ? 1
                : 0;
        values[category] += r.credits;
      });
    return [
      ["Desktop web", values[0], "gold"],
      ["Mobile grid", values[1], "cyan"],
      ["Exploration", values[2], "violet"],
      ["Re-verification", values[3], "red"],
    ];
  }, [allRuns]);
  const totals = [
    { label: "Total runs", n: runs.length, color: "white" },
    {
      label: "Passed",
      n: runs.filter((r) => r.status === "passed").length,
      color: "gold",
    },
    {
      label: "Caught",
      n: runs.filter((r) => r.status === "failed").length,
      color: "red",
    },
    {
      label: "Healed",
      n: runs.filter((r) => r.status === "healed").length,
      color: "cyan",
    },
  ];
  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toast("Workspace telemetry refreshed. All workers are online.");
    }, 650);
  };
  return (
    <>
      <PageHead
        terrain
        eyebrow="OPERATIONS OVERVIEW"
        title="Mission Control"
        description="Your verification workspace, in real time."
        action={
          <>
            <button
              className={`btn secondary refresh-button ${refreshing ? "refreshing" : ""}`}
              aria-label="Refresh dashboard"
              onClick={refresh}
            >
              <RefreshCw size={15} />
            </button>
            <button
              className="btn primary"
              onClick={() => setDialog("new-run")}
            >
              <Play size={13} fill="currentColor" />
              Trigger run
            </button>
          </>
        }
      />
      <div className="dashboard-grid">
        <section className="panel pulse-panel">
          <PanelHeading
            icon={Activity}
            action={
              <div className="panel-tools">
                <span className="live-indicator">
                  <Dot color="green" pulse />
                  LIVE
                </span>
                <span className="mini-select">
                  <select
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    aria-label="Activity time range"
                  >
                    <option>24h</option>
                    <option>12h</option>
                    <option>6h</option>
                  </select>
                  <ChevronDown size={11} />
                </span>
              </div>
            }
          >
            Live Pulse
          </PanelHeading>
          <div className="pulse-metrics">
            {totals.map((v, i) => (
              <div key={v.label} className={i === 0 ? "main-metric" : ""}>
                <strong className={v.color}>{v.n}</strong>
                <span>
                  {i > 0 && <i className={`legend-dot ${v.color}`} />} {v.label}
                </span>
              </div>
            ))}
          </div>
          <div className="chart-area">
            <div className="tick-chart" onMouseLeave={() => setHover(null)}>
              {bars.map((r, i) => {
                const height =
                  25 +
                  Math.abs(Math.sin(i * 2.41) * 29 + Math.sin(i * 0.43) * 25) +
                  (r.status !== "passed" ? 20 : i % 17 === 0 ? 15 : 0);
                return (
                  <button
                    key={r.id}
                    className={`activity-tick ${r.status === "passed" ? "gold" : r.status === "failed" ? "red" : r.status === "healed" ? "cyan" : "green"}`}
                    style={{
                      height: `${Math.min(96, height)}%`,
                      opacity: 0.8 + (i % 4) * 0.065,
                    }}
                    onMouseEnter={() => setHover(i)}
                    tabIndex={i === Math.min(focusedTick, bars.length - 1) ? 0 : -1}
                    onFocus={() => { setHover(i); setFocusedTick(i); }}
                    onKeyDown={(event) => {
                      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                      event.preventDefault();
                      const next = event.key === 'Home' ? 0 : event.key === 'End' ? bars.length - 1 : Math.max(0, Math.min(bars.length - 1, i + (event.key === 'ArrowRight' ? 1 : -1)));
                      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('.activity-tick')[next]?.focus();
                    }}
                    onBlur={() => setHover(null)}
                    onClick={() => go("theater", { id: r.id })}
                    aria-label={`${r.id}, ${r.status}, ${time(r.at)} UTC`}
                  />
                );
              })}
              <span className="now-line" />
              {hover !== null && bars[hover] && (
                <div
                  className="chart-tooltip"
                  style={{
                    left: `${Math.min(74, Math.max(3, (hover / bars.length) * 100))}%`,
                  }}
                >
                  <b>{bars[hover].id}</b> {bars[hover].status}
                  <small>{time(bars[hover].at)} UTC</small>
                </div>
              )}
              {!bars.length && (
                <span className="no-telemetry">Waiting for your first run</span>
              )}
            </div>
            <div className="time-axis">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span key={i}>
                  {String(
                    Math.round((Number(range.slice(0, -1)) * i) / 6),
                  ).padStart(2, "0")}
                  :00
                </span>
              ))}
              <span className="gold">Now</span>
            </div>
          </div>
        </section>
        <section className="panel qualification-panel">
          <PanelHeading
            icon={ShieldCheck}
            action={
              <span
                className="info-tip"
                tabIndex={0}
                aria-label="Qualification checks reflect the latest run"
              >
                <Info size={14} />
                <span>Three signals from the latest execution.</span>
              </span>
            }
          >
            Qualification Tracker
          </PanelHeading>
          <p className="panel-subtitle">Latest run health checks</p>
          <div className="qualification-list">
            {[
              "Works end-to-end",
              "Kane caught something",
              "Agent \u2194 Kane talked",
            ].map((label, i) => {
              const ok = current && (i !== 0 || current.status !== "failed");
              return (
                <div className="qualification-row" key={label}>
                  <span className={`check-square ${ok ? "green" : "red"}`}>
                    {ok ? <Check size={11} /> : "!"}
                  </span>
                  <span>{label}</span>
                  <span className={`pass-label ${ok ? "green" : "red"}`}>
                    <Dot color={ok ? "green" : "red"} />
                    {ok ? "PASS" : current ? "FAIL" : "N/A"}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="qualification-foot">
            <span>
              <GitBranch size={11} />
              {current?.id.toLowerCase() || "No runs yet"}
            </span>
            <button
              className="text-button"
              disabled={!current}
              onClick={() => current && go("theater", { id: current.id })}
            >
              View run <ArrowUpRight size={12} />
            </button>
          </div>
        </section>
        <section className="panel battles-panel">
          <PanelHeading
            icon={Swords}
            action={
              <div className="panel-tools">
                <span className="battle-count">{live.length} active</span>
                <button
                  className="inline-arrow"
                  aria-label="Open Adversarial Arena"
                  onClick={() => go("arena")}
                >
                  <ArrowUpRight size={15} />
                </button>
              </div>
            }
          >
            Active Battles
          </PanelHeading>
          <button
            className="battle-art"
            onClick={() => go("arena")}
            aria-label="Spectate the Red Team versus Blue Team arena"
          >
            <span className="team-caption red">
              <i />
              SABOTEUR
            </span>
            <span className="versus">
              <b>VS</b>
            </span>
            <span className="team-caption cyan">
              HEALER
              <i />
            </span>
          </button>
          <div className="battle-rows">
            {(live.length ? live : projectBattles).slice(0, 2).map((b, i) => (
              <button
                className="battle-row"
                key={b.id}
                onClick={() => go("arena", { id: b.id })}
              >
                <div className="battle-row-title">
                  <span className="battle-id">{b.id}</span>
                  <strong>{b.scenario}</strong>
                  <span
                    className={`battle-state ${b.step === 4 ? "gold" : "cyan"}`}
                  >
                    <Dot color={b.step === 4 ? "gold" : "cyan"} />
                    {b.step === 4
                      ? "Anti-cheat audit"
                      : b.step === 3
                        ? "Healing"
                        : stages[b.step]}
                  </span>
                </div>
                <div className="battle-progress">
                  <i style={{ width: i ? "34%" : "43%" }} />
                  <i style={{ width: i ? "61%" : "39%" }} />
                  <i />
                </div>
              </button>
            ))}
            {!projectBattles.length && (
              <button className="inline-empty" onClick={() => go("arena")}>
                Launch your first arena simulation <ArrowRight size={13} />
              </button>
            )}
          </div>
        </section>
        <section className="panel economics-panel">
          <PanelHeading
            icon={Coins}
            action={
              <button
                className="inline-arrow"
                aria-label="Open billing and credits"
                onClick={() => go("billing")}
              >
                <ArrowUpRight size={15} />
              </button>
            }
          >
            Credit Economics
          </PanelHeading>
          <div className="economics-body">
            <Gauge value={credits} limit={limit} />
            <div className="spend-legend">
              <div className="micro-label">CONSUMPTION</div>
              {consumption.map(([label, amount, color]) => (
                <div className="spend-item" key={label}>
                  <div>
                    <span>{label}</span>
                    <strong>{Number(amount).toLocaleString()}</strong>
                  </div>
                  <div className="spend-track">
                    <i
                      className={String(color)}
                      style={{
                        width: `${Math.min(100, (Number(amount) / Math.max(1800, limit - credits)) * 145)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="economics-foot">
            <span>
              <Timer size={12} />
              Current billing cycle
            </span>
            <button onClick={() => go("billing")} className="text-button">
              Usage details <ArrowUpRight size={12} />
            </button>
          </div>
        </section>
        <section className="panel coverage-panel">
          <PanelHeading
            icon={Waypoints}
            action={
              <button className="text-button" onClick={() => go("coverage")}>
                Open coverage map <ArrowUpRight size={13} />
              </button>
            }
          >
            Coverage Health
          </PanelHeading>
          <div className="coverage-content">
            <div className="coverage-big">
              {p.toFixed(1)}
              <span>%</span>
            </div>
            <div className="coverage-track-wrap">
              <div className="coverage-track">
                <i style={{ width: `${p}%` }} />
                {[58, 77, 93].map((n, i) => (
                  <button
                    className="gap-flag"
                    style={{ left: `${n}%` }}
                    key={n}
                    title={`Inspect coverage gap ${i + 1}`}
                    onClick={() => go("coverage", { gap: String(i) })}
                  >
                    <Flag size={10} fill="currentColor" />
                  </button>
                ))}
              </div>
              <div className="coverage-annotations">
                <span>
                  <span className="gold">{project.covered}</span> /{" "}
                  {project.requirements} requirements covered
                </span>
                <button onClick={() => go("coverage")}>
                  <Flag size={10} />
                  {project.requirements - project.covered} coverage gaps
                </button>
              </div>
            </div>
          </div>
        </section>
        <div className="dashboard-bottom-note">
          <span>
            <Crosshair size={11} /> TELEMETRY STREAM CONNECTED
          </span>
          <span>
            <CheckCheck size={12} /> All changes synced
          </span>
        </div>
      </div>
    </>
  );
}
