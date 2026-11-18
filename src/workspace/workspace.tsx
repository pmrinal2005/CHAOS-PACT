import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BATTLE_STATES,
  type BattleDTO,
  type PostmortemDTO,
  type ProjectDTO,
  type RunDTO,
  type WorkspaceDTO,
} from "@/lib/types";

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
export type Run = RunDTO;
export type Project = ProjectDTO;
export type Battle = BattleDTO;
export type Postmortem = PostmortemDTO;
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
/** Display names for BATTLE_STATES, in loop order. */
export const stages = [
  "Baseline",
  "Sabotage",
  "Referee fail",
  "Healing",
  "Anti-cheat audit",
  "Referee pass",
  "Published",
];
export function stageIndex(b: Battle) {
  const i = (BATTLE_STATES as readonly string[]).indexOf(b.state);
  if (i >= 0) return i;
  // BLOCKED_NEEDS_HUMAN: show how far the loop got before escalating.
  return b.afterRunId ? 4 : b.attempts ? 3 : b.beforeRunId ? 2 : 1;
}
export const battleBlocked = (b: Battle) => b.state === "BLOCKED_NEEDS_HUMAN";
export const battleOpen = (b: Battle) =>
  !["REFEREE_PASS", "PUBLISHED", "BLOCKED_NEEDS_HUMAN"].includes(b.state);
export const stateLabel = (b: Battle) =>
  battleBlocked(b) ? "Blocked: needs human" : stages[stageIndex(b)];
export const runActive = (r: Run) => r.status === "queued" || r.status === "running";

