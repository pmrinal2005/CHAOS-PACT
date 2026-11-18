import {
  bigserial,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type {
  AuditCheck,
  BattleLogEntry,
  JsonMap,
  Requirement,
} from "@/lib/types";

const ts = (name: string) => timestamp(name, { withTimezone: true });

/** Registered repositories, target URLs and the ingested PRD/README snapshot. */
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  repoUrl: text("repo_url").notNull(),
  defaultBranch: text("default_branch").notNull().default("main"),
  stagingUrl: text("staging_url").notNull(),
  prodUrl: text("prod_url").notNull(),
  previewUrlTemplate: text("preview_url_template"),
  prdMarkdown: text("prd_markdown"),
  specFilename: text("spec_filename"),
  requirementsJson: jsonb("requirements_json")
    .$type<Requirement[]>()
    .notNull()
    .default([]),
  assuranceCoveragePct: doublePrecision("assurance_coverage_pct")
    .notNull()
    .default(0),
  hmacSecretRef: text("hmac_secret_ref").notNull().default("env:HMAC_SECRET"),
  executionMode: text("execution_mode").notNull().default("live_cloud"),
  archived: boolean("archived").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** Orchestrates the closed loop between Saboteur, Kane referee and Healer. */
export const adversarialBattles = pgTable(
  "adversarial_battles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    battleMode: text("battle_mode").notNull(),
    state: text("state").notNull(),
    saboteurMutationType: text("saboteur_mutation_type"),
    saboteurDiff: text("saboteur_diff"),
    healerAttempts: integer("healer_attempts").notNull().default(0),
    healerPatchDiff: text("healer_patch_diff"),
    antiCheatPassed: boolean("anti_cheat_passed"),
    antiCheatNotes: text("anti_cheat_notes"),
    antiCheatChecks: jsonb("anti_cheat_checks").$type<AuditCheck[]>(),
    beforeRunId: uuid("before_run_id").references(
      (): AnyPgColumn => kaneRuns.id,
      { onDelete: "set null" },
    ),
    afterRunId: uuid("after_run_id").references(
      (): AnyPgColumn => kaneRuns.id,
      { onDelete: "set null" },
    ),
    hmacReceiptHash: text("hmac_receipt_hash"),
    receiptPayload: jsonb("receipt_payload").$type<JsonMap>(),
    // Operational context for the loop.
    branch: text("branch"),
    baseBranch: text("base_branch"),
    targetUrl: text("target_url"),
    objective: text("objective"),
    targets: jsonb("targets").$type<string[]>().notNull().default([]),
    prNumber: integer("pr_number"),
    commitSha: text("commit_sha"),
    errorMessage: text("error_message"),
    log: jsonb("log").$type<BattleLogEntry[]>().notNull().default([]),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("battles_project_idx").on(t.projectId, t.createdAt)],
);

/** Master execution ledger: one row per Kane CLI invocation. */
export const kaneRuns = pgTable(
  "kane_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    battleId: uuid("battle_id").references(
      (): AnyPgColumn => adversarialBattles.id,
      { onDelete: "set null" },
    ),
    surface: text("surface").notNull(),
    targetPlatform: text("target_platform").notNull(),
    commitSha: text("commit_sha"),
    exitCode: integer("exit_code"),
    status: text("status").notNull().default("queued"),
    resultCode: text("result_code"),
    bugVerdictJson: jsonb("bug_verdict_json").$type<JsonMap>(),
    finalStateJson: jsonb("final_state_json").$type<JsonMap>(),
    creditsConsumed: doublePrecision("credits_consumed"),
    durationS: doublePrecision("duration_s"),
    testManagerUrl: text("test_manager_url"),
    startedAt: ts("started_at").notNull().defaultNow(),
    completedAt: ts("completed_at"),
    // Request context.
    name: text("name").notNull(),
    objective: text("objective"),
    testmdPath: text("testmd_path"),
    testmdContent: text("testmd_content"),
    targetUrl: text("target_url"),
    bugDetectionMode: text("bug_detection_mode").notNull().default("continue"),
    variablesJson: jsonb("variables_json").$type<JsonMap>(),
    trigger: text("trigger").notNull().default("manual"),
    role: text("role"),
    attempt: integer("attempt").notNull().default(0),
    requirementId: text("requirement_id"),
    requesterHash: text("requester_hash"),
    // Outcome detail parsed from the stream.
    cliVersion: text("cli_version"),
    summary: text("summary"),
    oneLiner: text("one_liner"),
    reason: text("reason"),
    errorMessage: text("error_message"),
    stepsDone: integer("steps_done").notNull().default(0),
    stepsFailed: integer("steps_failed").notNull().default(0),
    warningsJson: jsonb("warnings_json").$type<JsonMap[]>(),
    assuranceJson: jsonb("assurance_json").$type<JsonMap>(),
    stderrTail: text("stderr_tail"),
    reviewed: boolean("reviewed").notNull().default(false),
  },
  (t) => [
    index("runs_project_idx").on(t.projectId, t.startedAt),
    index("runs_battle_idx").on(t.battleId),
  ],
);

