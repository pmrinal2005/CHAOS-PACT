import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  BookOpen,
  Box,
  Boxes,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
  CircleX,
  Clock3,
  Code2,
  Coins,
  Command,
  CreditCard,
  FileClock,
  FileText,
  GitBranch,
  GitFork,
  Github,
  Layers3,
  LayoutDashboard,
  Menu,
  Network,
  PanelLeftClose,
  PlugZap,
  Plus,
  Radar,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Swords,
  Terminal,
  Users,
  Waypoints,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Dot, Logo } from "./ui";
import { pageNames, useWorkspace, type Page } from "./workspace";

export const navigation: [Page, LucideIcon][] = [
  ["dashboard", LayoutDashboard],
  ["arena", Swords],
  ["evidence", Layers3],
  ["coverage", Waypoints],
  ["postmortems", FileText],
  ["integrations", PlugZap],
  ["devices", Smartphone],
  ["team", Users],
  ["billing", CreditCard],
  ["settings", Settings2],
];
export function Shell({ children }: { children: ReactNode }) {
  const {
    page,
    project,
    projects,
    operator,
    inboxRead,
    inboxEvents,
    go,
    credits,
    limit,
    projectRuns,
    projectBattles,
    setDialog,
    notice,
    sidebarOpen,
    setSidebarOpen,
    setProjectId,
  } = useWorkspace();
  const [clock, setClock] = useState(new Date());
  const [switcher, setSwitcher] = useState(false);
  const [profile, setProfile] = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  const [marker, setMarker] = useState(27);
  useLayoutEffect(() => {
    const measure = () => {
      const active = rail.current?.querySelector<HTMLElement>(".rail-button.active");
      if (rail.current && active) setMarker(active.getBoundingClientRect().top - rail.current.getBoundingClientRect().top + (active.offsetHeight - 19) / 2);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [page]);
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    setSwitcher(false);
    setProfile(false);
  }, [page]);
  useEffect(() => {
    if (!switcher && !profile) return;
    const hide = () => {
      setSwitcher(false);
      setProfile(false);
    };
    window.addEventListener("click", hide);
    return () => window.removeEventListener("click", hide);
  }, [switcher, profile]);
  const filters: [string, LucideIcon, number, string, () => void][] = [
    [
      "Failing runs",
      CircleX,
      projectRuns.filter((r) => r.status === "failed").length,
      "red",
      () => go("project", { tab: "Run history", filter: "failed" }),
    ],
    [
      "Pending review",
      Clock3,
      projectRuns.filter((r) => r.review).length,
      "gold",
      () => go("project", { tab: "Run history", filter: "review" }),
    ],
    [
      "Active battles",
      Swords,
      projectBattles.filter((b) => b.step < 5).length,
      "cyan",
      () => go("arena"),
    ],
    [
      "Recent evidence",
      Layers3,
      Math.min(18, projectRuns.filter((r) => r.status !== "running").length),
      "muted",
      () => go("evidence"),
    ],
  ];
  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand-block"
          aria-label="CHAOS-PACT home"
          onClick={() => go("dashboard")}
        >
          <Logo />
        </button>
        <div className="topbar-main">
          <button
            className="mobile-toggle icon-button"
            aria-label="Open workspace sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={18} />
          </button>
          <div className="breadcrumbs">
            <Boxes size={14} />
            <span>Workspace</span>
            <span className="crumb-slash">/</span>
            <b>{pageNames[page]}</b>
          </div>
          <div className="global-tools">
            <span className="system-status">
              <Dot /> Systems operational
            </span>
            <span className="topbar-divider" />
            <button
              className="command-key"
              onClick={() => setDialog("search")}
              aria-label="Search workspace"
            >
              <Search size={14} />
              <kbd>
                <Command size={10} /> K
              </kbd>
            </button>
            <button
              className="notification-icon"
              aria-label="Open notifications"
              onClick={() => setDialog("notifications")}
            >
              <Bell size={17} />
              {!inboxRead && inboxEvents.length > 0 && <i />}
            </button>
            <div className="profile-wrap">
              <button
                className="profile-avatar"
                aria-label="Open profile menu"
                onClick={(e) => {
                  e.stopPropagation();
                  setProfile(!profile);
                  setSwitcher(false);
                }}
              >
                {operator.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </button>
              {profile && (
                <div className="popover profile-menu">
                  <strong>{operator.name}</strong>
                  <small>Workspace owner</small>
                  <button onClick={() => go("settings")}>
                    <Settings2 size={14} />
                    Profile settings
                  </button>
                  <button onClick={() => go("team")}>
                    <Users size={14} />
                    Manage team
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="workbench">
        <nav className="icon-rail" aria-label="Main navigation">
          <div className="rail-top" ref={rail}>
            <i className="rail-active-marker" aria-hidden="true" style={{ transform: `translateY(${marker}px)` }} />
            {navigation.map(([id, Icon], i) => (
              <div key={id} className={i === 7 ? "rail-break" : ""}>
                <button
                  className={`rail-button ${page === id || (id === "dashboard" && ["project", "theater"].includes(page)) ? "active" : ""}`}
                  aria-label={pageNames[id]}
                  aria-current={page === id ? "page" : undefined}
                  onClick={() => go(id)}
                >
                  <Icon size={19} strokeWidth={1.65} />
                  <span className="rail-tooltip">{pageNames[id]}</span>
                </button>
              </div>
            ))}
          </div>
          <div className="rail-bottom">
            <button
              className="rail-button"
              aria-label="Workspace help"
              onClick={() => setDialog("help")}
            >
              <CircleHelp size={18} />
              <span className="rail-tooltip">Workspace guide</span>
            </button>
            <button
              className="rail-button rail-collapse"
              aria-label="Toggle sidebar"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <PanelLeftClose size={17} />
            </button>
          </div>
        </nav>
        {sidebarOpen && (
          <div
            className="sidebar-scrim"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside className={`secondary-sidebar ${sidebarOpen ? "expanded" : ""}`}>
          <div className="sidebar-content">
            <div className="side-label">
              ACTIVE PROJECT{" "}
              <button
                className="mobile-close"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <X size={15} />
              </button>
            </div>
            <div className="project-switch-wrap">
              <button
                className={`project-switch ${switcher ? "is-open" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSwitcher(!switcher);
                  setProfile(false);
                }}
                aria-expanded={switcher}
              >
                <span className="project-mark">
                  <Box size={23} strokeWidth={1.4} />
                </span>
                <span className="project-copy">
                  <strong>{project.name}</strong>
                  <small>
                    <Dot /> Healthy
                  </small>
                </span>
                <ChevronsUpDown size={13} />
              </button>
              {switcher && (
                <div className="popover project-menu">
                  <div className="popover-label">YOUR PROJECTS</div>
                  {projects
                    .filter((p) => !p.archived)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setProjectId(p.id);
                          go("project");
                        }}
                      >
                        <Box size={15} />
                        {p.name}
                        {p.id === project.id && (
                          <Check size={12} className="gold" />
                        )}
                      </button>
                    ))}
                  <button onClick={() => setDialog("onboarding")}>
                    <Plus size={15} />
                    Connect project
                  </button>
                </div>
              )}
            </div>
            <div className="side-section">
              <div className="side-label">
                QUICK FILTERS <SlidersHorizontal size={12} />
              </div>
              <div className="quick-filters">
                {filters.map(([label, Icon, count, color, action]) => (
                  <button className="filter-row" key={label} onClick={action}>
                    <Icon size={15} className={color} />
                    <span>{label}</span>
                    <b className="count-badge">
                      {String(count).padStart(2, "0")}
                    </b>
                  </button>
                ))}
              </div>
            </div>
            <div className="side-section credits-side">
              <div className="side-label">
                EXECUTION CREDITS <Coins size={13} />
              </div>
              <div className="credit-numbers">
                <strong>{credits.toLocaleString()}</strong>
                <span>/ {limit.toLocaleString()}</span>
              </div>
              <div className="credit-track">
                <i style={{ width: `${(credits / limit) * 100}%` }} />
              </div>
              <div className="credit-foot">
                <span>{((credits / limit) * 100).toFixed(1)}% remaining</span>
                <button
                  aria-label="View credit usage"
                  onClick={() => go("billing")}
                >
                  <ArrowUpRight size={13} />
                </button>
              </div>
            </div>
            <div className="side-section context-section">
              <div className="side-label">PROJECT CONTEXT</div>
              <button className="context-row" onClick={() => go("project")}>
                <Github size={15} />
                <span>{project.repo}</span>
                <ArrowUpRight size={11} />
              </button>
              <button
                className="context-row"
                onClick={() => go("project", { tab: "Settings" })}
              >
                <GitBranch size={15} />
                <span>{project.branch}</span>
                <span className="branch-label">default</span>
              </button>
              <button className="context-row" onClick={() => go("coverage")}>
                <FileText size={15} />
                <span>{project.spec}</span>
                <span className="tiny-dot" />
              </button>
            </div>
          </div>
          <div className="sidebar-bottom">
            <button
              className="sandbox-mode"
              onClick={() => setDialog("environment")}
            >
              <span className="sandbox-mark">
                <Box size={15} />
              </span>
              <span>
                <small>ENVIRONMENT</small>
                <strong>
                  {project.mode === "live"
                    ? "Live configuration"
                    : "Replay sandbox"}
                </strong>
              </span>
              <ChevronsUpDown size={12} />
            </button>
            <button className="docs-link" onClick={() => setDialog("help")}>
              <BookOpen size={14} />
              Workspace guide
              <ArrowUpRight size={12} />
            </button>
          </div>
        </aside>
        <main
          className={`workspace-main page-${page}`}
          key={`${page}-${project.id}`}
        >
          {children}
        </main>
      </div>
      <footer className="app-statusbar">
        <span>
          <Activity size={11} className="green" /> All workers online
        </span>
        <i />
        <span className="region">
          <Network size={11} /> us-east-1
        </span>
        <span className="statusbar-right">
          <span className="version">CHAOS-PACT v2.4.0</span>
          <i />
          <Clock3 size={10} />
          {clock.toLocaleTimeString("en-GB", { timeZone: "UTC" })} UTC
        </span>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <ShieldCheck size={17} />
          {notice}
        </div>
      )}
    </div>
  );
}
export const screenIcons = {
  Activity,
  ArrowDownLeft,
  ChartNoAxesCombined,
  ChevronRight,
  Code2,
  FileClock,
  GitFork,
  Radar,
  Terminal,
};
