import { createHmac } from "node:crypto";
import { cfg, HttpError, need, safeEqual } from "./config";

/* ----------------------------- LLM (Groq / Gemini) ----------------------------- */

export function llmProvider(): "groq" | "gemini" | null {
  const c = cfg();
  return c.groqKey ? "groq" : c.geminiKey ? "gemini" : null;
}

/** Asks the configured model for a single JSON object. */
export async function chatJson<T>(system: string, user: string): Promise<T> {
  const c = cfg();
  const provider = llmProvider();
  need(
    provider,
    503,
    "No agent model is configured. Set GROQ_API_KEY or GEMINI_API_KEY.",
  );
  let text = "";
  if (provider === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${c.groqKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: c.groqModel,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(50_000),
    });
    if (!res.ok)
      throw new HttpError(502, `Groq request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    text = (await res.json()).choices?.[0]?.message?.content || "";
  } else {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${c.geminiModel}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": c.geminiKey, "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(50_000),
      },
    );
    if (!res.ok)
      throw new HttpError(502, `Gemini request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    text = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
  try {
    return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")) as T;
  } catch {
    throw new HttpError(502, "The agent model did not return valid JSON.");
  }
}

/* ----------------------------------- GitHub ----------------------------------- */

export function parseRepo(url: string) {
  const m = url
    .trim()
    .replace(/\.git$/, "")
    .match(/(?:github\.com[/:])?([\w.-]+)\/([\w.-]+)$/);
  return m ? { owner: m[1], repo: m[2], full: `${m[1]}/${m[2]}` } : null;
}

export class GitHub {
  private base: string;
  constructor(repoUrl: string) {
    const r = parseRepo(repoUrl);
    need(r, 400, "The project repository is not a valid GitHub owner/name.");
    need(cfg().githubToken, 503, "GITHUB_TOKEN is not configured.");
    this.base = `https://api.github.com/repos/${r!.full}`;
  }
  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${cfg().githubToken}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "content-type": "application/json",
        ...(init.headers || {}),
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok)
      throw new HttpError(
        502,
        `GitHub ${init.method || "GET"} ${path.split("?")[0]} failed (${res.status}): ${(await res.text()).slice(0, 200)}`,
      );
    return (res.status === 204 ? null : await res.json()) as T;
  }
  async branchSha(branch: string) {
    const ref = await this.call<{ object: { sha: string } }>(
      `/git/ref/heads/${encodeURIComponent(branch)}`,
    );
    return ref.object.sha;
  }
  async tree(ref: string) {
    const t = await this.call<{ tree: { path: string; type: string; size?: number }[] }>(
      `/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    );
    return t.tree.filter((n) => n.type === "blob");
  }
  async file(path: string, ref: string) {
    const f = await this.call<{ content: string; sha: string }>(
      `/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`,
    );
    return { content: Buffer.from(f.content, "base64").toString("utf8"), sha: f.sha };
  }
  async createBranch(name: string, sha: string) {
    await this.call(`/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${name}`, sha }),
    });
  }
  async putFile(path: string, content: string, message: string, branch: string, sha: string) {
    const r = await this.call<{ commit: { sha: string } }>(
      `/contents/${path.split("/").map(encodeURIComponent).join("/")}`,
      {
        method: "PUT",
        body: JSON.stringify({
          message,
          branch,
          sha,
          content: Buffer.from(content, "utf8").toString("base64"),
        }),
      },
    );
    return r.commit.sha;
  }
  async compare(base: string, head: string) {
    const r = await this.call<{ files?: { filename: string; status: string; patch?: string }[] }>(
      `/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
    );
    return r.files || [];
  }
  async prFiles(number: number) {
    return this.call<{ filename: string; status: string }[]>(
      `/pulls/${number}/files?per_page=100`,
    );
  }
  async comment(number: number, body: string) {
    await this.call(`/issues/${number}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }
}

export function verifyGithubSignature(rawBody: string, signature: string | null) {
  const { githubWebhookSecret } = cfg();
  need(githubWebhookSecret, 503, "GITHUB_WEBHOOK_SECRET is not configured.");
  const expected = `sha256=${createHmac("sha256", githubWebhookSecret).update(rawBody).digest("hex")}`;
  need(signature && safeEqual(signature, expected), 401, "Invalid webhook signature.");
}
