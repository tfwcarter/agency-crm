// Single shared "this site is private" gate that sits in front of the whole app
// (separate from — and before — per-user login). The password lives ONLY in the
// SITE_GATE_PASSWORD env var, never in the repo, because this project is public
// on GitHub. When the env var is unset the gate is disabled and the site is open.
//
// The unlock cookie stores an HMAC of the password keyed by AUTH_SECRET, so it is
// unguessable and can't be forged without the server secret. Edge-safe (uses Web
// Crypto), so it works in both proxy.ts and server actions.

export const GATE_COOKIE = "shepherds_gate";

export function getGatePassword(): string | null {
  const p = process.env.SITE_GATE_PASSWORD;
  return p && p.length > 0 ? p : null;
}

export function isGateEnabled(): boolean {
  return getGatePassword() !== null;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** HMAC(password) keyed by AUTH_SECRET → the unforgeable cookie value. */
export async function gateToken(): Promise<string> {
  const password = getGatePassword() ?? "";
  const secret = process.env.AUTH_SECRET || "shepherds-site-gate";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("site-gate:v1:" + password));
  return toHex(sig);
}

export async function verifyGateToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  return token === (await gateToken());
}

export async function checkGatePassword(input: string): Promise<boolean> {
  const password = getGatePassword();
  if (!password) return false;
  return input === password;
}
