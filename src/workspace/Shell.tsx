import {
  Activity,
  ArrowUpRight,
  Bell,
  BookOpen,
  Box,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
  ClipboardCheck,
  Command,
  Cpu,
  CreditCard,
  FileText,
  GitBranch,
  Layers3,
  LayoutDashboard,
  ListVideo,
  Menu,
  MonitorSmartphone,
  PanelLeft,
  Play,
  Plug,
  Plus,
  Radio,
  Search,
  Settings2,
  ShieldCheck,
  Swords,
  Terminal,
  Users,
  Waypoints,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dot, Logo } from "./ui";
import { pageNames, useWorkspace, type Page } from "./workspace";
import { SAMPLE_PROJECT_ID } from "@/lib/sample-workspace";

export const navigation: [Page, LucideIcon][] = [
  ["dashboard", LayoutDashboard],
  ["project", ListVideo],
  ["arena", Swords],
  ["evidence", Layers3],
  ["coverage", Waypoints],
  ["postmortems", FileText],
  ["integrations", Plug],
  ["devices", MonitorSmartphone],
  ["team", Users],
  ["billing", CreditCard],
  ["settings", Settings2],
  ["audit", ClipboardCheck],
];
const labels: Partial<Record<Page, string>> = {
  dashboard: "Mission Control",
  project: "Run ledger",
  arena: "Adversarial arena",
  evidence: "Evidence vault",
  coverage: "Coverage map",
  postmortems: "Post-mortems",
  devices: "Device grid",
  billing: "Billing & credits",
  audit: "Blueprint audit",
};

