"use client";

import { useEffect } from "react";
import { FolderGit2, Plus, RefreshCw } from "lucide-react";
import { Billing, Devices, Integrations, Team } from "./Administration";
import { Dashboard } from "./Dashboard";
import { Dialogs } from "./Dialogs";
import { EvidenceVault } from "./Evidence";
import { ProjectDetail, RunTheater } from "./Execution";
import { Arena, Coverage } from "./Operations";
import { Publishing } from "./Publishing";
import { Settings } from "./Settings";
import { Shell } from "./Shell";
import { pageNames, useWorkspace, WorkspaceProvider } from "./workspace";

const screens = {
  dashboard: Dashboard,
  project: ProjectDetail,
  theater: RunTheater,
  arena: Arena,
  coverage: Coverage,
  evidence: EvidenceVault,
  postmortems: Publishing,
  integrations: Integrations,
  devices: Devices,
  team: Team,
  billing: Billing,
  settings: Settings,
};
// Screens that describe the workspace rather than one project.
const global = ["integrations", "team", "billing", "settings"];

function Workspace() {
  const { page, project, projects, loaded, loadError, refresh, setDialog, setProjectId, act } =
    useWorkspace();
  const Screen = screens[page];
  useEffect(() => {
    // Re-applied after a tick: Next streams its metadata <title> in after hydration.
    const apply = () => {
      document.title = `${page === "dashboard" ? "Mission Control" : pageNames[page]} | CHAOS-PACT`;
    };
    apply();
    const t = window.setTimeout(apply, 400);
    return () => window.clearTimeout(t);
  }, [page, loaded]);
  return (
    <>
      <Shell>
        {!loaded ? (
          <div className="empty-workspace">
            <RefreshCw size={30} className={loadError ? "" : "spin"} />
            <h1>{loadError ? "The workspace API is unreachable" : "Loading workspace"}</h1>
            <p>{loadError || "Reading projects, runs and battles from the database."}</p>
            {loadError && (
              <button className="btn primary" onClick={() => refresh()}>
                <RefreshCw size={14} />
                Retry
              </button>
            )}
          </div>
        ) : project || global.includes(page) ? (
          <Screen />
        ) : (
          <div className="empty-workspace">
            <FolderGit2 size={35} />
            <h1>A fresh workspace</h1>
            <p>
              No projects, runs or battles exist yet. Connect a repository to begin
              {projects.some((p) => p.archived) ? ", or restore an archived project." : "."}
            </p>
            <button className="btn primary" onClick={() => setDialog("onboarding")}>
              <Plus size={14} />
              Connect project
            </button>
            {projects
              .filter((p) => p.archived)
              .map((p) => (
                <button
                  className="btn secondary"
                  key={p.id}
                  onClick={async () => {
                    await act(
                      () => fetch(`/api/projects/${p.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ archived: false }) }),
                      `${p.name} restored`,
                    );
                    setProjectId(p.id);
                  }}
                >
                  Restore {p.name}
                </button>
              ))}
          </div>
        )}
      </Shell>
      <Dialogs />
    </>
  );
}
export default function App() {
  return (
    <WorkspaceProvider>
      <Workspace />
    </WorkspaceProvider>
  );
}
