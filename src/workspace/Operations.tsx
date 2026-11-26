import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronDown,
  FileCode2,
  FileText,
  Flag,
  FlaskConical,
  GitBranch,
  Maximize,
  Minus,
  Move,
  Play,
  Plus,
  Radio,
  ShieldCheck,
  Sparkles,
  Swords,
  Waypoints,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  CHAOS_SCENARIOS,
  MAX_ATTEMPTS,
  scenarioNames,
  shortId,
} from "@/lib/types";
import { Dot, Empty, IconButton, PageHead, PanelHeading, Tag } from "./ui";
import {
  api,
  battleBlocked,
  downloadFile,
  errorText,
  stageIndex,
  stages,
  stamp,
  stateLabel,
  time,
  useProject,
  type Battle,
} from "./workspace";

export function DiffBlock({ diff }: { diff: string }) {
  return (
    <pre className="diff-block">
      {diff.split("\n").map((l, i) => (
        <span
          key={i}
          className={
            /^(\+\+\+|---|@@)/.test(l)
              ? "hunk"
              : l[0] === "+"
                ? "add"
                : l[0] === "-"
                  ? "del"
                  : ""
          }
        >
          {l || " "}
        </span>
      ))}
    </pre>
  );
}
const battleTitle = (b: Battle) =>
  scenarioNames[b.scenario || ""] ||
  (b.prNumber ? `PR #${b.prNumber} gate` : b.mode.replace(/_/g, " "));

