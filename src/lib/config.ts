import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Runtime configuration. Read lazily so values are never baked into the build. */
export function cfg() {
  const e = process.env;
  const strip = (v?: string) => (v || "").trim().replace(/\/+$/, "");
  return {
    workerUrl: strip(e.KANE_WORKER_URL),
    workerSecret: (e.WORKER_SHARED_SECRET || "").trim(),
    appUrl: strip(
      e.APP_BASE_URL ||
        (e.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${e.VERCEL_PROJECT_PRODUCTION_URL}`
          : ""),
    ),
    hmacSecret: (e.HMAC_SECRET || "").trim(),
    githubToken: (e.GITHUB_TOKEN || "").trim(),
    githubWebhookSecret: (e.GITHUB_WEBHOOK_SECRET || "").trim(),
    groqKey: (e.GROQ_API_KEY || "").trim(),
    geminiKey: (e.GEMINI_API_KEY || "").trim(),
    groqModel: e.GROQ_MODEL || "llama-3.3-70b-versatile",
    geminiModel: e.GEMINI_MODEL || "gemini-2.0-flash",
    // No default: a balance is only shown once it is configured or reported.
    creditBudget: Number(e.KANE_CREDIT_BUDGET) || 0,
    rateLimitPerHour: Number(e.RUN_RATE_LIMIT_PER_HOUR) || 12,
    deployWaitS: Number(e.PREVIEW_DEPLOY_WAIT_S ?? 90) || 0,
    policyId: (e.KANE_POLICY_ID || "").trim(),
  };
}

/** Public origin used for worker callbacks and published links. */
export function appUrlFor(req?: Request) {
  const fixed = cfg().appUrl;
  if (fixed || !req) return fixed;
  const h = req.headers;
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!host) return new URL(req.url).origin;
  const proto =
    h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
  }
}
export const need = (cond: unknown, status: number, message: string) => {
  if (!cond) throw new HttpError(status, message);
};

/** Wraps a route handler so thrown HttpErrors become JSON responses. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError)
      return Response.json(
        { error: err.message, detail: err.detail },
        { status: err.status },
      );
    console.error(err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 },
    );
  }
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function requireWorker(req: Request) {
  const { workerSecret } = cfg();
  need(workerSecret, 503, "WORKER_SHARED_SECRET is not configured.");
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  need(token && safeEqual(token, workerSecret), 401, "Invalid worker credentials.");
}

export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** Stable JSON so signatures do not depend on key order. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value as object)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(value ?? null);
}
export function signReceipt(payload: unknown) {
  const { hmacSecret } = cfg();
  need(hmacSecret, 503, "HMAC_SECRET is not configured, so receipts cannot be signed.");
  return createHmac("sha256", hmacSecret).update(canonical(payload)).digest("hex");
}
export function verifyReceipt(payload: unknown, signature: string) {
  const { hmacSecret } = cfg();
  if (!hmacSecret || !signature) return false;
  return safeEqual(
    createHmac("sha256", hmacSecret).update(canonical(payload)).digest("hex"),
    signature,
  );
}
export function requesterHash(req: Request) {
  const ip =
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return sha256(`chaos-pact:${ip}`).slice(0, 24);
}
export const isHttpUrl = (v: unknown): v is string => {
  try {
    return typeof v === "string" && ["http:", "https:"].includes(new URL(v).protocol);
  } catch {
    return false;
  }
};
