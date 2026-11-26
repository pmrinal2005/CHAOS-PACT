import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceSettings } from "@/db/schema";
import type { ChaosScenario } from "./types";

/**
 * CHAOS LAB — a self-hosted, owned sabotage target served by this app at /lab/checkout.
 *
 * The lab's behaviour is driven by a small JSON "source file" (lab/checkout.config.json)
 * stored per battle. The Red team mutates that file, Kane CLI referees the real page in a
 * real browser, and the Blue team must repair the file under the same anti-cheat audit used
 * for repository patches. Nothing here is simulated: the page genuinely breaks and heals.
 */
export const LAB_FILE = "lab/checkout.config.json";

export type LabConfig = {
  /** Behaviour of POST /api/lab/checkout. */
  checkoutApi: "ok" | "error_500";
  /** Promotional banner placement relative to the Pay now CTA. */
  ctaBanner: "inline" | "overlay";
  /** When false, the Pay now handler dereferences an undefined cart summary. */
  cartSummaryGuard: boolean;
  /** Flags applied to the lab_session cookie. */
  sessionCookie: { httpOnly: boolean; secure: boolean; sameSite: "Lax" | "Strict" };
  /** Promo codes the checkout actually honours (percent off). */
  promoCodes: Record<string, number>;
  /** Claims published in the lab's release notes (the "README"). */
  docsClaims: { code: string; percent: number }[];
};

export const LAB_BASELINE: LabConfig = {
  checkoutApi: "ok",
  ctaBanner: "inline",
  cartSummaryGuard: true,
  sessionCookie: { httpOnly: true, secure: true, sameSite: "Lax" },
  promoCodes: { SAVE10: 10 },
  docsClaims: [{ code: "SAVE10", percent: 10 }],
};

export const LAB_PRICE = 100;

export type LabState = {
  scenario: ChaosScenario | null;
  baseline: LabConfig;
  config: LabConfig;
  revision: number;
};

const key = (battleId: string) => `lab:${battleId}`;
const UUID = /^[0-9a-f-]{36}$/i;

export const labSource = (c: LabConfig) => `${JSON.stringify(c, null, 2)}\n`;

export async function getLab(battleId?: string | null): Promise<LabState> {
  if (!battleId || !UUID.test(battleId))
    return { scenario: null, baseline: LAB_BASELINE, config: LAB_BASELINE, revision: 0 };
  const [row] = await db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.key, key(battleId)));
  const v = row?.value as LabState | undefined;
  return v?.config
    ? { ...v, config: normalize(v.config) }
    : { scenario: null, baseline: LAB_BASELINE, config: LAB_BASELINE, revision: 0 };
}

export async function setLab(battleId: string, state: LabState) {
  await db
    .insert(workspaceSettings)
    .values({ key: key(battleId), value: state })
    .onConflictDoUpdate({
      target: workspaceSettings.key,
      set: { value: state, updatedAt: new Date() },
    });
}

/** Parses an untrusted (LLM or operator) config, keeping only the known, typed fields. */
export function parseLabSource(text: string): LabConfig | null {
  try {
    return normalize(JSON.parse(text));
  } catch {
    return null;
  }
}

function normalize(raw: unknown): LabConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<LabConfig>;
  const cookie = (r.sessionCookie || {}) as Partial<LabConfig["sessionCookie"]>;
  const promos: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.promoCodes || {}))
    if (/^[A-Z0-9]{3,16}$/.test(k) && typeof v === "number" && v > 0 && v < 100) promos[k] = v;
  return {
    checkoutApi: r.checkoutApi === "error_500" ? "error_500" : "ok",
    ctaBanner: r.ctaBanner === "overlay" ? "overlay" : "inline",
    cartSummaryGuard: r.cartSummaryGuard !== false,
    sessionCookie: {
      httpOnly: cookie.httpOnly !== false,
      secure: cookie.secure !== false,
      sameSite: cookie.sameSite === "Strict" ? "Strict" : "Lax",
    },
    promoCodes: promos,
    docsClaims: Array.isArray(r.docsClaims)
      ? r.docsClaims
          .filter((c) => c && typeof c.code === "string" && typeof c.percent === "number")
          .slice(0, 6)
          .map((c) => ({ code: c.code.slice(0, 16), percent: c.percent }))
      : [],
  };
}

/** Red team: the realistic regression each scenario applies to the lab file. */
export const LAB_FAULTS: Record<
  ChaosScenario,
  { describe: string; mutate: (c: LabConfig) => LabConfig }
> = {
  silent_stripe_500: {
    describe:
      "Checkout API now returns HTTP 500 while the UI keeps showing a processing spinner (silent revenue loss).",
    mutate: (c) => ({ ...c, checkoutApi: "error_500" }),
  },
  mobile_cta_overlap: {
    describe:
      "A sticky promotional banner is now layered over the Pay now call-to-action, intercepting taps.",
    mutate: (c) => ({ ...c, ctaBanner: "overlay" }),
  },
  console_hydration_crash: {
    describe:
      "The cart summary guard was dropped; Pay now throws an unhandled TypeError in the browser console.",
    mutate: (c) => ({ ...c, cartSummaryGuard: false }),
  },
  cookie_httponly_strip: {
    describe:
      "The lab_session cookie lost its httpOnly and secure flags, exposing the session to page scripts.",
    mutate: (c) => ({ ...c, sessionCookie: { ...c.sessionCookie, httpOnly: false, secure: false } }),
  },
  readme_pricing_lie: {
    describe:
      "Release notes now promise promo code CHAOS20 (20% off), which the checkout never implemented.",
    mutate: (c) => ({ ...c, docsClaims: [...c.docsClaims, { code: "CHAOS20", percent: 20 }] }),
  },
};

const money = (n: number) => `$${n.toFixed(2)}`;

/** Plain-English Kane CLI objective for a scenario, derived from the lab's current state. */
export function labObjective(scenario: ChaosScenario, url: string, _c?: LabConfig) {
  const pay =
    "Click the 'Pay now' button. Verify that the text 'Order confirmed' becomes visible within 15 seconds. Store the displayed order number as order_id.";
  switch (scenario) {
    case "silent_stripe_500":
      return `Open ${url}. ${pay} Assert that no network request returned a 5xx status code.`;
    case "mobile_cta_overlap":
      return `Open ${url}. Verify that the 'Pay now' button is fully visible and not covered by any banner or overlay. ${pay}`;
    case "console_hydration_crash":
      return `Open ${url}. ${pay} Assert that there are zero browser console errors or unhandled JavaScript exceptions.`;
    case "cookie_httponly_strip":
      return `Open ${url}. Wait for the text 'Session ready' to be visible. Assert that the cookie named lab_session exists and is marked httpOnly and secure. ${pay}`;
    case "readme_pricing_lie":
      return `Open ${url}. Read the release notes on the page. For every promo code the release notes mention, type it into the promo code field, click 'Apply', and verify that no 'not valid' error appears and the order total drops by the promised percentage from ${money(LAB_PRICE)}. Fail if any promised promo code is rejected. Then ${pay.charAt(0).toLowerCase()}${pay.slice(1)}`;
  }
}