export function Shell({ children }: { children: ReactNode }) {
  const w = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);
  const [menu, setMenu] = useState<"project" | "profile" | "mode" | null>(null);
  const shell = useRef<HTMLDivElement>(null);
  const sample = w.project?.id === SAMPLE_PROJECT_ID;
  const live = w.project?.mode === "live_cloud";
  const name = w.operator.name || "Workspace operator";
  const initials = w.operator.name
    ? w.operator.name
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s[0])
        .join("")
        .toUpperCase()
    : "OP";
  const goto = (p: Page) => {
    setMenu(null);
    w.go(p, p === "project" ? { tab: "Run history" } : undefined);
  };
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-console-menu]"))
        setMenu(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(null);
        w.setSidebarOpen(false);
      }
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", key);
    };
  }, [w.setSidebarOpen]);
  const navItem = ([page, Icon]: [Page, LucideIcon]) => {
    const active =
      w.page === page || (page === "project" && w.page === "theater");
    const label = labels[page] || pageNames[page];
    return (
      <button
        key={page}
        className={`cs-nav-item ${active ? "selected" : ""}`}
        aria-current={active ? "page" : undefined}
        title={label}
        onClick={() => goto(page)}
      >
        <Icon size={16} strokeWidth={1.65} />
        <span>{label}</span>
        {page === "project" && w.projectRuns.length > 0 && (
          <small>{w.projectRuns.length}</small>
        )}
        {page === "arena" && <i className="arena-beacon" />}
      </button>
    );
  };
  return (
    <div
      ref={shell}
      className={`console-shell ${collapsed ? "cs-collapsed" : ""} ${w.sidebarOpen ? "cs-mobile-open" : ""}`}
    >
      {w.sidebarOpen && (
        <button
          className="cs-scrim"
          aria-label="Close workspace navigation"
          onClick={() => w.setSidebarOpen(false)}
        />
      )}
      <aside className="console-sidebar" aria-label="Workspace navigation">
        <button
          className="cs-brand"
          aria-label="CHAOS-PACT home"
          onClick={() => goto("dashboard")}
        >
          <Logo />
          <span className="cs-brand-sub">REVENUE GUARD</span>
        </button>
        <div className="cs-sidebar-scroll">
          <div className="cs-project-wrap" data-console-menu>
            <button
              className="cs-project-switch"
              aria-expanded={menu === "project"}
              aria-label="Switch project"
              onClick={() => setMenu(menu === "project" ? null : "project")}
            >
              <span className="cs-project-symbol">
                <Box size={20} />
              </span>
              <span className="cs-project-text">
                <small>ACTIVE PROJECT</small>
                <strong>{w.project?.name || "Your workspace"}</strong>
              </span>
              <ChevronsUpDown className="cs-switch-chevron" size={13} />
            </button>
            {menu === "project" && (
              <div className="cs-dropdown project-options">
                <small>YOUR PROJECTS</small>
                {w.projects
                  .filter((p) => !p.archived)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        w.setProjectId(p.id);
                        goto("dashboard");
                      }}
                    >
                      <Box size={14} />
                      {p.name}
                      {p.id === w.project?.id && <Check size={13} />}
                    </button>
                  ))}
                <button
                  onClick={() => {
                    setMenu(null);
                    w.setDialog("onboarding");
                  }}
                >
                  <Plus size={14} />
                  Connect project
                </button>
              </div>
            )}
          </div>
          <nav>
            <p className="cs-group-title">OPERATIONS</p>
            {navigation.slice(0, 6).map(navItem)}
            <p className="cs-group-title second">WORKSPACE</p>
            {navigation.slice(6).map(navItem)}
          </nav>
        </div>
        <div className="cs-sidebar-bottom">
          <button
            className="cs-engine"
            onClick={() => w.setDialog("environment")}
          >
            <span className="cs-engine-top">
              <Cpu size={15} />
              <b>Execution engine</b>
              <i className={w.loadError ? "offline" : ""} />
            </span>
            <span className="cs-engine-track">
              {Array.from({ length: 26 }, (_, i) => (
                <i key={i} style={{ opacity: 0.4 + (i % 5) * 0.12 }} />
              ))}
            </span>
            <span className="cs-engine-caption">
              {live
                ? w.system?.worker
                  ? "Cloud worker configured"
                  : "Cloud setup required"
                : "Replay environment"}
              <ArrowUpRight size={11} />
            </span>
          </button>
          <button className="cs-guide" onClick={() => w.setDialog("help")}>
            <BookOpen size={15} />
            <span>Workspace guide</span>
            <ArrowUpRight size={12} />
          </button>
          <div className="cs-build">
            <span className="tiny-square" /> CONTROL PLANE <span>v1.0</span>
          </div>
        </div>
      </aside>
      <div className="console-stage">
        <header className="console-topbar">
          <div className="cs-location">
            <button
              className="cs-tool cs-desktop-collapse"
              aria-label={
                collapsed ? "Expand navigation" : "Collapse navigation"
              }
              onClick={() => setCollapsed(!collapsed)}
            >
              <PanelLeft size={17} />
            </button>
            <button
              className="cs-tool cs-mobile-toggle"
              aria-label="Open workspace navigation"
              onClick={() => w.setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <span className="cs-location-separator" />
            <span className="cs-crumb-root">Workspace</span>
            <ChevronRight size={12} />
            <b>{labels[w.page] || pageNames[w.page]}</b>
          </div>
          <div className="cs-global-tools">
            <div data-console-menu className="cs-menu-wrap">
              <button
                className="cs-mode-button"
                aria-label="Choose execution mode"
                aria-expanded={menu === "mode"}
                onClick={() => setMenu(menu === "mode" ? null : "mode")}
              >
                {live ? (
                  <Radio size={12} />
                ) : (
                  <span className="mode-layers">
                    <Layers3 size={12} />
                  </span>
                )}
                {live ? "Live cloud" : "Instant replay"}
                <ChevronDown size={11} />
              </button>
              {menu === "mode" && (
                <div className="cs-dropdown right">
                  <small>EXECUTION MODE</small>
                  <button
                    onClick={() => {
                      setMenu(null);
                      w.patchProject(
                        { mode: "judge_instant_replay" },
                        "Instant replay selected",
                      );
                    }}
                  >
                    <Play size={13} />
                    Instant replay{!live && <Check size={13} />}
                  </button>
                  <button
                    onClick={() => {
                      setMenu(null);
                      w.setDialog("environment");
                    }}
                  >
                    <Radio size={13} />
                    Live cloud setup
                    <ArrowUpRight size={12} />
                  </button>
                </div>
              )}
            </div>
            <span className="cs-tool-divider" />
            <button
              className="cs-search"
              aria-label="Search workspace"
              onClick={() => w.setDialog("search")}
            >
              <Search size={15} />
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="cs-bell cs-tool"
              aria-label="Open notifications"
              onClick={() => w.setDialog("notifications")}
            >
              <Bell size={16} />
              {!w.inboxRead && w.inboxEvents.length > 0 && <i />}
            </button>
            <div className="cs-menu-wrap" data-console-menu>
              <button
                className="cs-avatar"
                aria-label="Open profile menu"
                onClick={() => setMenu(menu === "profile" ? null : "profile")}
              >
                {initials}
              </button>
              {menu === "profile" && (
                <div className="cs-dropdown right profile-options">
                  <strong>{name}</strong>
                  <small>PERSONAL WORKSPACE</small>
                  <button onClick={() => goto("settings")}>
                    <Settings2 size={14} />
                    Profile settings
                  </button>
                  <button onClick={() => goto("team")}>
                    <Users size={14} />
                    Team members
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="workspace-main cs-main" id="main-content" key={w.page}>
          {w.loadError && (
            <div className="cs-recovery" role="status">
              <ShieldCheck size={15} />
              <span>Read-only view · Database connection paused.</span>
              <button onClick={() => w.refresh()}>Reconnect</button>
            </div>
          )}
          {sample && w.page !== "dashboard" && (
            <div className="cs-sample-strip">
              <span className="tiny-square" /> SAMPLE WORKSPACE{" "}
              <span>Illustrative replay data · No live credits used</span>
            </div>
          )}
          {children}
        </main>
      </div>
      {w.notice && (
        <div className="toast" role="status">
          <Activity size={15} />
          {w.notice}
        </div>
      )}
    </div>
  );
}
