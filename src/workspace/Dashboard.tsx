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
import { scenarioNames } from "@/lib/types";
import { Dot, Gauge, PageHead, PanelHeading } from "./ui";
import { battleBlocked, battleOpen, stageIndex, stages, stateLabel, time, useProject } from "./workspace";

export function Dashboard() {
  const {
    project,
    projectRuns,
    projectBattles,
    go,
    credits,
    limit,
    consumed,
    creditsKnown,
    setDialog,
    toast,
    refresh,
    syncedAt,
    loadError,
  } = useProject();
  const [range, setRange] = useState("24h");
  const [hover, setHover] = useState<number | null>(null);
  const [focusedTick, setFocusedTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const hours = Number(range.slice(0, -1));
  const runs = useMemo(
    () => projectRuns.filter((r) => Date.now() - r.at < hours * 3600000),
    [projectRuns, hours],
  );
  const current = projectRuns.find((r) => r.completedAt);
  const live = projectBattles.filter(battleOpen);
  const bars = [...runs].reverse();
  const longest = Math.max(1, ...bars.map((r) => r.duration));
  const tracked = project.requirements.filter((r) => r.trust !== "stale");
  const gaps = tracked.filter((r) => r.trust !== "trusted").length;
  const p = project.coveragePct;
  // Real credits_consumed reported by Kane CLI, grouped by where they were spent.
  const consumption = useMemo(() => {
    const values = [0, 0, 0, 0];
    projectRuns.forEach((r) => {
      const category =
        r.surface === "explore" ? 2 : r.role === "after" ? 3 : r.platform !== "desktop_web" ? 1 : 0;
      values[category] += r.credits;
    });
    return [
      ["Desktop web", values[0], "gold"],
      ["Mobile grid", values[1], "cyan"],
      ["Exploration", values[2], "violet"],
      ["Re-verification", values[3], "red"],
    ] as const;
  }, [projectRuns]);
  const spent = Math.max(1, ...consumption.map((c) => c[1]));
  const totals = [
    { label: "Total runs", n: runs.length, color: "white" },
    { label: "Passed", n: runs.filter((r) => r.display === "passed").length, color: "gold" },
    { label: "Caught", n: runs.filter((r) => r.display === "failed").length, color: "red" },
    { label: "Healed", n: runs.filter((r) => r.display === "healed").length, color: "cyan" },
  ];
  // The three hackathon qualification bars, each derived from recorded runs.
  const caught = projectRuns.find((r) => r.exitCode === 1 || r.resultCode === "740");
  const loop = projectBattles.find(
    (b) => b.attempts > 0 && ["REFEREE_PASS", "PUBLISHED"].includes(b.state),
  );
  const checks: { label: string; ok: boolean | null; hint: string }[] = [
    {
      label: "Works end-to-end",
      ok: current ? current.exitCode === 0 : null,
      hint: current ? `${current.label} exited ${current.exitCode}` : "No completed run yet",
    },
    {
      label: "Kane caught something",
      ok: caught ? true : null,
      hint: caught ? `${caught.label} exit 1${caught.resultCode ? `, result_code ${caught.resultCode}` : ""}` : "No failing verdict recorded",
    },
    {
      label: "Agent \u2194 Kane talked",
      ok: loop ? true : null,
      hint: loop ? `${loop.label} healed and re-verified` : "No healed battle yet",
    },
  ];
  const refresh_ = async () => {
    setRefreshing(true);
    const ok = await refresh();
    setRefreshing(false);
    toast(ok ? "Workspace refreshed from the database." : "Refresh failed: the API is unreachable.");
  };
  return (
    <>
      <PageHead
        terrain
        eyebrow="OPERATIONS OVERVIEW"
        title="Mission Control"
        description={`${project.name}: every Kane CLI run, battle and receipt on record.`}
        action={
          <>
            <button
              className={`btn secondary refresh-button ${refreshing ? "refreshing" : ""}`}
              aria-label="Refresh dashboard"
              onClick={refresh_}
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
                // Bar height is the run's real duration relative to the longest run.
                const height = 18 + (r.duration / longest) * 78;
                return (
                  <button
                    key={r.id}
                    className={`activity-tick ${r.display === "passed" ? "gold" : r.display === "healed" ? "cyan" : r.completedAt ? "red" : "green"}`}
                    style={{
                      height: `${Math.min(96, height)}%`,
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
                    aria-label={`${r.label}, ${r.display}, ${time(r.at)} UTC`}
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
                  <b>{bars[hover].label}</b> {bars[hover].display}
                  <small>{time(bars[hover].at)} UTC</small>
                </div>
              )}
              {!bars.length && (
                <span className="no-telemetry">Waiting for your first run</span>
              )}
            </div>
            <div className="time-axis">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span key={i}>{time(Date.now() - (hours * 3600000 * (6 - i)) / 6)}</span>
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
                <span>Three signals derived from recorded Kane CLI runs.</span>
              </span>
            }
          >
            Qualification Tracker
          </PanelHeading>
          <p className="panel-subtitle">Hackathon qualification bars</p>
          <div className="qualification-list">
            {checks.map(({ label, ok, hint }) => {
              const color = ok === null ? "muted" : ok ? "green" : "red";
              return (
                <div className="qualification-row" key={label} title={hint}>
                  <span className={`check-square ${color}`}>
                    {ok ? <Check size={11} /> : ok === null ? "-" : "!"}
                  </span>
                  <span>{label}</span>
                  <span className={`pass-label ${color}`}>
                    <Dot color={color === "muted" ? "gold" : color} />
                    {ok === null ? "N/A" : ok ? "PASS" : "FAIL"}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="qualification-foot">
            <span>
              <GitBranch size={11} />
              {current?.label || "No runs yet"}
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
            {(live.length ? live : projectBattles).slice(0, 2).map((b) => {
              const color = battleBlocked(b) ? "red" : stageIndex(b) >= 5 ? "green" : stageIndex(b) === 4 ? "gold" : "cyan";
              const progress = (stageIndex(b) / (stages.length - 1)) * 100;
              return (
                <button className="battle-row" key={b.id} onClick={() => go("arena", { id: b.id })}>
                  <div className="battle-row-title">
                    <span className="battle-id">{b.label}</span>
                    <strong>{scenarioNames[b.scenario || ""] || b.mode.replace(/_/g, " ")}</strong>
                    <span className={`battle-state ${color}`}>
                      <Dot color={color} />
                      {stateLabel(b)}
                    </span>
                  </div>
                  <div className="battle-progress">
                    <i style={{ width: `${Math.min(progress, 50)}%` }} />
                    <i style={{ width: `${Math.max(0, progress - 50)}%` }} />
                    <i />
                  </div>
                </button>
              );
            })}
            {!projectBattles.length && (
              <button className="inline-empty" onClick={() => go("arena")}>
                Launch your first adversarial battle <ArrowRight size={13} />
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
            {creditsKnown ? (
              <Gauge value={Math.round(credits)} limit={Math.round(limit)} />
            ) : (
              <div className="credit-unknown">
                Balance unknown. The worker reports its kane-cli balance on its first job, or set a budget in Billing.
              </div>
            )}
            <div className="spend-legend">
              <div className="micro-label">CONSUMPTION</div>
              {consumption.map(([label, amount, color]) => (
                <div className="spend-item" key={label}>
                  <div>
                    <span>{label}</span>
                    <strong>{amount.toFixed(1)}</strong>
                  </div>
                  <div className="spend-track">
                    <i
                      className={color}
                      style={{
                        width: `${(amount / spent) * 100}%`,
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
              {consumed.toFixed(1)} credits consumed by Kane CLI
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
              </div>
              <div className="coverage-annotations">
                <span>
                  <span className="gold">{project.covered}</span> / {tracked.length} requirements
                  proven by a passing run
                </span>
                <button onClick={() => go("coverage")}>
                  <Flag size={10} />
                  {gaps} coverage gap{gaps === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          </div>
        </section>
        <div className="dashboard-bottom-note">
          <span>
            <Crosshair size={11} /> {loadError ? "API UNREACHABLE" : "POLLING THE RUN LEDGER"}
          </span>
          <span>
            <CheckCheck size={12} /> {syncedAt ? `Synced ${time(syncedAt)} UTC` : "Syncing"}
          </span>
        </div>
      </div>
    </>
  );
}