export async function api<T = unknown>(
  path: string,
  init: { method?: string; json?: unknown } = {},
): Promise<T> {
  const res = await fetch(path, {
    method: init.method || (init.json !== undefined ? "POST" : "GET"),
    headers: init.json !== undefined ? { "content-type": "application/json" } : undefined,
    body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}
export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Browser-only UI preference (which project is selected). Not workspace data. */
export function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(`chaos-pact-ui:${key}`);
      if (saved) return JSON.parse(saved) as T;
    } catch {
      /* storage unavailable */
    }
    return initial;
  });
  useEffect(() => {
    try {
      localStorage.setItem(`chaos-pact-ui:${key}`, JSON.stringify(value));
    } catch {
      /* private browsing */
    }
  }, [key, value]);
  return [value, setValue] as const;
}
function readRoute() {
  const [raw, query] = location.hash.replace(/^#\/?/, "").split("?");
  return {
    page: (Object.prototype.hasOwnProperty.call(pageNames, raw) ? raw : "dashboard") as Page,
    query: Object.fromEntries(new URLSearchParams(query)) as Record<string, string>,
  };
}
type TriggerResult = { mode: string; runId: string; runs?: Run[] };

function useWorkspaceModel() {
  const [route, setRoute] = useState(readRoute);
  const [data, setData] = useState<WorkspaceDTO | null>(null);
  const [loadError, setLoadError] = useState("");
  const [syncedAt, setSyncedAt] = useState(0);
  const [projectId, setProjectId] = useStored("current-project", "");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await api<WorkspaceDTO>("/api/workspace");
      setData(next);
      setLoadError("");
      setSyncedAt(Date.now());
      return next;
    } catch (e) {
      setLoadError(errorText(e));
      return null;
    }
  }, []);

  const projects = useMemo(() => data?.projects ?? [], [data]);
  const runs = useMemo(() => data?.runs ?? [], [data]);
  const battles = useMemo(() => data?.battles ?? [], [data]);
  const project =
    projects.find((p) => p.id === projectId && !p.archived) ||
    projects.find((p) => !p.archived) ||
    null;
  const pid = project?.id;
  const projectRuns = useMemo(() => runs.filter((r) => r.projectId === pid), [runs, pid]);
  const projectBattles = useMemo(() => battles.filter((b) => b.projectId === pid), [battles, pid]);
  const postmortems = useMemo(
    () => (data?.postmortems ?? []).filter((p) => p.projectId === pid),
    [data, pid],
  );
  const busy =
    runs.some(runActive) ||
    battles.some((b) => battleOpen(b) && !b.error && Date.now() - b.updatedAt < 15 * 60000);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    const t = window.setInterval(refresh, busy ? 4000 : 20000);
    return () => window.clearInterval(t);
  }, [busy, refresh]);

  const settings = data?.settings ?? {};
  const operator = (settings.operator as { name: string; email: string }) || {
    name: "",
    email: "",
  };
  const preferences = (settings.notification_prefs as boolean[]) || [true, true, true, true];
  const budget = data?.credits.budget ?? 0;
  const consumed = data?.credits.consumed ?? 0;
  const reported = data?.credits.reportedBalance ?? null;
  // The worker's `kane-cli balance` is authoritative when it has reported one.
  const creditsKnown = reported !== null || budget > 0;
  const credits = Math.max(0, reported ?? budget - consumed);
  const limit = Math.max(budget, credits, 1);

  const inboxEvents = useMemo(() => {
    const items: { title: string; text: string; page: Page; id?: string; at: number }[] = [];
    const failed = projectRuns.find((r) => r.status === "failed");
    const healed = projectRuns.find((r) => r.display === "healed");
    const sealed = projectRuns.find((r) => r.hasEvidence);
    if (preferences[0] && failed)
      items.push({
        title: "Failure ready for review",
        text: `${failed.label}: ${failed.name}. Inspect Kane's verdict.`,
        page: "theater",
        id: failed.id,
        at: failed.completedAt || failed.at,
      });
    if (preferences[1] && healed)
      items.push({
        title: "Healing re-verified",
        text: `${healed.label}: the repaired build passed the referee.`,
        page: "theater",
        id: healed.id,
        at: healed.completedAt || healed.at,
      });
    if (preferences[2] && sealed)
      items.push({
        title: "Evidence sealed",
        text: `${sealed.label}: the evidence pack is in the vault.`,
        page: "evidence",
        id: sealed.id,
        at: sealed.completedAt || sealed.at,
      });
    if (preferences[3] && budget > 0 && credits < budget * 0.2)
      items.push({
        title: "Low execution balance",
        text: `${Math.round(credits).toLocaleString()} credits remain.`,
        page: "billing",
        at: syncedAt,
      });
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectRuns, preferences.join(), credits, budget]);
  const readAt = Number(settings.inbox_read_at) || 0;
  const inboxRead = !inboxEvents.some((e) => e.page !== "billing" && e.at > readAt);

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
    const t = window.setTimeout(() => setNotice(""), 5200);
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

  /** POST /api/kane/trigger, in the project's execution mode unless overridden. */
  async function startRun(body: Record<string, unknown>) {
    if (!project) return false;
    try {
      const r = await api<TriggerResult>("/api/kane/trigger", {
        json: { projectId: project.id, executionMode: project.mode, ...body },
      });
      await refresh();
      const replay = r.mode === "judge_instant_replay";
      go("theater", replay ? { id: r.runId, replay: "1" } : { id: r.runId });
      const refused = r.runs?.find((x) => x.status === "error");
      toast(
        replay
          ? "Replaying the sealed NDJSON stream at 5x speed."
          : refused?.error || "Dispatched to the cloud worker. Streaming Kane CLI events.",
      );
      return true;
    } catch (e) {
      toast(errorText(e));
      return false;
    }
  }
  /** Runs a mutation, refreshes workspace data, and reports failures as a toast. */
  async function act<T>(fn: () => Promise<T>, success?: string): Promise<T | null> {
    try {
      const result = await fn();
      await refresh();
      if (success) toast(success);
      return result;
    } catch (e) {
      toast(errorText(e));
      return null;
    }
  }
  const patchProject = (patch: Record<string, unknown>, success?: string) =>
    project
      ? act(() => api(`/api/projects/${project.id}`, { method: "PATCH", json: patch }), success)
      : Promise.resolve(null);
  const saveSetting = (key: string, value: unknown, success?: string) =>
    act(() => api("/api/settings", { method: "PUT", json: { key, value } }), success);
  const copy = async (text: string, what = "Value") => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${what} copied to clipboard`);
    } catch {
      toast("Clipboard unavailable in this browser. Select the text to copy it.");
    }
  };
  return {
    ...route,
    loaded: !!data,
    loadError,
    syncedAt,
    refresh,
    system: data?.system ?? null,
    members: data?.members ?? [],
    preferences,
    inboxEvents,
    inboxRead,
    operator,
    projects,
    project,
    setProjectId,
    runs,
    projectRuns,
    battles,
    projectBattles,
    postmortems,
    credits,
    creditsKnown,
    limit,
    consumed,
    budget,
    reportedBalance: reported,
    dialog,
    setDialog,
    notice,
    toast,
    go,
    startRun,
    act,
    patchProject,
    saveSetting,
    copy,
    sidebarOpen,
    setSidebarOpen,
  };
}
const WorkspaceContext = createContext<ReturnType<typeof useWorkspaceModel> | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const value = useWorkspaceModel();
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("Workspace provider missing");
  return ctx;
}
/** For screens that only render once a project exists. */
export function useProject() {
  const ctx = useWorkspace();
  if (!ctx.project) throw new Error("No active project");
  return { ...ctx, project: ctx.project };
}
export function duration(n: number) {
  const s = Math.round(n);
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}
export function time(at: number) {
  return new Date(at).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}
export function stamp(at: number) {
  return new Date(at).toISOString().slice(0, 16).replace("T", " ");
}
export function downloadFile(name: string, content: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
