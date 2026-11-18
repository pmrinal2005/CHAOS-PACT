CREATE TABLE "adversarial_battles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"battle_mode" text NOT NULL,
	"state" text NOT NULL,
	"saboteur_mutation_type" text,
	"saboteur_diff" text,
	"healer_attempts" integer DEFAULT 0 NOT NULL,
	"healer_patch_diff" text,
	"anti_cheat_passed" boolean,
	"anti_cheat_notes" text,
	"anti_cheat_checks" jsonb,
	"before_run_id" uuid,
	"after_run_id" uuid,
	"hmac_receipt_hash" text,
	"receipt_payload" jsonb,
	"branch" text,
	"base_branch" text,
	"target_url" text,
	"objective" text,
	"targets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pr_number" integer,
	"commit_sha" text,
	"error_message" text,
	"log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"pack_storage_path" text,
	"pack_sha256" text,
	"pack_bytes" integer,
	"validation_exit_code" integer,
	"policy_verdict_json" jsonb,
	"failing_step_index" integer,
	"failure_yaml_json" jsonb,
	"annotated_screenshots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"network_log_slice" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"console_log_slice" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"devtools_assertions_summary" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kane_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"battle_id" uuid,
	"surface" text NOT NULL,
	"target_platform" text NOT NULL,
	"commit_sha" text,
	"exit_code" integer,
	"status" text DEFAULT 'queued' NOT NULL,
	"result_code" text,
	"bug_verdict_json" jsonb,
	"final_state_json" jsonb,
	"credits_consumed" double precision,
	"duration_s" double precision,
	"test_manager_url" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"name" text NOT NULL,
	"objective" text,
	"testmd_path" text,
	"testmd_content" text,
	"target_url" text,
	"bug_detection_mode" text DEFAULT 'continue' NOT NULL,
	"variables_json" jsonb,
	"trigger" text DEFAULT 'manual' NOT NULL,
	"role" text,
	"attempt" integer DEFAULT 0 NOT NULL,
	"requirement_id" text,
	"requester_hash" text,
	"cli_version" text,
	"summary" text,
	"one_liner" text,
	"reason" text,
	"error_message" text,
	"steps_done" integer DEFAULT 0 NOT NULL,
	"steps_failed" integer DEFAULT 0 NOT NULL,
	"warnings_json" jsonb,
	"assurance_json" jsonb,
	"stderr_tail" text,
	"reviewed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ndjson_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"seq_no" integer NOT NULL,
	"event_type" text NOT NULL,
	"step_index" integer,
	"child_id" text,
	"step_status" text,
	"remark" text,
	"raw_payload" jsonb NOT NULL,
	"emitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"repo_url" text NOT NULL,
	"default_branch" text DEFAULT 'main' NOT NULL,
	"staging_url" text NOT NULL,
	"prod_url" text NOT NULL,
	"preview_url_template" text,
	"prd_markdown" text,
	"spec_filename" text,
	"requirements_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assurance_coverage_pct" double precision DEFAULT 0 NOT NULL,
	"hmac_secret_ref" text DEFAULT 'env:HMAC_SECRET' NOT NULL,
	"execution_mode" text DEFAULT 'live_cloud' NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "published_postmortems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"battle_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary_tldr" text NOT NULL,
	"markdown_body" text NOT NULL,
	"before_screenshot_url" text,
	"after_screenshot_url" text,
	"devtools_proof_json" jsonb,
	"self_verified_run_id" uuid,
	"social_share_snippets" jsonb,
	"status" text DEFAULT 'awaiting_verification' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "published_postmortems_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'Engineer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_members_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspace_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "adversarial_battles" ADD CONSTRAINT "adversarial_battles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adversarial_battles" ADD CONSTRAINT "adversarial_battles_before_run_id_kane_runs_id_fk" FOREIGN KEY ("before_run_id") REFERENCES "public"."kane_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adversarial_battles" ADD CONSTRAINT "adversarial_battles_after_run_id_kane_runs_id_fk" FOREIGN KEY ("after_run_id") REFERENCES "public"."kane_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_artifacts" ADD CONSTRAINT "evidence_artifacts_run_id_kane_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."kane_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kane_runs" ADD CONSTRAINT "kane_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kane_runs" ADD CONSTRAINT "kane_runs_battle_id_adversarial_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."adversarial_battles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ndjson_events" ADD CONSTRAINT "ndjson_events_run_id_kane_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."kane_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_postmortems" ADD CONSTRAINT "published_postmortems_battle_id_adversarial_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."adversarial_battles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_postmortems" ADD CONSTRAINT "published_postmortems_self_verified_run_id_kane_runs_id_fk" FOREIGN KEY ("self_verified_run_id") REFERENCES "public"."kane_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "battles_project_idx" ON "adversarial_battles" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_run_idx" ON "evidence_artifacts" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "runs_project_idx" ON "kane_runs" USING btree ("project_id","started_at");--> statement-breakpoint
CREATE INDEX "runs_battle_idx" ON "kane_runs" USING btree ("battle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_run_seq_idx" ON "ndjson_events" USING btree ("run_id","seq_no");