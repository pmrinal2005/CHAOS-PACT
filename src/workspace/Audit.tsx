import { useState } from "react";
import { ArrowDownToLine, ChevronRight, ClipboardCheck } from "lucide-react";
import { PageHead } from "./ui";
import { downloadFile } from "./workspace";
import findings from "@/lib/audit-findings.json";

export function BlueprintAudit() {
  const [filter, setFilter] = useState("All findings"),
    [search, setSearch] = useState("");
  const statuses = ["Present", "Partial", "Missing", "External"];
  const rows = findings.filter(
    (f) =>
      (filter === "All findings" || filter === f.status) &&
      `${f.title} ${f.detail} ${f.source} ${f.section}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const exportReport = () =>
    downloadFile(
      "CHAOS-PACT-blueprint-audit.md",
      [
        "# CHAOS-PACT implementation audit",
        "Upstream: pmrinal2005/CHAOS-PACT @ 58512ee",
        "Present means an inspected implementation exists, not a successful paid cloud execution. Sample records are illustrative, never sealed Kane evidence.",
        ...findings.map(
          (f) =>
            `## ${f.section} · ${f.title}\n**${f.status}** — ${f.detail}\n\nSource: ${f.source}`,
        ),
      ].join("\n\n"),
      "text/markdown",
    );
  return (
    <>
      <PageHead
        eyebrow="WORKSPACE / IMPLEMENTATION REVIEW"
        title="Blueprint audit"
        description="Repository findings, verification boundaries, and deployment requirements."
        action={
          <button className="btn secondary" onClick={exportReport}>
            <ArrowDownToLine size={14} />
            Export audit
          </button>
        }
      />
      <div className="page-content">
        <div className="audit-intro">
          <ClipboardCheck size={19} />
          <p>
            Reviewed against upstream commit <code>58512ee</code>. “Present”
            means a code path exists; third-party execution requires independent
            live evidence.
          </p>
        </div>
        <div className="audit-counts">
          {statuses.map((s) => (
            <button
              className={`audit-status ${s.toLowerCase()}`}
              key={s}
              onClick={() => setFilter(filter === s ? "All findings" : s)}
            >
              {findings.filter((f) => f.status === s).length} {s.toLowerCase()}
            </button>
          ))}
        </div>
        <div className="audit-filters">
          <input
            aria-label="Search audit findings"
            placeholder="Search findings, source files, or blueprint sections…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Filter audit status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["All findings", ...statuses].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <span className="eyebrow muted">{rows.length} FINDINGS</span>
        {rows.map((f) => (
          <details className="audit-record" key={f.title}>
            <summary>
              <span>
                <ChevronRight size={13} />
                {f.title}
              </span>
              <span className={`audit-status ${f.status.toLowerCase()}`}>
                {f.status}
              </span>
            </summary>
            <p>{f.detail}</p>
            <code>
              {f.section} · {f.source}
            </code>
          </details>
        ))}
        {!rows.length && (
          <div className="mc-empty">No findings match your search.</div>
        )}
      </div>
    </>
  );
}
