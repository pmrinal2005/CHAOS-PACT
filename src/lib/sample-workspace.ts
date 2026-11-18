/** The original Nexus Commerce demo, explicitly separated from live Kane evidence. */
import {
  type WorkspaceDTO,
  type RunDTO,
  type EventDTO,
  type EvidenceDTO,
  type BattleDTO,
  type JsonMap,
  type Requirement,
} from "./types";

export const SAMPLE_PROJECT_ID = "c0aa5000-0000-4000-8000-000000000001";
export const SAMPLE_AT = Date.UTC(2026, 10, 18, 16, 0);
export const isSample = (run: Pick<RunDTO, "trigger">) =>
  run.trigger === "sample_replay";
const runId = (i: number) =>
  `${String(128 - i).padStart(8, "0")}-0001-4000-8000-000000000001`;
const battleId = (i: number) =>
  `${String(8 - i).padStart(8, "0")}-0002-4000-8000-000000000001`;
const names = [
  "Checkout flow verification",
  "Mobile checkout CTA",
  "Session cookie persistence",
  "Payment confirmation state",
  "Cart quantity update",
  "Product search results",
  "Pricing claim audit",
  "Storefront exploration",
];
const claims = [
  "The checkout returns a valid order confirmation.",
  "The payment CTA is accessible on mobile.",
  "Session cookies retain their secure attributes.",
  "Payment requests have no server errors.",
  "Cart quantities persist across navigation.",
  "Search returns products matching the query.",
  "Displayed prices match the product specification.",
  "All primary storefront screens are reachable.",
  "Clipboard contains the selected promo code.",
  "Layout shift stays below 0.1.",
  "The order total reflects the applied discount.",
  "Cancelled checkouts retain the cart.",
];
const weights = [
  2, 3, 5, 3, 4, 2, 4, 8, 5, 4, 7, 6, 3, 5, 8, 5, 7, 4, 9, 6, 5, 7, 12, 8,
];
const slots = weights.flatMap((n, h) =>
  Array.from({ length: n }, (_, j) => h + (j + 0.5) / n),
);

