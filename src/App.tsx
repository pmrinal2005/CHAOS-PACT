import { useEffect } from "react";
import { FolderGit2, Plus } from "lucide-react";
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
function Workspace() {
  const { page, projects, setDialog, setProjects, setProjectId } =
    useWorkspace();
  const Screen = screens[page];
  useEffect(() => {
    document.title = `${page === "dashboard" ? "Mission Control" : pageNames[page]} | CHAOS-PACT`;
  }, [page]);
  return (
    <>
      <Shell>
        {projects.some((p) => !p.archived) || page === "theater" ? (
          <Screen />
        ) : (
          <div className="empty-workspace">
            <FolderGit2 size={35} />
            <h1>A fresh workspace</h1>
            <p>
              Connect a repository to begin, or restore an archived project.
            </p>
            <button
              className="btn primary"
              onClick={() => setDialog("onboarding")}
            >
              <Plus size={14} />
              Connect project
            </button>
            {projects
              .filter((p) => p.archived)
              .map((p) => (
                <button
                  className="btn secondary"
                  key={p.id}
                  onClick={() => {
                    setProjects((old) =>
                      old.map((a) =>
                        a.id === p.id ? { ...a, archived: false } : a,
                      ),
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