export function Arena() {
  const {
    project,
    projects,
    setProjectId,
    projectBattles,
    postmortems,
    go,
    query,
    act,
    refresh,
    system,
  } = useProject();
  const [scenario, setScenario] = useState<string>(CHAOS_SCENARIOS[0]);
  const [targetUrl, setTargetUrl] = useState("");
  const [objective, setObjective] = useState("");
  const [mobile, setMobile] = useState(false);
  // "lab" = owned Chaos Lab target (needs only the worker); "repo" = GitHub branch + LLM agents.
  const [target, setTarget] = useState<"lab" | "repo">("lab");
  const [selected, setSelected] = useState(query.id || "");
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");
  const [audit, setAudit] = useState(true);
  const [openHistory, setOpenHistory] = useState("");
  const battle =
    projectBattles.find((b) => b.id === selected) || projectBattles[0];
  const step = battle ? stageIndex(battle) : -1;
  // Only stages that actually happened are marked; a first-time pass skips the repair loop.
  const occurred = battle
    ? [
        true,
        !!battle.scenario,
        battle.attempts > 0 || battle.state === "REFEREE_FAIL",
        battle.attempts > 0,
        battle.antiCheatChecks.length > 0,
        ["REFEREE_PASS", "PUBLISHED"].includes(battle.state),
        battle.state === "PUBLISHED",
      ]
    : [];
  useEffect(() => {
    if (query.id) setSelected(query.id);
  }, [query.id]);

  const missing = [
    !system?.worker &&
      "a cloud Kane worker (KANE_WORKER_URL, WORKER_SHARED_SECRET)",
    target === "repo" &&
      !system?.github &&
      "repository write access (GITHUB_TOKEN)",
    target === "repo" &&
      !system?.llm &&
      "an agent model (GROQ_API_KEY or GEMINI_API_KEY)",
  ].filter(Boolean);

  const launch = async () => {
    setLaunching(true);
    setError("");
    try {
      const r = await api<{ battleId: string }>("/api/arena/sabotage", {
        json: {
          projectId: project.id,
          chaosScenario: scenario,
          target,
          targetUrl:
            target === "repo" ? targetUrl.trim() || undefined : undefined,
          objective: objective.trim() || undefined,
          targets: mobile ? ["desktop_web", "remote_pixel_7"] : undefined,
        },
      });
      await refresh();
      setSelected(r.battleId);
    } catch (e) {
      setError(errorText(e));
    }
    setLaunching(false);
  };
  const red =
    battle?.log.filter((l) => ["red", "referee", "system"].includes(l.actor)) ||
    [];
  const blue =
    battle?.log.filter((l) =>
      ["blue", "audit", "publisher"].includes(l.actor),
    ) || [];
  const post = battle && postmortems.find((p) => p.battleId === battle.id);
  const failedChecks =
    battle?.antiCheatChecks.filter((c) => !c.passed).length || 0;
  return (
    <>
      <PageHead
        eyebrow="CONTROL ROOM / ADVERSARIAL LOOP"
        title="Adversarial Arena"
        description="Red team breaks an isolated branch. Kane CLI referees. Blue team heals under audit."
      />
      <div className="page-content">
        {(
          <>
            {missing.length > 0 && (
              <div className="notice-banner" role="status">
                <AlertTriangle size={15} />
                <span>
                  A battle mutates a real chaos branch and runs real Kane CLI
                  sessions, so it needs {missing.join("; ")}. Until then the
                  saboteur stays locked. See Integrations.
                </span>
              </div>
            )}
            <div
              className="arena-target-switch"
              role="group"
              aria-label="Sabotage target"
            >
              <button
                aria-pressed={target === "lab"}
                onClick={() => setTarget("lab")}
              >
                <FlaskConical size={14} />
                Chaos Lab (owned target)
              </button>
              <button
                aria-pressed={target === "repo"}
                onClick={() => setTarget("repo")}
              >
                <GitBranch size={14} />
                Repository branch
              </button>
            </div>
            {target === "lab" && (
              <div className="lab-explainer">
                <FlaskConical size={16} />
                <span>
                  The saboteur mutates this battle&apos;s copy of{" "}
                  <code>lab/checkout.config.json</code>, which drives the
                  public storefront at{" "}
                  <a href="/lab/checkout" target="_blank" rel="noreferrer">
                    /lab/checkout
                  </a>
                  . Kane CLI referees that live page in a real browser, the
                  healer repairs the file under the anti-cheat audit, and a
                  pass is sealed with an HMAC receipt. Only the cloud worker is
                  required; a Groq or Gemini key upgrades the healer from a
                  scoped revert to a model-written patch.
                </span>
              </div>
            )}
            <div className="launch-bar">
              <label className="field">
                Chaos scenario
                <select
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                >
                  {CHAOS_SCENARIOS.map((s) => (
                    <option key={s} value={s}>
                      {scenarioNames[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Target project
                <select
                  value={project.id}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  {projects
                    .filter((p) => !p.archived)
                    .map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              <label
                className="field branch-field"
                style={target === "lab" ? { display: "none" } : undefined}
              >
                Chaos branch deployment URL
                <input
                  type="url"
                  value={targetUrl}
                  placeholder={project.previewUrlTemplate || project.staging}
                  onChange={(e) => setTargetUrl(e.target.value)}
                />
              </label>
              <button
                className="btn primary unleash"
                onClick={launch}
                disabled={launching || missing.length > 0}
              >
                <Zap size={14} />
                {launching ? "Injecting fault..." : "Unleash Saboteur"}
              </button>
            </div>
            <div className="form-stack" style={{ marginBottom: 20 }}>
              <label
                className="field"
                style={target === "lab" ? { display: "none" } : undefined}
              >
                Referee objective (optional)
                <textarea
                  rows={2}
                  value={objective}
                  placeholder="Leave empty to use this scenario's default plain-English objective with Network and Console DevTools assertions."
                  onChange={(e) => setObjective(e.target.value)}
                />
              </label>
              <div className="target-checks">
                <label>
                  <input type="checkbox" checked readOnly /> Desktop Chrome
                  (headless)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={mobile}
                    onChange={(e) => setMobile(e.target.checked)}
                  />{" "}
                  Pixel 7, Android 14 (cloud grid, --remote)
                </label>
                <span className="muted small-note">
                  {target === "lab"
                    ? "Lab battles use a virtual chaos-lab/battle-* branch; the baseline lab is never modified."
                    : `The saboteur commits to chaos-pact/battle-*, branched from ${project.branch}. The default branch is never touched.`}
                </span>
              </div>
              {error && (
                <p role="alert" className="error-message">
                  {error}
                </p>
              )}
            </div>
          </>
        )}
        <section className="panel arena-stage">
          <div className="arena-stage-head">
            <span className="eyebrow gold">
              <Radio size={13} />
              BATTLE STAGE
            </span>
            <span className="mono muted">
              {battle
                ? `${battle.label} / ${battle.branch || "no branch"}`
                : "STANDBY"}
            </span>
            <Tag
              color={
                !battle
                  ? "muted"
                  : battleBlocked(battle)
                    ? "red"
                    : step >= 5
                      ? "green"
                      : "gold"
              }
            >
              {battle ? stateLabel(battle) : "No battle yet"}
            </Tag>
          </div>
          <div className="arena-art">
            <div>
              <span className="eyebrow red">RED TEAM</span>
              <h2>Saboteur</h2>
            </div>
            <span className="versus">
              <b>VS</b>
            </span>
            <div>
              <span className="eyebrow cyan">BLUE TEAM</span>
              <h2>Healer</h2>
            </div>
          </div>
          <div className="state-machine">
            {stages.map((s, i) => (
              <div
                className={`${occurred[i] ? "reached" : ""} ${i === step ? "current" : ""}`}
                key={s}
              >
                <span>
                  {occurred[i] && i < step ? <Check size={12} /> : i + 1}
                </span>
                <strong>{s}</strong>
                <small>
                  {battle && i === step
                    ? `${time(battle.updatedAt)} UTC`
                    : occurred[i]
                      ? "done"
                      : i < step
                        ? "not needed"
                        : "--:--"}
                </small>
              </div>
            ))}
          </div>
          {battle?.error && (
            <div className="notice-banner red" role="alert">
              <AlertTriangle size={15} />
              <span>{battle.error}</span>
            </div>
          )}
          <div className="battle-log-grid log-lines">
            <div>
              <h3>
                <Dot color="red" />
                Saboteur &amp; referee log{" "}
                <span>
                  {battle ? battleTitle(battle).toUpperCase() : "IDLE"}
                </span>
              </h3>
              {red.map((l, i) => (
                <p key={i}>
                  <span>{l.at.slice(11, 19)}</span>
                  {l.message}
                </p>
              ))}
              {!red.length && (
                <p className="muted">
                  No battle has been launched for this project.
                </p>
              )}
            </div>
            <div>
              <h3>
                <Dot color="cyan" />
                Healer log{" "}
                <span>
                  ATTEMPTS {battle?.attempts || 0}/{MAX_ATTEMPTS}
                </span>
              </h3>
              {blue.map((l, i) => (
                <p key={i}>
                  <span>{l.at.slice(11, 19)}</span>
                  {l.message}
                </p>
              ))}
              {!blue.length && (
                <p className="muted">
                  The healer engages after Kane CLI fails a build.
                </p>
              )}
            </div>
          </div>
          <div className="arena-controls">
            <span>
              <Swords size={13} />
              {battle
                ? battleTitle(battle)
                : "Choose a scenario to get started"}
            </span>
            {battle?.beforeRunId && (
              <button
                className="btn secondary compact"
                onClick={() => go("theater", { id: battle.beforeRunId! })}
              >
                <Play size={12} /> Failing run{" "}
                {shortId("RUN", battle.beforeRunId)}
              </button>
            )}
            {battle?.afterRunId && battle.afterRunId !== battle.beforeRunId && (
              <button
                className="btn secondary compact"
                onClick={() => go("theater", { id: battle.afterRunId! })}
              >
                <Play size={12} /> Re-verification{" "}
                {shortId("RUN", battle.afterRunId)}
              </button>
            )}
            {battle?.state === "REFEREE_FAIL" && (
              <button
                className="btn primary compact"
                onClick={() =>
                  act(
                    () =>
                      api("/api/agent/heal", { json: { battleId: battle.id } }),
                    "Blue-Team healer engaged",
                  )
                }
              >
                <Sparkles size={12} /> Trigger Blue-Team repair
              </button>
            )}
            {battle?.state === "REFEREE_PASS" &&
              battle.attempts > 0 &&
              !post && (
                <button
                  className="btn primary compact"
                  onClick={() =>
                    act(
                      () =>
                        api("/api/blog/publish", {
                          json: { battleId: battle.id },
                        }),
                      "Receipt signed. Post-mortem sent for self-verification.",
                    )
                  }
                >
                  <FileText size={12} /> Publish post-mortem
                </button>
              )}
            {post && (
              <a
                className="btn secondary compact"
                href={`/postmortems/${post.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                <FileText size={12} /> Post-mortem <ArrowUpRight size={11} />
              </a>
            )}
            {battle?.receiptHash && (
              <a
                className="btn secondary compact"
                href={`/api/receipt/${battle.id}`}
                target="_blank"
                rel="noreferrer"
              >
                <ShieldCheck size={12} /> HMAC receipt
              </a>
            )}
          </div>
        </section>
        {battle &&
          (battle.saboteurDiff ||
            battle.healerDiff ||
            battle.antiCheatChecks.length > 0) && (
            <section className="panel audit-panel">
              <button className="audit-toggle" onClick={() => setAudit(!audit)}>
                <ShieldCheck size={17} className="gold" />
                <strong>Anti-cheat patch-intent audit</strong>
                {battle.antiCheatChecks.length ? (
                  <Tag color={failedChecks ? "red" : "green"}>
                    {failedChecks
                      ? `${failedChecks} check${failedChecks === 1 ? "" : "s"} failed`
                      : `${battle.antiCheatChecks.length} checks passed`}
                  </Tag>
                ) : (
                  <Tag>No patch audited yet</Tag>
                )}
                <ChevronDown size={14} />
              </button>
              {audit && (
                <div className="stack-gap" style={{ padding: "0 18px 18px" }}>
                  {battle.saboteurDiff && (
                    <div>
                      <div className="micro-label">RED-TEAM MUTATION</div>
                      <DiffBlock diff={battle.saboteurDiff} />
                    </div>
                  )}
                  {battle.healerDiff && (
                    <div>
                      <div className="micro-label">
                        BLUE-TEAM PATCH{" "}
                        {battle.antiCheatPassed === false
                          ? "(REJECTED BY AUDIT)"
                          : ""}
                      </div>
                      <DiffBlock diff={battle.healerDiff} />
                    </div>
                  )}
                  <div>
                    {battle.antiCheatChecks.map((c) => (
                      <div className="check-line" key={c.name} title={c.detail}>
                        {c.passed ? (
                          <Check size={13} />
                        ) : (
                          <X size={13} className="red" />
                        )}
                        <span>
                          <b className={c.passed ? "" : "red"}>{c.name}.</b>{" "}
                          <span className="muted">{c.detail}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        <div className="section-title spaced">
          <h2>Battle history</h2>
          <span className="mono muted">{projectBattles.length} records</span>
        </div>
        {projectBattles.map((b) => (
          <div className="history-item" key={b.id}>
            <button
              className="record-row"
              onClick={() => setOpenHistory(openHistory === b.id ? "" : b.id)}
            >
              <span className="mono muted">{b.label}</span>
              <strong>{battleTitle(b)}</strong>
              <Tag
                color={
                  battleBlocked(b)
                    ? "red"
                    : stageIndex(b) >= 5
                      ? "green"
                      : "gold"
                }
              >
                {stateLabel(b)}
              </Tag>
              <ChevronDown size={14} />
            </button>
            {openHistory === b.id && (
              <div className="history-details">
                <span>
                  {b.attempts} healing attempt{b.attempts === 1 ? "" : "s"} /{" "}
                  {stamp(b.at)} UTC
                </span>
                <button
                  className="text-button"
                  onClick={() => {
                    setSelected(b.id);
                    document
                      .querySelector(".arena-stage")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Inspect battle <ArrowUpRight size={12} />
                </button>
                {(b.afterRunId || b.beforeRunId) && (
                  <button
                    className="text-button"
                    onClick={() =>
                      go("theater", {
                        id: (b.afterRunId || b.beforeRunId)!,
                        replay: "1",
                      })
                    }
                  >
                    Replay referee run <ArrowUpRight size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {!projectBattles.length && (
          <Empty
            title="No battles on record"
            description="Unleash the saboteur, or connect the GitHub webhook so pull requests are gated automatically."
          />
        )}
      </div>
    </>
  );
}

export function Coverage() {
  const { project, query, act, startRun, go } = useProject();
  const reqs = project.requirements;
  const [selectedId, setSelectedId] = useState(
    query.req ||
      reqs.find((r) => r.trust !== "trusted")?.id ||
      reqs[0]?.id ||
      "",
  );
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const selected = reqs.find((r) => r.id === selectedId) || reqs[0];
  const nodes = selected
    ? [selected, ...reqs.filter((r) => r.id !== selected.id)].slice(0, 5)
    : [];
  const gaps = reqs.filter((r) => r.trust !== "trusted");
  const tracked = reqs.filter((r) => r.trust !== "stale").length;
  if (!reqs.length)
    return (
      <>
        <PageHead
          eyebrow="ASSURANCE / REQUIREMENT GRAPH"
          title="Coverage Map"
          description="Trace every product claim to the Kane CLI run that proves it."
        />
        <div className="page-content">
          <Empty
            title="No specification ingested"
            description="Sync a PRD or README from the project page. Each list item becomes a requirement to prove."
          />
          <button className="btn primary" onClick={() => go("project")}>
            Open project <ArrowUpRight size={13} />
          </button>
        </div>
      </>
    );
  return (
    <>
      <PageHead
        eyebrow="ASSURANCE / REQUIREMENT GRAPH"
        title="Coverage Map"
        description="Trace every product claim to the Kane CLI run that proves it."
        action={
          <Tag color="gold">
            {project.coveragePct.toFixed(1)}% proven ({project.covered}/
            {tracked})
          </Tag>
        }
      />
      <div className="page-content">
        <div className="coverage-layout">
          <section className="panel graph-panel">
            <PanelHeading
              icon={Waypoints}
              action={
                <div className="graph-actions">
                  <IconButton
                    icon={Minus}
                    label="Zoom out"
                    onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
                  />
                  <span>{Math.round(zoom * 100)}%</span>
                  <IconButton
                    icon={Plus}
                    label="Zoom in"
                    onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
                  />
                  <IconButton
                    icon={Maximize}
                    label="Reset map view"
                    onClick={() => {
                      setZoom(1);
                      setPan({ x: 0, y: 0 });
                    }}
                  />
                </div>
              }
            >
              Assurance graph
            </PanelHeading>
            <div
              className="graph-canvas"
              onWheel={(e) =>
                setZoom((z) =>
                  Math.min(2, Math.max(0.6, z - (e.deltaY > 0 ? 0.03 : -0.03))),
                )
              }
              onPointerDown={(e) => {
                drag.current = {
                  x: e.clientX,
                  y: e.clientY,
                  px: pan.x,
                  py: pan.y,
                };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (drag.current)
                  setPan({
                    x: drag.current.px + e.clientX - drag.current.x,
                    y: drag.current.py + e.clientY - drag.current.y,
                  });
              }}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
            >
              <svg
                viewBox="0 0 600 455"
                role="img"
                aria-label="Graph connecting requirements to their test specifications"
              >
                <g
                  transform={`translate(${pan.x} ${pan.y}) translate(300 225) scale(${zoom}) translate(-300 -225)`}
                >
                  <text x="28" y="39" className="graph-label">
                    REQUIREMENTS
                  </text>
                  <text x="374" y="39" className="graph-label">
                    TEST SPECIFICATIONS
                  </text>
                  {nodes.map((n, i) => {
                    const y = 69 + i * 76;
                    const off = i % 2 ? 15 : -15;
                    return (
                      <g key={n.id} className={`graph-node ${n.trust}`}>
                        <path
                          d={`M219 ${y + 21} C280 ${y + 21} 307 ${y + 21 + off} 369 ${y + 21 + off}`}
                          className={`edge ${n.testmd ? "" : "derived"}`}
                        />
                        <rect x="22" y={y} width="197" height="42" rx="4" />
                        <text x="36" y={y + 15} className="node-id">
                          {n.id} / {n.trust.toUpperCase()}
                        </text>
                        <text x="36" y={y + 31}>
                          {n.text.length > 23
                            ? `${n.text.slice(0, 22)}...`
                            : n.text}
                        </text>
                        <circle cx="219" cy={y + 21} r="3" />
                        <rect
                          x="369"
                          y={y + off}
                          width="208"
                          height="42"
                          rx="4"
                        />
                        <text x="381" y={y + 15 + off} className="node-id">
                          {n.trust === "trusted"
                            ? "PROVEN BY RUN"
                            : n.testmd
                              ? "DRAFT SPEC, UNPROVEN"
                              : "UNCOVERED"}
                        </text>
                        <text x="381" y={y + 31 + off}>
                          {n.testmdPath
                            ? n.testmdPath
                                .split("/")
                                .pop()!
                                .replace(/_test\.md$/, "")
                                .slice(0, 24)
                            : "Awaiting specification"}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
            <div className="graph-legend">
              <span>
                <i className="gold" />
                Trusted (a run passed)
              </span>
              <span>
                <i className="muted dashed" />
                Derived (unproven)
              </span>
              <span>
                <i className="gold dashed" />
                Stale (left the source)
              </span>
              <span>
                <Move size={12} />
                Drag to pan
              </span>
            </div>
          </section>
          <aside className="panel gap-panel">
            <PanelHeading
              icon={Flag}
              action={<Tag color="gold">{gaps.length}</Tag>}
            >
              Coverage gaps
            </PanelHeading>
            <p className="panel-subtitle">
              Claims no passing Kane CLI run has proven yet.
            </p>
            <div className="gap-list">
              {gaps.map((r) => (
                <button
                  key={r.id}
                  className={selected?.id === r.id ? "selected" : ""}
                  onClick={() => setSelectedId(r.id)}
                >
                  <span className="radio-circle" />
                  <span>
                    <small>{r.id}</small>
                    <strong>{r.text}</strong>
                  </span>
                  <i className={r.trust === "stale" ? "red" : "gold"}>
                    {r.trust === "stale" ? "STALE" : r.testmd ? "SPEC" : "OPEN"}
                  </i>
                </button>
              ))}
              {!gaps.length && (
                <Empty
                  title="No open gaps"
                  description="Every requirement is proven by a passing run."
                />
              )}
            </div>
            <button
              className="btn primary"
              disabled={!selected || selected.trust === "trusted"}
              onClick={() =>
                act(
                  () =>
                    api(`/api/projects/${project.id}/requirements`, {
                      json: { requirementId: selected.id },
                    }),
                  "Draft _test.md written. Run it to prove the requirement.",
                )
              }
            >
              <FileCode2 size={13} />
              {selected?.testmd
                ? "Regenerate draft spec"
                : "Generate test for gap"}
            </button>
          </aside>
        </div>
        {selected?.testmd && (
          <section className="panel generated-spec">
            <PanelHeading
              icon={FileCode2}
              action={
                <div className="inline-icon">
                  <button
                    className="text-button"
                    onClick={() =>
                      downloadFile(
                        selected.testmdPath!.split("/").pop()!,
                        selected.testmd!,
                        "text/markdown",
                      )
                    }
                  >
                    <ArrowDownToLine size={12} />
                    Download spec
                  </button>
                  <button
                    className="btn primary compact"
                    onClick={() =>
                      startRun({
                        executionMode: "live_cloud",
                        name: `${selected.id}: ${selected.text}`.slice(0, 110),
                        testmdContent: selected.testmd,
                        surface: "testmd",
                        targets: ["desktop_web"],
                        requirementId: selected.id,
                      })
                    }
                  >
                    <Play size={12} />
                    Run with Kane CLI
                  </button>
                </div>
              }
            >
              {selected.testmdPath}
            </PanelHeading>
            <pre>{selected.testmd}</pre>
          </section>
        )}
      </div>
    </>
  );
}
