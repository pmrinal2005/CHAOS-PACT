import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Page =
  | "dashboard"
  | "arena"
  | "evidence"
  | "coverage"
  | "postmortems"
  | "integrations"
  | "devices"
  | "team"
  | "billing"
  | "settings"
  | "project"
  | "theater";
export type RunStatus = "passed" | "failed" | "healed" | "running";
export type Run = {
  id: string;
  project: string;
  name: string;
  status: RunStatus;
  platform: string;
  surface: string;
  at: number;
  duration: number;
  credits: number;
  sha: string;
  review: boolean;
};
export type Project = {
  id: string;
  name: string;
  repo: string;
  branch: string;
  staging: string;
  production: string;
  spec: string;
  requirements: number;
  covered: number;
  mode: string;
  claims?: string[];
  archived?: boolean;
};
export type Battle = {
  id: string;
  project: string;
  scenario: string;
  step: number;
  attempts: number;
  at: number;
  run: string;
};
export type Dialog =
  | "onboarding"
  | "new-run"
  | "search"
  | "help"
  | "notifications"
  | "environment"
  | null;
export const pageNames: Record<Page, string> = {
  dashboard: "Dashboard",
  arena: "Adversarial Arena",
  evidence: "Evidence Vault",
  coverage: "Coverage Map",
  postmortems: "Post-Mortems",
  integrations: "Integrations",
  devices: "Mobile Grid",
  team: "Team",
  billing: "Billing & Credits",
  settings: "Settings",
  project: "Project",
  theater: "Run Theater",
};
export const scenarios = [
  "Silent API 500",
  "Mobile CTA Overlap",
  "Cookie Strip",
  "README Lie",
  "Hydration Crash",
];
export const stages = [
  "Queued",
  "Sabotaging",
  "Detected",
  "Healing",
  "Auditing",
  "Resolved",
];
export const initialProject: Project = {
  id: "nexus",
  name: "Nexus Commerce",
  repo: "acme/nexus-commerce",
  branch: "main",
  staging: "https://staging.nexus.example",
  production: "https://nexus.example",
  spec: "product-spec.md",
  requirements: 118,
  covered: 102,
  mode: "sandbox",
};
const seedNames = [
  "Checkout flow verification",
  "Mobile checkout CTA",
  "Session cookie persistence",
  "Product search returns results",
  "Payment confirmation state",
  "Account navigation flow",
  "Cart quantity update",
  "Product detail rendering",
];
function makeRuns(): Run[] {
  return Array.from({ length: 128 }, (_, i) => {
    const n = (i * 37 + 41) % 128;
    const status: RunStatus = n < 16 ? "failed" : n < 24 ? "healed" : "passed";
    return {
      id: `RUN-${String(128 - i).padStart(4, "0")}`,
      project: "nexus",
      name: seedNames[i % seedNames.length],
      status,
      platform: ["Desktop web", "Pixel 8", "iPhone 15", "Cloud grid"][i % 4],
      surface: ["testrun", "run", "testmd", "explore"][i % 4],
      at: Date.now() - (i * 10.75 + 2) * 60000,
      duration: 34 + ((i * 17) % 96),
      credits: 12 + ((i * 7) % 35),
      sha: (0x8f2c1a9 + i * 1947).toString(16).slice(0, 7),
      review: status === "failed" && i < 40,
    };
  });
}
export function useStored<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(`chaos-pact-v1:${key}`);
      if (saved) return JSON.parse(saved) as T;
    } catch {
      /* A fresh workspace also works without storage. */
    }
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });
  useEffect(() => {
    try {
      localStorage.setItem(`chaos-pact-v1:${key}`, JSON.stringify(value));
    } catch {
      /* Keep the session usable in private browsing. */
    }
  }, [key, value]);
  return [value, setValue] as const;
}
function readRoute() {
  const [raw, query] = location.hash.replace(/^#\/?/, "").split("?");
  return {
    page: (Object.prototype.hasOwnProperty.call(pageNames, raw)
      ? raw
      : "dashboard") as Page,
    query: Object.fromEntries(new URLSearchParams(query)),
  };
}
function useWorkspaceModel() {
  const [route, setRoute] = useState(readRoute);
  const [operator, setOperator] = useStored("operator", {
    name: "Alex Kim",
    email: "alex@acme.team",
  });
  const [projects, setProjects] = useStored<Project[]>("projects", [
    initialProject,
  ]);
  const [projectId, setProjectId] = useStored("current-project", "nexus");
  const [runs, setRuns] = useStored<Run[]>("runs", makeRuns);
  const [credits, setCredits] = useStored("credits", 7240);
  const [limit, setLimit] = useStored("credit-limit", 10000);
  const [battles, setBattles] = useStored<Battle[]>("battles", () => [
    {
      id: "BTL-042",
      project: "nexus",
      scenario: "Silent API 500",
      step: 3,
      attempts: 1,
      at: Date.now() - 75000,
      run: "RUN-0123",
    },
    {
      id: "BTL-041",
      project: "nexus",
      scenario: "Mobile CTA Overlap",
      step: 4,
      attempts: 2,
      at: Date.now() - 218000,
      run: "RUN-0120",
    },
    {
      id: "BTL-040",
      project: "nexus",
      scenario: "Cookie Strip",
      step: 5,
      attempts: 1,
      at: Date.now() - 7400000,
      run: "RUN-0114",
    },
  ]);
  const [preferences, setPreferences] = useStored("notification-prefs", [
    true,
    true,
    true,
    false,
  ]);
  const [inboxRead, setInboxRead] = useStored("notifications-read", false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const project =
    projects.find((p) => p.id === projectId && !p.archived) ||
    projects.find((p) => !p.archived) ||
    initialProject;
  const projectRuns = useMemo(
    () => runs.filter((r) => r.project === project.id),
    [runs, project.id],
  );
  const projectBattles = useMemo(
    () => battles.filter((b) => b.project === project.id),
    [battles, project.id],
  );
  const inboxEvents = useMemo(() => {
    const items: { title: string; text: string; page: Page; id?: string }[] =
      [];
    const failed = projectRuns.find((r) => r.status === "failed");
    const healed = projectRuns.find((r) => r.status === "healed");
    const sealed = projectRuns.find((r) => r.status !== "running");
    if (preferences[0] && failed)
      items.push({
        title: "Failure ready for review",
        text: `${failed.id}: ${failed.name}. Inspect the confirmed verdict.`,
        page: "theater",
        id: failed.id,
      });
    if (preferences[1] && healed)
      items.push({
        title: "Healing replay available",
        text: `${healed.id}: the recovery is ready to inspect.`,
        page: "theater",
        id: healed.id,
      });
    if (preferences[2] && sealed)
      items.push({
        title: "Evidence sealed",
        text: `${sealed.id}: your latest evidence pack is in the vault.`,
        page: "evidence",
        id: sealed.id,
      });
    if (preferences[3] && credits < limit * 0.2)
      items.push({
        title: "Low execution balance",
        text: `${credits.toLocaleString()} credits remain in this cycle.`,
        page: "billing",
      });
    return items;
  }, [projectRuns, preferences, credits, limit]);
  useEffect(() => {
    const change = () => {
      setRoute(readRoute());
      setSidebarOpen(false);
      setDialog(null);
      window.scrollTo(0, 0);
      document.querySelector(".workspace-main")?.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(""), 3800);
    return () => window.clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setDialog((d) => (d === "search" ? null : "search"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    const active = runs.filter((r) => r.status === "running");
    if (!active.length) return;
    const timer = window.setInterval(
      () =>
        setRuns((old) =>
          old.map((r) =>
            r.status === "running" && Date.now() - r.at > 8500
              ? { ...r, status: "passed" }
              : r,
          ),
        ),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [runs, setRuns]);
  const go = useCallback((page: Page, query: Record<string, string> = {}) => {
    const search = new URLSearchParams(query).toString();
    location.hash = `/${page}${search ? `?${search}` : ""}`;
    setDialog(null);
    setSidebarOpen(false);
  }, []);
  const toast = useCallback((message: string) => {
    setNotice("");
    window.setTimeout(() => setNotice(message), 10);
  }, []);
  function startRun(
    name = "Checkout flow verification",
    platform = "Desktop web",
    surface = "testrun",
  ) {
    if (credits < 24) {
      toast("Not enough execution credits. Review your billing plan.");
      return;
    }
    const id = `RUN-${String(Math.max(128, ...runs.map((r) => Number(r.id.split("-")[1]) || 0)) + 1).padStart(4, "0")}`;
    const run: Run = {
      id,
      project: project.id,
      name,
      platform,
      surface,
      status: "running",
      at: Date.now(),
      duration: 9,
      credits: 24,
      sha: "9b3f21c",
      review: false,
    };
    setRuns((prev) => [run, ...prev]);
    setCredits((v) => v - 24);
    go("theater", { id });
    toast("Sandbox worker started. Streaming execution events.");
  }
  function patchProject(patch: Partial<Project>) {
    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, ...patch } : p)),
    );
  }
  const copy = async (text: string, what = "Value") => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${what} copied to clipboard`);
    } catch {
      toast(
        "Clipboard unavailable in this browser. Select the text to copy it.",
      );
    }
  };
  return {
    ...route,
    preferences,
    setPreferences,
    inboxEvents,
    inboxRead,
    setInboxRead,
    operator,
    setOperator,
    projects,
    setProjects,
    project,
    setProjectId,
    runs,
    projectRuns,
    setRuns,
    credits,
    setCredits,
    limit,
    setLimit,
    battles,
    projectBattles,
    setBattles,
    dialog,
    setDialog,
    notice,
    toast,
    go,
    startRun,
    patchProject,
    copy,
    sidebarOpen,
    setSidebarOpen,
  };
}
const WorkspaceContext = createContext<ReturnType<
  typeof useWorkspaceModel
> | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const value = useWorkspaceModel();
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("Workspace provider missing");
  return ctx;
}
export function duration(n: number) {
  return `${Math.floor(n / 60)}m ${String(n % 60).padStart(2, "0")}s`;
}
export function parseRequirements(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const bullets = lines
    .filter((line) => /^(?:[-*+]|\d+\.)\s+/.test(line))
    .map((line) => line.replace(/^(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s*)?/, ""));
  const headings = lines
    .filter((line) => /^#{1,6}\s/.test(line))
    .map((line) => line.replace(/^#{1,6}\s+/, ""));
  return [
    ...new Set(
      bullets.length ? bullets : headings.length ? headings : lines.slice(0, 1),
    ),
  ];
}
export function time(at: number) {
  return new Date(at).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}
export function downloadFile(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
