import { signEvidence } from "./integrity";
import {
  ArrowDownToLine,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Cookie,
  Filter,
  LockKeyhole,
  Monitor,
  Network,
  Search,
  Terminal,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  BrowserPreview,
  Empty,
  IconButton,
  Modal,
  PageHead,
  Tabs,
  Tag,
  statusColor,
} from "./ui";
import { downloadFile, time, useWorkspace, type Run } from "./workspace";

export const stepNames = [
  "Open storefront",
  "Inspect product",
  "Update cart",
  "Submit checkout",
  "Confirm order",
];
export function packFor(run: Run) {
  return {
    format: "chaos-pact.evidence/v1",
    source: "local-replay-sandbox",
    run,
    steps: stepNames.map((name, i) => ({
      index: i + 1,
      name,
      capturedAt: new Date(run.at + i * 1500).toISOString(),
      screenshot: `/images/headphones.jpg`,
      target: ["collection", "product", "cart", "checkout", "confirmation"][i],
      assertion: i === 3 && run.status === "failed" ? "failed" : "passed",
    })),
    traces: {
      network: [
        { method: "GET", path: "/api/products/arc-one", status: 200 },
        {
          method: "POST",
          path: "/api/checkout",
          status: run.status === "failed" ? 500 : 201,
        },
      ],
      console: [
        run.status === "failed"
          ? "Checkout response did not match expected state."
          : "All assertions passed.",
      ],
      storage: { cart_items: 1, currency: "USD" },
    },
  };
}
export async function savePack(run: Run) {
  const payload = packFor(run);
  const integrity = await signEvidence(payload);
  downloadFile(
    `${run.id.toLowerCase()}.evidence`,
    JSON.stringify({ ...payload, integrity }, null, 2),
  );
}
export function EvidenceViewer({
  run,
  onClose,
}: {
  run: Run;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [tab, setTab] = useState("Network");
  const { toast } = useWorkspace();
  const [drawer, setDrawer] = useState(true);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setStep((i) => Math.min(4, i + 1));
      if (e.key === "ArrowLeft") setStep((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  const pack = packFor(run);
  const logs: Record<string, string> = {
    Network: `${time(run.at)}:${String(step * 3).padStart(2, "0")}  REQUEST\n\nGET /api/products/arc-one\n  status: 200 OK\n  latency: ${46 + step * 8}ms\n  type: application/json\n\n${step >= 3 ? `POST /api/checkout\n  status: ${run.status === "failed" ? "500 ERROR" : "201 CREATED"}` : "GET /assets/product.webp\n  status: 200 OK\n  cache: hit"}`,
    Console: `[info] sandbox worker ready\n[info] ${stepNames[step]}\n[${run.status === "failed" && step === 3 ? "error" : "pass"}] ${run.status === "failed" && step === 3 ? "Checkout state mismatch" : "Expected state observed"}\n\n${run.id} / step ${step + 1}`,
    Storage: JSON.stringify(
      {
        cookies: { session: "sandbox-fixture", secure: true, sameSite: "Lax" },
        localStorage: { ...pack.traces.storage, step: step + 1 },
      },
      null,
      2,
    ),
    YAML: `run: ${run.id}\nsource: replay-sandbox\nstatus: ${run.status}\nresult_code: ${run.status === "failed" ? "740" : "0"}\nplatform: ${run.platform}\ncommit: ${run.sha}\nstep: ${step + 1}\nassertion: ${stepNames[step]}\nconfidence: 0.98`,
  };
  return (
    <Modal
      wide
      className="evidence-lightbox"
      title="Evidence Viewer"
      eyebrow={`SEALED ARTIFACT / ${run.id}`}
      onClose={onClose}
    >
      <div className="viewer-summary">
        <span>
          <LockKeyhole size={12} />
          {run.name}
        </span>
        <Tag color={statusColor(run.status)}>{run.status}</Tag>
        <button className="text-button" onClick={() => setDrawer(!drawer)}>
          <Terminal size={13} />
          {drawer ? "Hide" : "Show"} inspector
        </button>
      </div>
      <div className={`viewer-layout ${drawer ? "" : "no-drawer"}`}>
        <div className="viewer-image">
          <div className="viewer-step">
            <span className="eyebrow">STEP 0{step + 1}</span>
            <b>{stepNames[step]}</b>
          </div>
          <BrowserPreview step={step} annotation />
        </div>
        {drawer && (
          <aside className="log-drawer">
            <Tabs
              items={["Network", "Console", "Storage", "YAML"]}
              active={tab}
              onChange={setTab}
            />
            <pre>
              {logs[tab].split("\n").map((l, i) => (
                <span
                  key={i}
                  className={
                    l.includes("500") || l.includes("error")
                      ? "red"
                      : l.includes("200") || l.includes("pass")
                        ? "green"
                        : l.includes(":")
                          ? "cyan"
                          : ""
                  }
                >
                  {l}
                  {"\n"}
                </span>
              ))}
            </pre>
          </aside>
        )}
      </div>
      <div className="filmstrip">
        {stepNames.map((s, i) => (
          <button
            key={s}
            className={step === i ? "selected" : ""}
            onClick={() => setStep(i)}
          >
            <div className="film-thumb">
              <BrowserPreview step={i} small />
            </div>
            <span>
              <b>0{i + 1}</b>
              {s}
            </span>
          </button>
        ))}
      </div>
      <div className="modal-footer">
        <div className="inline-icon">
          <IconButton
            icon={ChevronLeft}
            label="Previous evidence step"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          />
          <span className="mono muted">{step + 1} / 5</span>
          <IconButton
            icon={ChevronRight}
            label="Next evidence step"
            disabled={step === 4}
            onClick={() => setStep(step + 1)}
          />
        </div>
        <button
          className="btn secondary"
          onClick={async () => {
            await savePack(run);
            toast("Evidence pack exported");
          }}
        >
          <ArrowDownToLine size={14} />
          Download pack
        </button>
      </div>
    </Modal>
  );
}
export function EvidenceVault({ embedded = false }: { embedded?: boolean }) {
  const { projectRuns, query, go, project, projects, setProjectId } =
    useWorkspace();
  const [statuses, setStatuses] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [minAge, setMinAge] = useState(0);
  const [maxAge, setMaxAge] = useState(24);
  const [shown, setShown] = useState(18);
  const [filterOpen, setFilterOpen] = useState(() => window.innerWidth > 700);
  const [viewer, setViewer] = useState<Run | null>(
    projectRuns.find((r) => r.id === query.id) || null,
  );
  useEffect(() => {
    setViewer(projectRuns.find((r) => r.id === query.id) || null);
  }, [query.id]);
  const toggle = (v: string, arr: string[], set: (v: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((s) => s !== v) : [...arr, v]);
  const filtered = projectRuns.filter((r) => {
    const age = (Date.now() - r.at) / 3600000;
    const platform =
      r.platform === "Desktop web"
        ? "Desktop"
        : r.platform === "Cloud grid"
          ? "Cloud grid"
          : "Mobile";
    return (
      r.status !== "running" &&
      (!statuses.length || statuses.includes(r.status)) &&
      (!platforms.length || platforms.includes(platform)) &&
      `${r.id} ${r.name} /specs/${r.name.toLowerCase().replace(/ /g, "-")}.md ${r.status}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      age >= minAge &&
      age <= maxAge
    );
  });
  const reset = () => {
    setStatuses([]);
    setPlatforms([]);
    setSearch("");
    setMinAge(0);
    setMaxAge(24);
  };
  return (
    <>
      {!embedded && (
        <PageHead
          eyebrow="ARTIFACT LIBRARY"
          title="Evidence Vault"
          description="Sealed execution artifacts. Every step, accounted for."
          action={
            <Tag>
              <LockKeyhole size={11} />
              {projectRuns.filter((r) => r.status !== "running").length} sealed
              packs
            </Tag>
          }
        />
      )}
      <div className={embedded ? "embedded-content" : "page-content"}>
        <div className="vault-toolbar">
          <label className="search-field">
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search paths, run IDs, or assertions..."
            />
          </label>
          <button
            className="btn secondary compact"
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <Filter size={13} />
            {filterOpen ? "Hide filters" : "Filters"}
          </button>
        </div>
        <div
          className={`vault-layout ${filterOpen ? "filters-visible" : "filters-hidden"}`}
        >
          <aside className="vault-filters">
            <div className="micro-label">FILTER ARTIFACTS</div>
            <h4>Status</h4>
            {["passed", "failed", "healed"].map((s) => (
              <label className="checkbox-row" key={s}>
                <input
                  type="checkbox"
                  checked={statuses.includes(s)}
                  onChange={() => toggle(s, statuses, setStatuses)}
                />
                <span className={statusColor(s)}>{s}</span>
              </label>
            ))}
            <h4>Platform</h4>
            {["Desktop", "Mobile", "Cloud grid"].map((s) => (
              <label className="checkbox-row" key={s}>
                <input
                  type="checkbox"
                  checked={platforms.includes(s)}
                  onChange={() => toggle(s, platforms, setPlatforms)}
                />
                {s}
              </label>
            ))}
            <h4>Age range</h4>
            <div className="range-label">
              {minAge}h to {maxAge}h ago
            </div>
            <input
              type="range"
              aria-label="Minimum evidence age"
              min="0"
              max="24"
              value={minAge}
              onChange={(e) =>
                setMinAge(Math.min(Number(e.target.value), maxAge))
              }
            />
            <input
              type="range"
              aria-label="Maximum evidence age"
              min="0"
              max="24"
              value={maxAge}
              onChange={(e) =>
                setMaxAge(Math.max(Number(e.target.value), minAge))
              }
            />
            <label className="field">
              <span>Project</span>
              <select
                value={project.id}
                onChange={(e) => setProjectId(e.target.value)}
              >
                {projects
                  .filter((p) => !p.archived)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <button className="text-button" onClick={reset}>
              Reset filters
            </button>
          </aside>
          <section className="artifact-results">
            <div className="results-caption">
              <span>{filtered.length} artifacts</span>
              <span>
                Newest first <ArrowDownToLine size={10} />
              </span>
            </div>
            <div className="evidence-grid">
              {filtered.slice(0, shown).map((r, i) => (
                <button
                  className="evidence-tile"
                  key={r.id}
                  onClick={() => setViewer(r)}
                >
                  <div className="evidence-thumb">
                    <BrowserPreview
                      small
                      step={i % 4}
                      annotation={r.status === "failed"}
                    />
                    <span
                      className={`artifact-ribbon ${statusColor(r.status)}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <div className="artifact-copy">
                    <small>
                      {r.id} <span>{time(r.at)} UTC</span>
                    </small>
                    <h3>{r.name}</h3>
                    <div className="artifact-foot">
                      <span>
                        <Monitor size={11} />
                        {r.platform}
                      </span>
                      <span>
                        <Network size={12} />
                        <Terminal size={12} />
                        <Cookie size={12} />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {!filtered.length && <Empty />}
            {filtered.length > shown && (
              <button
                className="load-more btn secondary"
                onClick={() => setShown((n) => n + 12)}
              >
                Load more artifacts <ArrowRight size={13} />
              </button>
            )}
          </section>
        </div>
      </div>
      {viewer && (
        <EvidenceViewer
          run={viewer}
          onClose={() => {
            setViewer(null);
            if (query.id) go("evidence");
          }}
        />
      )}
    </>
  );
}
