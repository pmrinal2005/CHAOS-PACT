export type SigningSecret = { value: string; at: number; version: number };

export function randomSecret() {
  return Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export function currentSigningSecret(): SigningSecret {
  const key = "chaos-pact-v1:sandbox-hmac";
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (saved && /^[a-f0-9]{40}$/.test(saved.value)) return saved;
  } catch {
    /* Create a clean local signing identity if stored data is unavailable. */
  }
  const secret = { value: randomSecret(), at: Date.now(), version: 1 };
  try {
    localStorage.setItem(key, JSON.stringify(secret));
  } catch {
    /* Private sessions can still export a signed artifact. */
  }
  return secret;
}

export async function signEvidence(payload: object) {
  if (!crypto.subtle)
    return {
      algorithm: "none",
      reason: "Signing requires a secure browser context.",
    };
  const secret = currentSigningSecret();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret.value),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(JSON.stringify(payload)),
  );
  return {
    algorithm: "HMAC-SHA256",
    keyVersion: secret.version,
    signature: Array.from(new Uint8Array(signature), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join(""),
    scope: "local-sandbox",
  };
}
