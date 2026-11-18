#!/usr/bin/env node
/**
 * CHAOS-PACT cloud Kane execution worker.
 *
 * Accepts authenticated jobs from the control plane, spawns `kane-cli`,
 * forwards every stdout NDJSON line as it happens, then validates and unpacks
 * the sealed .evidence pack. Zero npm dependencies; needs node >= 20, git,
 * unzip, Google Chrome and @testmuai/kane-cli on PATH (see Dockerfile).
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { createInterface } from "node:readline";

const env = process.env;
const SECRET = env.WORKER_SHARED_SECRET || "";
const KANE = env.KANE_CLI_BIN || "kane-cli";
const CONCURRENCY = Number(env.WORKER_CONCURRENCY) || 1;
const STORAGE = env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
  ? { url: env.SUPABASE_URL.replace(/\/+$/, ""), key: env.SUPABASE_SERVICE_ROLE_KEY, bucket: env.SUPABASE_BUCKET || "evidence-packs" }
  : null;
const CHILD_ENV = {
  ...env,
  KANE_CLI_CHROME_PATH: env.KANE_CLI_CHROME_PATH || "/usr/bin/google-chrome",
  KANE_CLI_SKIP_BROWSER_DOWNLOAD: env.KANE_CLI_SKIP_BROWSER_DOWNLOAD || "1",
  KANE_CLI_CDP_TIMEOUT_MS: env.KANE_CLI_CDP_TIMEOUT_MS || "60000",
  KANE_CLI_CDP_RETRIES: env.KANE_CLI_CDP_RETRIES || "2",
};
const GRID = {
  remote_pixel_7: ["--remote", "--device-name", "Pixel 7", "--os-version", "14"],
  ios_simulator: ["--remote", "--device-name", env.KANE_IOS_DEVICE || "iPhone 15", "--os-version", env.KANE_IOS_VERSION || "17"],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString(), ...a);

/** Runs a command to completion with stdin closed; never throws. */
function exec(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    let out = "";
    let err = "";
    const child = spawn(cmd, args, { ...opts, env: CHILD_ENV, stdio: ["ignore", "pipe", "pipe"] });
    const timer = setTimeout(() => child.kill("SIGKILL"), opts.timeoutMs || 120_000);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => { clearTimeout(timer); resolve({ code: 127, out, err: `${err}${e.message}` }); });
    child.on("close", (code) => { clearTimeout(timer); resolve({ code: code ?? 1, out, err }); });
  });
}

async function report(job, body) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(job.callbackUrl, {
        method: "POST",
        headers: { authorization: `Bearer ${SECRET}`, "content-type": "application/json" },
        body: JSON.stringify({ runId: job.runId, ...body }),
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) return true;
      log("callback rejected", res.status, (await res.text()).slice(0, 200));
      if (res.status >= 400 && res.status < 500) return false;
    } catch (e) {
      log("callback failed", e.message);
    }
    await sleep(1500 * (attempt + 1));
  }
  return false;
}

/** Step 1: non-interactive auth and credit preflight. */
async function preflight() {
  const version = await exec(KANE, ["--version"], { timeoutMs: 30_000 });
  if (version.code === 127) return { ok: false, error: `${KANE} is not installed on this worker.` };
  let who = await exec(KANE, ["whoami"], { timeoutMs: 60_000 });
  if (who.code !== 0 && env.LT_USERNAME && env.LT_ACCESS_KEY) {
    await exec(KANE, ["login", "--username", env.LT_USERNAME, "--access-key", env.LT_ACCESS_KEY], { timeoutMs: 60_000 });
    who = await exec(KANE, ["whoami"], { timeoutMs: 60_000 });
  }
  const balance = await exec(KANE, ["balance"], { timeoutMs: 60_000 });
  const amount = balance.code === 0 ? balance.out.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/) : null;
  return {
    ok: who.code === 0,
    error: who.code === 0 ? undefined : "Kane CLI is not authenticated. Set LT_USERNAME and LT_ACCESS_KEY on the worker.",
    info: {
      cliVersion: version.out.trim().split(/\s+/).pop(),
      whoami: who.out.trim().split("\n")[0]?.slice(0, 120),
      authenticated: who.code === 0,
      balance: amount ? Number(amount[0]) : null,
    },
  };
}

