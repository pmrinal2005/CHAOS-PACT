/** Types shared by the server and the workspace client. */
export type JsonMap = Record<string, unknown>;

export type Trust = "derived" | "trusted" | "stale";
export type Requirement = {
  id: string;
  text: string;
  trust: Trust;
  testmdPath?: string;
  testmd?: string;
  lastRunId?: string;
};

export type BattleLogEntry = {
  at: string;
  actor: "system" | "red" | "referee" | "blue" | "audit" | "publisher";
  message: string;
};
export type AuditCheck = { name: string; passed: boolean; detail: string };

export const SURFACES = ["run", "testmd", "testrun", "explore"] as const;
export const PLATFORMS = [
  "desktop_web",
  "remote_pixel_7",
  "android_real",
  "ios_simulator",
] as const;
export const platformNames: Record<string, string> = {
  desktop_web: "Desktop web",
  remote_pixel_7: "Pixel 7 (cloud grid)",
  android_real: "Android real device",
  ios_simulator: "iOS simulator (cloud grid)",
};
export const BATTLE_MODES = [
  "chaos_sabotage",
  "pr_gate",
  "readme_lie_audit",
  "external_mystery_shopper",
] as const;
export const CHAOS_SCENARIOS = [
  "silent_stripe_500",
  "mobile_cta_overlap",
  "cookie_httponly_strip",
  "readme_pricing_lie",
  "console_hydration_crash",
] as const;
export type ChaosScenario = (typeof CHAOS_SCENARIOS)[number];
export const scenarioNames: Record<string, string> = {
  silent_stripe_500: "Silent API 500",
  mobile_cta_overlap: "Mobile CTA Overlap",
  cookie_httponly_strip: "Cookie Strip",
  readme_pricing_lie: "README Lie",
  console_hydration_crash: "Hydration Crash",
};
/** Battle states in loop order; BLOCKED_NEEDS_HUMAN is the escalation exit. */
export const BATTLE_STATES = [
  "EXPLORE",
  "SABOTAGE",
  "REFEREE_FAIL",
  "HEALING",
  "ANTI_CHEAT_AUDIT",
  "REFEREE_PASS",
  "PUBLISHED",
] as const;
export const MAX_ATTEMPTS = 3;

export type RunDisplay =
  | "queued"
  | "running"
  | "passed"
  | "failed"
  | "healed"
  | "error"
  | "timeout";

export type ProjectDTO = {
  id: string;
  name: string;
  repo: string;
  repoUrl: string;
  branch: string;
  staging: string;
  production: string;
  previewUrlTemplate: string;
  spec: string;
  requirements: Requirement[];
  covered: number;
  coveragePct: number;
  mode: string;
  archived: boolean;
  createdAt: number;
};
export type RunDTO = {
  id: string;
  label: string;
  projectId: string;
  battleId: string | null;
  name: string;
  objective: string | null;
  testmdPath: string | null;
  surface: string;
  platform: string;
  status: string;
  display: RunDisplay;
  exitCode: number | null;
  resultCode: string | null;
  verdict: JsonMap | null;
  finalState: JsonMap | null;
  credits: number;
  duration: number;
  sha: string | null;
  at: number;
  completedAt: number | null;
  review: boolean;
  testManagerUrl: string | null;
  targetUrl: string | null;
  summary: string | null;
  oneLiner: string | null;
  reason: string | null;
  error: string | null;
  role: string | null;
  attempt: number;
  trigger: string;
  requirementId: string | null;
  stepsDone: number;
  stepsFailed: number;
  cliVersion: string | null;
  warnings: JsonMap[];
  assurance: JsonMap | null;
  stderrTail: string | null;
  hasEvidence: boolean;
  thumb: string | null;
};
export type EventDTO = {
  seq: number;
  type: string;
  step: number | null;
  childId: string | null;
  stepStatus: string | null;
  remark: string | null;
  payload: JsonMap;
  at: number;
};
export type EvidenceDTO = {
  runId: string;
  packUrl: string | null;
  packSha256: string | null;
  packBytes: number | null;
  validationExitCode: number | null;
  policyVerdict: JsonMap | null;
  failingStep: number | null;
  failure: JsonMap | null;
  screenshots: { step: number; url: string; annotated: boolean }[];
  network: JsonMap[];
  console: JsonMap[];
  devtools: JsonMap | null;
};
export type BattleDTO = {
  id: string;
  label: string;
  projectId: string;
  mode: string;
  state: string;
  scenario: string | null;
  saboteurDiff: string | null;
  attempts: number;
  healerDiff: string | null;
  antiCheatPassed: boolean | null;
  antiCheatNotes: string | null;
  antiCheatChecks: AuditCheck[];
  beforeRunId: string | null;
  afterRunId: string | null;
  receiptHash: string | null;
  branch: string | null;
  baseBranch: string | null;
  targetUrl: string | null;
  objective: string | null;
  targets: string[];
  prNumber: number | null;
  error: string | null;
  log: BattleLogEntry[];
  at: number;
  updatedAt: number;
};
export type PostmortemDTO = {
  id: string;
  battleId: string;
  projectId: string;
  slug: string;
  title: string;
  tldr: string;
  body: string;
  beforeShot: string | null;
  afterShot: string | null;
  status: string;
  selfVerifiedRunId: string | null;
  share: Record<string, string>;
  createdAt: number;
  publishedAt: number | null;
};
export type SystemStatus = {
  worker: boolean;
  appUrl: string;
  hmac: boolean;
  github: boolean;
  githubWebhook: boolean;
  llm: "groq" | "gemini" | null;
  rateLimitPerHour: number;
  workerReport: {
    at: number;
    cliVersion?: string;
    whoami?: string;
    balance?: number | null;
    authenticated?: boolean;
  } | null;
};
export type MemberDTO = {
  id: string;
  name: string;
  email: string;
  role: string;
  at: number;
};
export type WorkspaceDTO = {
  projects: ProjectDTO[];
  runs: RunDTO[];
  battles: BattleDTO[];
  postmortems: PostmortemDTO[];
  members: MemberDTO[];
  settings: Record<string, unknown>;
  system: SystemStatus;
  credits: { consumed: number; budget: number; reportedBalance: number | null };
};

export const shortId = (prefix: string, id: string) =>
  `${prefix}-${id.slice(0, 8).toUpperCase()}`;