export function sampleWorkspace(): WorkspaceDTO {
  const runs: RunDTO[] = Array.from({ length: 128 }, (_, i) => {
    const failed = i % 8 === 3,
      healed = i % 16 === 1;
    const at =
      SAMPLE_AT -
      (24 - slots[Math.floor(((127 - i) * (slots.length - 1)) / 127)]) *
        3600000;
    const duration = 34 + ((i * 17) % 96);
    return {
      id: runId(i),
      label: `RUN-${String(128 - i).padStart(4, "0")}`,
      projectId: SAMPLE_PROJECT_ID,
      battleId: healed || i % 16 === 3 ? battleId(Math.floor(i / 16)) : null,
      name: names[i % names.length],
      objective: claims[i % claims.length],
      testmdPath: null,
      surface: [
        "testmd",
        "testrun",
        "run",
        "run",
        "testmd",
        "testrun",
        "run",
        "explore",
      ][i % 8],
      platform: i % 4 === 1 ? "remote_pixel_7" : "desktop_web",
      status: failed ? "failed" : "passed",
      display: failed ? "failed" : healed ? "healed" : "passed",
      exitCode: failed ? 1 : 0,
      resultCode: failed ? "740" : null,
      verdict: failed
        ? {
            confirmed: true,
            category: "sample_regression",
            one_liner: "The sample payment request returned HTTP 500.",
            source: "illustrative replay",
          }
        : null,
      finalState: {
        sample: true,
        order_state: failed ? "pending" : "confirmed",
      },
      credits: 0,
      duration,
      sha: (0x8f2c1a9 + i * 1947).toString(16).slice(0, 7),
      at,
      completedAt: at + duration * 1000,
      review: failed && i < 32,
      testManagerUrl: null,
      targetUrl: "https://staging.nexus.example",
      summary: `Illustrative replay: ${names[i % 8]}. No external service was contacted.`,
      oneLiner: failed
        ? "Sample regression detected in the payment response."
        : "Sample verification completed.",
      reason: "Original Nexus Commerce demonstration scenario",
      error: null,
      role: healed ? "after" : failed ? "before" : null,
      attempt: healed ? 1 : 0,
      trigger: "sample_replay",
      requirementId: `REQ-${String((i % 8) + 1).padStart(3, "0")}`,
      stepsDone: failed ? 2 : 3,
      stepsFailed: failed ? 1 : 0,
      cliVersion: null,
      warnings: [],
      assurance: null,
      stderrTail: null,
      hasEvidence: i < 8,
      thumb:
        i < 8 ? `/images/sample-${failed ? "review" : "checkout"}.svg` : null,
    };
  });
  const requirements: Requirement[] = claims.map((text, i) => ({
    id: `REQ-${String(i + 1).padStart(3, "0")}`,
    text,
    trust: i < 8 ? "trusted" : "derived",
    ...(i < 8
      ? {
          lastRunId: runs.find(
            (r) =>
              r.status === "passed" &&
              r.requirementId === `REQ-${String(i + 1).padStart(3, "0")}`,
          )?.id,
          testmdPath: `.testmuai/tests/${names[i].toLowerCase().replaceAll(" ", "_")}_test.md`,
        }
      : {}),
  }));
  // A sample failure must not be counted as a trusted requirement.
  requirements.forEach((r) => {
    if (!r.lastRunId) r.trust = "derived";
  });
  const battles: BattleDTO[] = Array.from({ length: 8 }, (_, i) => {
    const before = runs[i * 16 + 3],
      after = runs[i * 16 + 1];
    return {
      id: battleId(i),
      label: `BTL-${String(8 - i).padStart(3, "0")}`,
      projectId: SAMPLE_PROJECT_ID,
      mode: "sample_replay",
      state: "REFEREE_PASS",
      scenario: [
        "silent_stripe_500",
        "mobile_cta_overlap",
        "readme_pricing_lie",
        "console_hydration_crash",
      ][i % 4],
      saboteurDiff: null,
      attempts: 1,
      healerDiff: null,
      antiCheatPassed: true,
      antiCheatNotes: "Illustrative audit outcome; no source code was changed.",
      antiCheatChecks: [
        "Tests unchanged",
        "No hardcoded fixture values",
        "Module scope preserved",
      ].map((name) => ({ name, passed: true, detail: "Sample review record" })),
      beforeRunId: before.id,
      afterRunId: after.id,
      receiptHash: null,
      branch: "sample/checkout",
      baseBranch: "main",
      targetUrl: "https://staging.nexus.example",
      objective:
        "Inspect the sample checkout regression and its verification timeline.",
      targets: ["desktop_web", "remote_pixel_7"],
      prNumber: null,
      error: null,
      at: before.at,
      updatedAt: after.completedAt!,
      log: [
        {
          at: new Date(before.at).toISOString(),
          actor: "system",
          message: "Sample baseline loaded. No remote target is modified.",
        },
        {
          at: new Date(before.at + 1000).toISOString(),
          actor: "red",
          message: "The replay includes a checkout regression.",
        },
        {
          at: new Date(before.completedAt!).toISOString(),
          actor: "referee",
          message: "The sample assertion detected an unexpected response.",
        },
        {
          at: new Date(after.at).toISOString(),
          actor: "blue",
          message: "Inspect the corrected response in the follow-up run.",
        },
        {
          at: new Date(after.completedAt!).toISOString(),
          actor: "audit",
          message: "Sample review complete. No live receipt has been issued.",
        },
      ],
    };
  });
  const covered = requirements.filter((r) => r.trust === "trusted").length;
  return {
    projects: [
      {
        id: SAMPLE_PROJECT_ID,
        name: "Nexus Commerce",
        repo: "acme/nexus-commerce",
        repoUrl: "https://github.com/acme/nexus-commerce",
        branch: "main",
        staging: "https://staging.nexus.example",
        production: "https://nexus.example",
        previewUrlTemplate: "",
        spec: "product-spec.md",
        requirements,
        covered,
        coveragePct: (covered / requirements.length) * 100,
        mode: "judge_instant_replay",
        archived: false,
        createdAt: SAMPLE_AT - 86400000,
      },
    ],
    runs,
    battles,
    postmortems: [
      {
        id: "00000001-0003-4000-8000-000000000001",
        battleId: battles[0].id,
        projectId: SAMPLE_PROJECT_ID,
        title: "Checkout recovery: tracing a silent payment failure",
        slug: "sample-checkout-recovery",
        tldr: "A sample incident review of a failed checkout and its re-verification.",
        body: "## Incident overview\nThis illustrative replay follows a silent checkout failure in Nexus Commerce. It is not a live Kane CLI recording.\n\n## Detection\nA payment request returned HTTP 500 while the interface remained on the checkout screen. The sample trace identifies the failing response.\n\n## Resolution\nThe follow-up scenario restores the expected response and retains the cart state. Both the failure and the follow-up remain in the run ledger.\n\n## Verification boundary\nNo remote branch was changed and no HMAC receipt was issued. A real, validated evidence pack is required for publication.",
        beforeShot: "/images/sample-review.svg",
        afterShot: "/images/sample-checkout.svg",
        status: "draft",
        selfVerifiedRunId: null,
        share: {},
        createdAt: SAMPLE_AT,
        publishedAt: null,
      },
    ],
    members: [],
    settings: { sample_workspace: true },
    system: {
      worker: false,
      appUrl: "",
      hmac: false,
      github: false,
      githubWebhook: false,
      llm: null,
      rateLimitPerHour: 12,
      workerReport: null,
    },
    credits: { consumed: 0, budget: 0, reportedBalance: null },
  };
}