/** Append-only NDJSON stream, exactly as Kane CLI printed it. */
export const ndjsonEvents = pgTable(
  "ndjson_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => kaneRuns.id, { onDelete: "cascade" }),
    seqNo: integer("seq_no").notNull(),
    eventType: text("event_type").notNull(),
    stepIndex: integer("step_index"),
    childId: text("child_id"),
    stepStatus: text("step_status"),
    remark: text("remark"),
    rawPayload: jsonb("raw_payload").$type<JsonMap>().notNull(),
    emittedAt: ts("emitted_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("events_run_seq_idx").on(t.runId, t.seqNo)],
);

/** Sealed .evidence archive plus its unpacked contents. */
export const evidenceArtifacts = pgTable(
  "evidence_artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => kaneRuns.id, { onDelete: "cascade" }),
    packStoragePath: text("pack_storage_path"),
    packSha256: text("pack_sha256"),
    packBytes: integer("pack_bytes"),
    validationExitCode: integer("validation_exit_code"),
    policyVerdictJson: jsonb("policy_verdict_json").$type<JsonMap>(),
    failingStepIndex: integer("failing_step_index"),
    failureYamlJson: jsonb("failure_yaml_json").$type<JsonMap>(),
    annotatedScreenshots: jsonb("annotated_screenshots")
      .$type<{ step: number; url: string; annotated: boolean }[]>()
      .notNull()
      .default([]),
    networkLogSlice: jsonb("network_log_slice")
      .$type<JsonMap[]>()
      .notNull()
      .default([]),
    consoleLogSlice: jsonb("console_log_slice")
      .$type<JsonMap[]>()
      .notNull()
      .default([]),
    devtoolsAssertionsSummary: jsonb("devtools_assertions_summary")
      .$type<JsonMap>(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("evidence_run_idx").on(t.runId)],
);

/** Public /postmortems/[slug] articles. */
export const publishedPostmortems = pgTable("published_postmortems", {
  id: uuid("id").primaryKey().defaultRandom(),
  battleId: uuid("battle_id")
    .notNull()
    .references(() => adversarialBattles.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summaryTldr: text("summary_tldr").notNull(),
  markdownBody: text("markdown_body").notNull(),
  beforeScreenshotUrl: text("before_screenshot_url"),
  afterScreenshotUrl: text("after_screenshot_url"),
  devtoolsProofJson: jsonb("devtools_proof_json").$type<JsonMap>(),
  selfVerifiedRunId: uuid("self_verified_run_id").references(
    () => kaneRuns.id,
    { onDelete: "set null" },
  ),
  socialShareSnippets: jsonb("social_share_snippets").$type<
    Record<string, string>
  >(),
  status: text("status").notNull().default("awaiting_verification"),
  createdAt: ts("created_at").notNull().defaultNow(),
  publishedAt: ts("published_at"),
});

/** Workspace-level key/value settings (operator profile, preferences, budget). */
export const workspaceSettings = pgTable("workspace_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("Engineer"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export type ProjectRow = typeof projects.$inferSelect;
export type RunRow = typeof kaneRuns.$inferSelect;
export type BattleRow = typeof adversarialBattles.$inferSelect;
export type EventRow = typeof ndjsonEvents.$inferSelect;
export type EvidenceRow = typeof evidenceArtifacts.$inferSelect;
export type PostmortemRow = typeof publishedPostmortems.$inferSelect;
