import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronDown,
  FileCode2,
  Flag,
  Maximize,
  Minus,
  Move,
  Pause,
  Play,
  Plus,
  Radio,
  ShieldCheck,
  Swords,
  Waypoints,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Dot, Empty, IconButton, PageHead, PanelHeading, Tag } from "./ui";
import {
  downloadFile,
  scenarios,
  stages,
  time,
  useStored,
  useWorkspace,
} from "./workspace";

export function Arena() {
  const {
    project,
    projects,
    setProjectId,
    projectBattles,
    setBattles,
    go,
    query,
    projectRuns,
    toast,
  } = useWorkspace();
  const [scenario, setScenario] = useState(scenarios[0]);
  const [selected, setSelected] = useState(
    query.id || projectBattles[0]?.id || "",
  );
  const [playing, setPlaying] = useState(false);
  const [branch, setBranch] = useState(project.branch);
  const [audit, setAudit] = useState(false);
  const [openHistory, setOpenHistory] = useState("");
  const battle =
    projectBattles.find((b) => b.id === selected) || projectBattles[0];
  const step = battle?.step ?? 0;
  useEffect(() => {
    if (query.id) setSelected(query.id);
  }, [query.id]);
  useEffect(() => {
    if (!playing || !battle || step >= 5) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => {
      const requiredAttempts =
        battle.scenario === "Hydration Crash"
          ? 3
          : battle.scenario === "Mobile CTA Overlap"
            ? 2
            : 1;
      if (step === 3 && battle.attempts < requiredAttempts) {
        setBattles((old) =>
          old.map((b) =>
            b.id === battle.id ? { ...b, attempts: b.attempts + 1 } : b,
          ),
        );
        return;
      }
      setBattles((old) =>
        old.map((b) => (b.id === battle.id ? { ...b, step: b.step + 1 } : b)),
      );
      if (step + 1 === 4) setAudit(true);
      if (step + 1 === 5) toast("Battle resolved. All audit checks passed.");
    }, 1800);
    return () => clearTimeout(t);
  }, [playing, battle, step, setBattles, toast]);
  const launch = () => {
    const id = `BTL-${String(Math.max(42, ...projectBattles.map((b) => Number(b.id.split("-")[1]) || 0)) + 1).padStart(3, "0")}`;
    setBattles((old) => [
      {
        id,
        project: project.id,
        scenario,
        step: 0,
        attempts: 1,
        at: Date.now(),
        run: projectRuns[0]?.id || "",
      },
      ...old,
    ]);
    setSelected(id);
    setPlaying(true);
    setAudit(false);
    toast("Local scenario launched. No live target is modified.");
  };
  const redLog = [
    "Sandbox fixture loaded.",
    "Scenario condition applied to fixture.",
    "Kane recorded the expected fault.",
    "Failure evidence sealed.",
  ];
  const blueLog = [
    "Healer ready. Waiting for evidence.",
    "Captured state received.",
    "Repair candidate selected.",
    "Expected response restored.",
    "Scope and assertion audit passed.",
  ];
  return (
    <>
      <PageHead
        eyebrow="CONTROL ROOM / REPLAY SANDBOX"
        title="Adversarial Arena"
        description="Controlled chaos. Observable recovery. Verified outcomes."
      />
      <div className="page-content">
        <div className="launch-bar">
          <label className="field">
            Chaos scenario
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
            >
              {scenarios.map((s) => (
                <option key={s}>{s}</option>
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
          <label className="field branch-field">
            Branch
            <select value={branch} onChange={(e) => setBranch(e.target.value)}>
              {[...new Set([project.branch, "develop", "staging"])].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <button
            className="btn primary unleash"
            onClick={launch}
            disabled={playing}
          >
            <Zap size={14} />
            Unleash Saboteur
          </button>
        </div>
        <section className="panel arena-stage">
          <div className="arena-stage-head">
            <span className="eyebrow gold">
              <Radio size={13} />
              BATTLE STAGE
            </span>
            <span className="mono muted">
              {battle?.id || "STANDBY"} / {branch}
            </span>
            <Tag color={step === 5 ? "green" : "gold"}>
              {step === 5
                ? "Resolved"
                : playing
                  ? "Live replay"
                  : "Replay paused"}
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
                className={`${i <= step ? "reached" : ""} ${i === step ? "current" : ""}`}
                key={s}
              >
                <span>{i < step ? <Check size={12} /> : i + 1}</span>
                <strong>{s}</strong>
                <small>
                  {i <= step && battle
                    ? `${time(battle.at)}:${String(i * 3).padStart(2, "0")}`
                    : "--:--:--"}
                </small>
              </div>
            ))}
          </div>
          <div className="battle-log-grid">
            <div>
              <h3>
                <Dot color="red" />
                Saboteur log <span>FIXTURE</span>
              </h3>
              {redLog.slice(0, Math.min(4, step + 1)).map((l, i) => (
                <p key={l}>
                  <span>0{i + 1}</span>
                  {l}
                </p>
              ))}
            </div>
            <div>
              <h3>
                <Dot color="cyan" />
                Healer log <span>ATTEMPTS {battle?.attempts || 0}/3</span>
              </h3>
              {blueLog.slice(0, Math.max(1, step)).map((l, i) => (
                <p key={l}>
                  <span>0{i + 1}</span>
                  {l}
                </p>
              ))}
            </div>
          </div>
          <div className="arena-controls">
            <span>
              <Swords size={13} />
              {battle?.scenario || "Choose a scenario to get started"}
            </span>
            {battle && (
              <button
                className="btn secondary compact"
                onClick={() => {
                  if (step >= 5) {
                    setBattles((old) =>
                      old.map((b) =>
                        b.id === battle.id ? { ...b, step: 0 } : b,
                      ),
                    );
                    setAudit(false);
                  }
                  setPlaying(!playing);
                }}
              >
                {playing ? <Pause size={12} /> : <Play size={12} />}{" "}
                {playing
                  ? "Pause"
                  : step >= 5
                    ? "Replay battle"
                    : "Resume replay"}
              </button>
            )}
          </div>
        </section>
        {battle && step >= 4 && (
          <section className="panel audit-panel">
            <button className="audit-toggle" onClick={() => setAudit(!audit)}>
              <ShieldCheck size={17} className="gold" />
              <strong>Anti-cheat audit</strong>
              <Tag color="green">3 checks passed</Tag>
              <ChevronDown size={14} />
            </button>
            {audit && (
              <div className="audit-body">
                <div className="diff-view">
                  <div className="micro-label">FIXTURE RESPONSE DIFF</div>
                  <code className="red">- response.state: "unavailable"</code>
                  <code className="cyan">+ response.state: "ready"</code>
                </div>
                <div>
                  {[
                    "No assertions weakened",
                    "No hardcoded constants introduced",
                    "Scope boundaries respected",
                  ].map((s) => (
                    <div className="check-line" key={s}>
                      <Check size={13} />
                      {s}
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
              <span className="mono muted">{b.id}</span>
              <strong>{b.scenario}</strong>
              <Tag color={b.step === 5 ? "green" : "gold"}>
                {stages[b.step]}
              </Tag>
              <ChevronDown size={14} />
            </button>
            {openHistory === b.id && (
              <div className="history-details">
                <span>
                  {b.attempts} healing attempt{b.attempts === 1 ? "" : "s"} /{" "}
                  {time(b.at)} UTC
                </span>
                <button
                  className="text-button"
                  onClick={() => {
                    setSelected(b.id);
                    setPlaying(false);
                    document
                      .querySelector(".arena-stage")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Inspect battle <ArrowUpRight size={12} />
                </button>
                {b.run && (
                  <button
                    className="text-button"
                    onClick={() => go("theater", { id: b.run })}
                  >
                    View full replay <ArrowUpRight size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
const defaultClaims = [
  "Checkout confirmation",
  "Mobile CTA visibility",
  "Session persistence",
  "Search result state",
  "Cart quantity limits",
  "Guest checkout",
  "Address validation",
  "Payment retry",
  "Order detail access",
  "Filter persistence",
  "Product inventory",
  "Refund status",
  "Image alt text",
  "Account recovery",
  "Email preferences",
  "Locale formatting",
];
export function Coverage() {
  const { project, query, patchProject, toast } = useWorkspace();
  const claims = project.claims?.length ? project.claims : defaultClaims;
  const [selected, setSelected] = useState(
    Math.min(claims.length - 1, Math.max(0, Math.floor(Number(query.gap)) || 0)),
  );
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const [generated, setGenerated] = useStored<Record<string, number[]>>(
    "generated-specs",
    {},
  );
  const specKey = `${project.id}:${project.spec}:${claims.length}:${claims[0]}`;
  const done = generated[specKey] || [];
  const [showSpec, setShowSpec] = useState(false);
  const gaps = Math.max(0, project.requirements - project.covered);
  const nodes = project.claims?.length ? [selected, ...claims.map((_, i) => i).filter(i => i !== selected)].slice(0, 5).map(i => ({ n: claims[i], type: done.includes(i) ? 'trusted' : 'stale' })) : [
    { n: "Product catalogue", type: "trusted" },
    { n: "Cart operations", type: "trusted" },
    { n: "Account navigation", type: "derived" },
    {
      n: claims[selected] || "Requirement",
      type: done.includes(selected) ? "trusted" : "stale",
    },
    { n: "Order history", type: "trusted" },
  ];
  const list = claims
    .map((name, i) => ({ name, i }))
    .filter((g) => !done.includes(g.i))
    .slice(0, gaps);
  const generate = () => {
    if (done.includes(selected) || !gaps) return;
    setGenerated((prev) => ({
      ...prev,
      [specKey]: [...(prev[specKey] || []), selected],
    }));
    patchProject({
      covered: Math.min(project.requirements, project.covered + 1),
    });
    setShowSpec(true);
    toast("Test specification generated and linked to the requirement");
  };
  const spec = `# ${claims[selected]}\n\nRequirement: REQ-${String(selected + 103).padStart(3, "0")}\nSource: ${project.spec}\n\n- Open the local ${project.name} fixture.\n- Exercise ${claims[selected].toLowerCase()}.\n- Assert the expected visible state.\n- Capture evidence and retain the result.\n`;
  return (
    <>
      <PageHead
        eyebrow="ASSURANCE / REQUIREMENT GRAPH"
        title="Coverage Map"
        description="Trace every product claim to its verification specification."
        action={
          <Tag color="gold">
            {(
              (project.covered / Math.max(1, project.requirements)) *
              100
            ).toFixed(1)}
            % covered
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
                aria-label="Interactive graph connecting requirements to test specifications"
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
                    return (
                      <g key={i} className={`graph-node ${n.type}`}>
                        <path
                          d={`M219 ${y + 21} C280 ${y + 21} 307 ${y + 21 + (i % 2 ? 15 : -15)} 369 ${y + 21 + (i % 2 ? 15 : -15)}`}
                          className="edge"
                        />
                        {i < 3 && !project.claims?.length && (
                          <path
                            d={`M219 ${y + 21} C282 ${y + 21} 308 ${y + 97} 369 ${y + 97}`}
                            className="edge derived"
                          />
                        )}
                        <rect x="22" y={y} width="197" height="42" rx="4" />
                        <text x="36" y={y + 15} className="node-id">
                          REQ-{i === 3 ? 103 + selected : 14 + i * 18}
                        </text>
                        <text x="36" y={y + 31}>
                          {n.n.length > 24 ? n.n.slice(0, 23) + "..." : n.n}
                        </text>
                        <circle cx="219" cy={y + 21} r="3" />
                        <rect
                          x="369"
                          y={y + (i % 2 ? 15 : -15)}
                          width="208"
                          height="42"
                          rx="4"
                        />
                        <text
                          x="381"
                          y={y + 15 + (i % 2 ? 15 : -15)}
                          className="node-id"
                        >
                          {n.type === "stale" ? "UNCOVERED" : "TEST SPEC"}
                        </text>
                        <text x="381" y={y + 31 + (i % 2 ? 15 : -15)}>
                          {n.type === "stale"
                            ? "Awaiting specification"
                            : `${n.n.toLowerCase().replace(/ /g, "-")}.md`}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
              <div className="graph-minimap">
                <svg viewBox="0 0 100 62">
                  {nodes.map((_, i) => (
                    <g key={i}>
                      <path
                        d={`M19 ${8 + i * 11}L76 ${6 + i * 11}`}
                        stroke="#a08b61"
                      />
                      <rect
                        x="8"
                        y={5 + i * 11}
                        width="14"
                        height="5"
                        fill="#81714e"
                      />
                      <rect
                        x="72"
                        y={4 + i * 11}
                        width="19"
                        height="5"
                        fill="#727978"
                      />
                    </g>
                  ))}
                  <rect
                    x={8 - pan.x / 20}
                    y={3 - pan.y / 20}
                    width={82 / zoom}
                    height={54 / zoom}
                    fill="none"
                    stroke="#c3b994"
                  />
                </svg>
              </div>
            </div>
            <div className="graph-legend">
              <span>
                <i className="gold" />
                Trusted
              </span>
              <span>
                <i className="muted dashed" />
                Derived
              </span>
              <span>
                  <i className="gold dashed" />
                Stale
              </span>
              <span>
                <Move size={12} />
                Drag to pan
              </span>
            </div>
          </section>
          <aside className="panel gap-panel">
            <PanelHeading icon={Flag} action={<Tag color="gold">{gaps}</Tag>}>
              Coverage gaps
            </PanelHeading>
            <p className="panel-subtitle">
              Select a claim to inspect its link.
            </p>
            <div className="gap-list">
              {list.map(({ name, i }) => (
                <button
                  key={i}
                  className={selected === i ? "selected" : ""}
                  onClick={() => {
                    setSelected(i);
                    setShowSpec(false);
                  }}
                >
                  <span className="radio-circle" />
                  <span>
                    <small>REQ-{i + 103}</small>
                    <strong>{name}</strong>
                  </span>
                  <i className={i % 3 === 0 ? "red" : "gold"}>
                    {i % 3 === 0 ? "HIGH" : "MED"}
                  </i>
                </button>
              ))}
              {!list.length && (
                <Empty
                  title="No open gaps"
                  description="All requirements have a linked specification."
                />
              )}
            </div>
            <button
              className="btn primary"
              disabled={done.includes(selected) || !gaps}
              onClick={generate}
            >
              <FileCode2 size={13} />
              {done.includes(selected)
                ? "Specification generated"
                : "Generate test for gap"}
            </button>
          </aside>
        </div>
        {(showSpec || done.includes(selected)) && (
          <section className="panel generated-spec">
            <PanelHeading
              icon={FileCode2}
              action={
                <button
                  className="text-button"
                  onClick={() =>
                    downloadFile(
                      `${claims[selected].toLowerCase().replace(/ /g, "-")}.md`,
                      spec,
                      "text/markdown",
                    )
                  }
                >
                  <ArrowDownToLine size={12} />
                  Download spec
                </button>
              }
            >
              Generated specification
            </PanelHeading>
            <pre>{spec}</pre>
          </section>
        )}
      </div>
    </>
  );
}