async function checkout(job, dir) {
  const m = String(job.repo?.url || "").match(/github\.com[/:]([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
  if (!m) throw new Error("Job has no GitHub repository to check out.");
  const auth = env.GITHUB_TOKEN ? `x-access-token:${env.GITHUB_TOKEN}@` : "";
  const git = (args) => exec("git", args, { cwd: dir, timeoutMs: 180_000 });
  await git(["init", "-q"]);
  await git(["remote", "add", "origin", `https://${auth}github.com/${m[1]}.git`]);
  const fetched = await git(["fetch", "-q", "--depth", "1", "origin", job.repo.ref || "HEAD"]);
  if (fetched.code !== 0) throw new Error(`git fetch ${job.repo.ref} failed: ${fetched.err.replace(env.GITHUB_TOKEN || "\u0000", "***").slice(-300)}`);
  await git(["checkout", "-q", "FETCH_HEAD"]);
}

const safeRel = (p) => typeof p === "string" && /^[\w./-]+$/.test(p) && !p.split("/").includes("..") && !p.startsWith("/");

/** Builds the kane-cli argv for a job. Web runs are the default target. */
async function buildCommand(job, dir) {
  const grid = GRID[job.platform];
  const policy = job.policyId ? ["--policy-id", String(job.policyId)] : [];
  let testmd = safeRel(job.testmdPath) ? job.testmdPath : null;
  if (job.testmdContent || (grid && job.objective && !testmd)) {
    testmd = `.testmuai/tests/chaos-pact-${job.runId.slice(0, 8)}_test.md`;
    const content = job.testmdContent ||
      `---\nmode: testing\nurl: ${job.url}\ntimeout: ${job.timeoutS || 180}\n---\n# ${String(job.objective).split(/[.\n]/)[0].slice(0, 80)}\n\n## Objective\n${job.objective}\n`;
    await mkdir(join(dir, dirname(testmd)), { recursive: true });
    await writeFile(join(dir, testmd), content);
  }
  if (job.surface === "explore") return ["explore", "run", "--url", job.url, "--agent"];
  if (job.surface === "testrun" || grid) {
    const select = testmd ? [testmd] : job.tags ? ["--tags", String(job.tags)] : [];
    const parallel = job.parallel && !testmd ? ["--parallel", String(job.parallel)] : [];
    return ["testrun", "run", ...select, ...parallel, "--agent", ...(grid || []), ...policy];
  }
  if (job.surface === "testmd") {
    if (!testmd) throw new Error("testmd surface needs a testmd path or content.");
    return ["testmd", "run", testmd, "--agent", ...policy];
  }
  if (!job.objective) throw new Error("run surface needs an objective.");
  return [
    "run", job.objective, "--agent", "--headless",
    "--timeout", String(job.timeoutS || 180),
    ...(job.url ? ["--url", job.url] : []),
    ...(job.bugDetection && job.bugDetection !== "off" ? ["--bug-detection", job.bugDetection] : []),
    ...(job.variables && Object.keys(job.variables).length ? ["--variables", JSON.stringify(job.variables)] : []),
    ...(job.platform === "android_real" ? ["--target", "android"] : []),
  ];
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

async function upload(path, data, type) {
  if (!STORAGE) return null;
  const res = await fetch(`${STORAGE.url}/storage/v1/object/${STORAGE.bucket}/${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${STORAGE.key}`, "content-type": type, "x-upsert": "true" },
    body: data,
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) { log("storage upload failed", path, res.status); return null; }
  return `${STORAGE.url}/storage/v1/object/public/${STORAGE.bucket}/${path}`;
}

function parseRecords(text) {
  try {
    const j = JSON.parse(text);
    if (Array.isArray(j)) return j;
    if (Array.isArray(j?.log?.entries)) return j.log.entries; // HAR
    for (const k of ["entries", "requests", "logs", "messages", "events"]) if (Array.isArray(j?.[k])) return j[k];
    return [j];
  } catch {
    return text.split("\n").map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  }
}
const stepOf = (file, rec) => {
  const n = rec?.step ?? rec?.step_index ?? rec?.stepIndex ?? file.match(/step[_-]?(\d+)/i)?.[1];
  return n === undefined || n === null || Number.isNaN(Number(n)) ? null : Number(n);
};

/** Steps 7-8: locate, validate, hash, upload and unpack the sealed evidence pack. */
async function collectEvidence(job, dir, stderr, sessionDir) {
  const hint = stderr.match(/evidence serve\s+[`'"]?([^\s`'"]+)/)?.[1];
  const candidates = [];
  if (hint) candidates.push(hint.startsWith("~") ? join(homedir(), hint.slice(1)) : hint.startsWith("/") ? hint : join(dir, hint));
  for (const d of [join(dir, ".testmuai/evidence"), sessionDir && join(sessionDir.replace(/^~/, homedir()), "evidence")].filter(Boolean)) {
    try {
      const packs = (await readdir(d)).filter((f) => f.endsWith(".evidence")).map((f) => join(d, f));
      const dated = await Promise.all(packs.map(async (p) => ({ p, t: (await stat(p)).mtimeMs })));
      candidates.push(...dated.sort((a, b) => b.t - a.t).map((x) => x.p));
    } catch { /* directory absent */ }
  }
  let pack = null;
  for (const c of candidates) { try { if ((await stat(c)).isFile()) { pack = c; break; } } catch { /* next */ } }
  if (!pack) return null;

  const bytes = await readFile(pack);
  const validation = await exec(KANE, ["evidence", "validate", pack], { cwd: dir, timeoutMs: 60_000 });
  let policyVerdict = null;
  if (job.policyId) {
    const v = await exec(KANE, ["evidence", "verdict", pack], { cwd: dir, timeoutMs: 60_000 });
    policyVerdict = { exit: v.code, output: (v.out || v.err).slice(0, 4000) };
  }
  const prefix = `${job.runId}`;
  const evidence = {
    packUrl: await upload(`${prefix}/${basename(pack)}`, bytes, "application/zip"),
    packSha256: createHash("sha256").update(bytes).digest("hex"),
    packBytes: bytes.length,
    validationExitCode: validation.code,
    policyVerdict,
    failingStepIndex: null,
    failure: null,
    screenshots: [],
    network: [],
    console: [],
    devtools: null,
  };
  const unpacked = await mkdtemp(join(tmpdir(), "evidence-"));
  try {
    const unzip = await exec("unzip", ["-o", "-q", pack, "-d", unpacked], { timeoutMs: 60_000 });
    if (unzip.code > 1) return evidence;
    const net = [];
    const con = [];
    for (const file of await walk(unpacked)) {
      const rel = relative(unpacked, file);
      const lower = rel.toLowerCase();
      if (/\.(png|jpe?g|webp)$/.test(lower)) {
        const url = await upload(`${prefix}/${rel.replace(/[^\w./-]/g, "_")}`, await readFile(file), lower.endsWith("png") ? "image/png" : lower.endsWith("webp") ? "image/webp" : "image/jpeg");
        if (url) evidence.screenshots.push({ step: stepOf(rel) ?? evidence.screenshots.length + 1, url, annotated: /annot/.test(lower) });
      } else if (/failure\.ya?ml$/.test(lower)) {
        const raw = (await readFile(file, "utf8")).slice(0, 8000);
        const scalars = Object.fromEntries([...raw.matchAll(/^([\w-]+):\s*(.+)$/gm)].map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]));
        evidence.failure = { ...scalars, raw };
        evidence.failingStepIndex = stepOf(rel, scalars);
      } else if (/network/.test(lower) && /\.(json|ndjson|jsonl|har|log)$/.test(lower)) {
        for (const r of parseRecords(await readFile(file, "utf8")))
          net.push({ step: stepOf(rel, r), method: r.method ?? r.request?.method ?? "GET", url: String(r.url ?? r.request?.url ?? r.path ?? "").slice(0, 300), status: Number(r.status ?? r.response?.status ?? r.status_code ?? 0), ms: r.duration ?? r.time ?? r.duration_ms ?? null });
      } else if (/console/.test(lower) && /\.(json|ndjson|jsonl|log|txt)$/.test(lower)) {
        const text = await readFile(file, "utf8");
        const records = parseRecords(text);
        if (records.length) for (const r of records) con.push({ step: stepOf(rel, r), level: String(r.level ?? r.type ?? "log").toLowerCase(), text: String(r.text ?? r.message ?? JSON.stringify(r)).slice(0, 500) });
        else for (const line of text.split("\n").filter(Boolean)) con.push({ step: stepOf(rel), level: /error|exception/i.test(line) ? "error" : "log", text: line.slice(0, 500) });
      }
    }
    const errors = net.filter((n) => n.status >= 400);
    const loud = con.filter((c) => /error|exception|warn/.test(c.level));
    // Keep every failure, then fill with ordinary traffic for context.
    evidence.network = [...errors, ...net.filter((n) => n.status < 400)].slice(0, 300);
    evidence.console = [...loud, ...con.filter((c) => !/error|exception|warn/.test(c.level))].slice(0, 300);
    evidence.screenshots.sort((a, b) => a.step - b.step || Number(a.annotated) - Number(b.annotated));
    evidence.devtools = {
      network: { requests: net.length, status4xx: net.filter((n) => n.status >= 400 && n.status < 500).length, status5xx: net.filter((n) => n.status >= 500).length },
      console: { messages: con.length, errors: con.filter((c) => /error|exception/.test(c.level)).length, warnings: con.filter((c) => /warn/.test(c.level)).length },
      screenshots: evidence.screenshots.length,
      storageConfigured: !!STORAGE,
    };
  } finally {
    await rm(unpacked, { recursive: true, force: true });
  }
  return evidence;
}

async function runJob(job) {
  const dir = await mkdtemp(join(tmpdir(), "chaos-pact-"));
  const fail = (error, exitCode = 2) => report(job, { final: { exitCode, error } });
  try {
    const pre = await preflight();
    if (pre.info) await report(job, { preflight: pre.info });
    if (!pre.ok) return await fail(pre.error);

    const needsRepo = job.surface === "testrun" || job.assurance || (job.testmdPath && !job.testmdContent);
    if (needsRepo) await checkout(job, dir);
    if (job.url || job.variables) {
      await mkdir(join(dir, ".testmuai/variables"), { recursive: true });
      await writeFile(join(dir, ".testmuai/variables/chaos-pact.json"), JSON.stringify({ ...(job.variables || {}), ...(job.url ? { base_url: { value: job.url } } : {}) }, null, 2));
    }
    if (job.deployWaitS) await sleep(Math.min(600, job.deployWaitS) * 1000);

    let assurance;
    if (job.assurance) {
      const reconcile = await exec(KANE, ["maintain", "reconcile", "--plan"], { cwd: dir, timeoutMs: 300_000 });
      const gaps = await exec(KANE, ["cover", "gaps", "--json"], { cwd: dir, timeoutMs: 120_000 });
      let gapsJson = null;
      try { gapsJson = JSON.parse(gaps.out); } catch { /* keep raw */ }
      assurance = { reconcile: { exit: reconcile.code, output: (reconcile.out || reconcile.err).slice(0, 6000) }, coverGaps: { exit: gaps.code, json: gapsJson, output: gapsJson ? undefined : (gaps.out || gaps.err).slice(0, 6000) } };
    }

    const args = await buildCommand(job, dir);
    log("spawn", KANE, args.map((a) => (a.length > 60 ? `${a.slice(0, 57)}...` : a)).join(" "));
    // stdin is closed so kane-cli can never wait on a prompt or enter the TUI.
    const child = spawn(KANE, args, { cwd: dir, env: CHILD_ENV, stdio: ["ignore", "pipe", "pipe"] });
    let seq = 0;
    let pending = [];
    let stderr = "";
    let sessionDir = null;
    let killedForTimeout = false;
    let flushing = Promise.resolve();
    const flush = () => {
      if (!pending.length) return flushing;
      const events = pending;
      pending = [];
      flushing = flushing.then(() => report(job, { events }));
      return flushing;
    };
    const ticker = setInterval(flush, 400);
    const killer = setTimeout(() => { killedForTimeout = true; child.kill("SIGKILL"); }, ((job.timeoutS || 180) + 120) * 1000);
    child.stderr.on("data", (d) => { stderr = (stderr + d).slice(-20_000); });
    // Split on newlines; skip any line that is not JSON; keep unknown fields.
    createInterface({ input: child.stdout }).on("line", (line) => {
      const t = line.trim();
      if (!t.startsWith("{")) return;
      try {
        const payload = JSON.parse(t);
        if (!payload || typeof payload !== "object") return;
        if (typeof payload.session_dir === "string") sessionDir = payload.session_dir;
        pending.push({ seq: seq++, payload, ts: new Date().toISOString() });
      } catch { /* preamble or partial line */ }
    });
    const exitCode = await new Promise((resolve) => {
      child.on("error", (e) => { stderr += `\n${e.message}`; resolve(2); });
      child.on("close", (code) => resolve(killedForTimeout ? 3 : code ?? 2));
    });
    clearInterval(ticker);
    clearTimeout(killer);
    await flush();

    let evidence = null;
    try { evidence = await collectEvidence(job, dir, stderr, sessionDir); } catch (e) { log("evidence unpack failed", e.message); }
    await report(job, { final: { exitCode, stderrTail: stderr.slice(-4000), assurance, evidence, error: exitCode >= 2 ? stderr.trim().split("\n").filter(Boolean).pop()?.slice(0, 400) : undefined } });
    log("done", job.runId, "exit", exitCode, evidence ? "evidence sealed" : "no evidence pack");
  } catch (e) {
    log("job failed", job.runId, e.message);
    await fail(e.message);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const queue = [];
let active = 0;
function pump() {
  while (active < CONCURRENCY && queue.length) {
    const job = queue.shift();
    active++;
    runJob(job).finally(() => { active--; pump(); });
  }
}

createServer(async (req, res) => {
  const send = (status, body) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
  if (req.method === "GET" && req.url === "/health") return send(200, { ok: true, active, queued: queue.length, storage: !!STORAGE });
  if (req.method !== "POST" || req.url !== "/jobs") return send(404, { error: "Not found" });
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!SECRET || token.length !== SECRET.length || !createHash("sha256").update(token).digest().equals(createHash("sha256").update(SECRET).digest()))
    return send(401, { error: "Invalid worker credentials" });
  let raw = "";
  for await (const chunk of req) { raw += chunk; if (raw.length > 2_000_000) return send(413, { error: "Job too large" }); }
  let job;
  try { job = JSON.parse(raw); } catch { return send(400, { error: "Invalid JSON" }); }
  if (!/^[0-9a-f-]{36}$/i.test(job?.runId || "") || !/^https?:\/\//.test(job?.callbackUrl || "")) return send(400, { error: "runId and callbackUrl are required" });
  if (queue.length >= 25) return send(429, { error: "Worker queue is full" });
  queue.push(job);
  pump();
  send(202, { accepted: true, queued: queue.length, active });
}).listen(Number(env.PORT) || 8787, () => log(`CHAOS-PACT worker listening on :${Number(env.PORT) || 8787}`, SECRET ? "" : "(WARNING: WORKER_SHARED_SECRET is not set; all jobs will be rejected)"));