export function sampleDetail(run: RunDTO): {
  run: RunDTO;
  events: EventDTO[];
  evidence: EvidenceDTO | null;
} {
  const failed = run.status === "failed";
  const raw: JsonMap[] = [
    {
      type: "stream_start",
      surface: run.surface,
      source: "sample_replay",
      v: 1,
    },
    { step: 1, status: "running", remark: "Open the sample storefront" },
    { step: 1, status: "done", remark: "Storefront baseline loaded" },
    { step: 2, status: "running", remark: "Inspect the checkout state" },
    { step: 2, status: "done", remark: "Cart state retained" },
    { step: 3, status: "running", remark: "Check the payment response" },
    {
      step: 3,
      status: failed ? "failed" : "done",
      remark: failed
        ? "Sample payment request returned HTTP 500"
        : "Order confirmation received",
    },
    {
      type:
        run.surface === "testmd"
          ? "test_md_done"
          : run.surface === "testrun"
            ? "testrun_done"
            : run.surface === "explore"
              ? "done"
              : "run_end",
      status: run.status,
      overall_status: run.status,
      remark: "Sample timeline complete",
      source: "sample_replay",
    },
  ];
  if (run.platform === "remote_pixel_7")
    raw.push({
      type: "remote_done",
      status: run.status,
      exit: run.exitCode,
      source: "sample_replay",
    });
  const events = raw.map(
    (p, i): EventDTO => ({
      seq: i,
      type: String(p.type || "progress"),
      step: typeof p.step === "number" ? p.step : null,
      childId: null,
      stepStatus: p.step ? String(p.status) : null,
      remark: String(p.remark || "Sample replay initialized"),
      payload: { ...p, v: 1, ts: new Date(run.at + i * 800).toISOString() },
      at: run.at + i * 800,
    }),
  );
  const evidence: EvidenceDTO | null = run.hasEvidence
    ? {
        runId: run.id,
        packUrl: null,
        packSha256: null,
        packBytes: null,
        validationExitCode: null,
        policyVerdict: null,
        failingStep: failed ? 3 : null,
        failure: failed
          ? {
              source: "sample",
              raw: "source: illustrative replay\nstep: 3\nexpected: HTTP 200\nobserved: HTTP 500",
            }
          : null,
        screenshots: [1, 2, 3].map((step) => ({
          step,
          url: `/images/sample-${step === 3 && failed ? "review" : "checkout"}.svg`,
          annotated: false,
        })),
        network: [
          { step: 1, method: "GET", url: "/storefront", status: 200, ms: 86 },
          {
            step: 3,
            method: "POST",
            url: "/api/checkout/session",
            status: failed ? 500 : 200,
            ms: 124,
          },
        ],
        console: failed
          ? [
              {
                step: 3,
                level: "error",
                text: "Sample payment confirmation was unavailable",
              },
            ]
          : [],
        devtools: {
          source: "illustrative replay",
          network: { requests: 2, status4xx: 0, status5xx: failed ? 1 : 0 },
          console: {
            messages: failed ? 1 : 0,
            errors: failed ? 1 : 0,
            warnings: 0,
          },
        },
      }
    : null;
  return { run, events, evidence };
}
