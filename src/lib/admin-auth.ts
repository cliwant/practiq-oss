/**
 * Admin authentication.
 *
 * Two surfaces:
 *   - Node runtime  (api/admin/login):  bcrypt password verify, then issue session cookie
 *   - Edge runtime  (middleware):       HMAC-verify the session cookie (no bcrypt available)
 *
 * Session cookie format:    `<emailB64>.<expiresAtMs>.<hexSig>`
 * Signature:                HMAC-SHA256( ADMIN_TOKEN, `${emailB64}.${expiresAtMs}` )
 *
 * Why HMAC instead of full sessions in DB:
 *   - Stateless — works in middleware without a DB roundtrip
 *   - Tamper-proof — middleware can verify without checking a session table
 *   - Revocation = rotate ADMIN_TOKEN (invalidates all sessions immediately)
 */

export interface AdminUser {
  email: string;
  name?: string;
  passwordHash: string;
}

export interface AdminSession {
  email: string;
  expiresAtMs: number;
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ───────── Edge-safe helpers ─────────

const enc = new TextEncoder();

function base64UrlEncode(s: string): string {
  // Edge runtime has btoa, but not Buffer. Use TextEncoder + bytes-to-b64.
  const bytes = enc.encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(s.length + ((4 - (s.length % 4)) % 4), "=");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function bytesToHex(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += b.toString(16).padStart(2, "0");
  return s;
}

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return bytesToHex(sig);
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ───────── Session signing / verification (Edge + Node) ─────────

function getHmacSecret(): string | null {
  return process.env.ADMIN_TOKEN?.trim() || null;
}

export async function signSession(email: string, ttlMs: number = SESSION_TTL_MS): Promise<string | null> {
  const secret = getHmacSecret();
  if (!secret) return null;
  const expiresAtMs = Date.now() + ttlMs;
  const emailB64 = base64UrlEncode(email);
  const payload = `${emailB64}.${expiresAtMs}`;
  const sig = await hmacSha256Hex(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifySession(cookie: string | undefined): Promise<AdminSession | null> {
  if (!cookie) return null;
  const secret = getHmacSecret();
  if (!secret) return null;

  const parts = cookie.split(".");
  if (parts.length !== 3) return null;
  const [emailB64, expStr, sig] = parts;

  const expiresAtMs = parseInt(expStr, 10);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) return null;

  const expected = await hmacSha256Hex(secret, `${emailB64}.${expiresAtMs}`);
  if (!constantTimeEqualHex(sig, expected)) return null;

  let email: string;
  try {
    email = base64UrlDecode(emailB64);
  } catch {
    return null;
  }
  return { email, expiresAtMs };
}

// ───────── User lookup (Node-only — used in api/admin/login) ─────────

/**
 * Parse ADMIN_USERS env (JSON array of {email, name, passwordHash}).
 * Returns [] if env is missing or malformed.
 */
export function getAdminUsers(): AdminUser[] {
  const raw = process.env.ADMIN_USERS?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((u): u is AdminUser =>
      u && typeof u.email === "string" && typeof u.passwordHash === "string"
    );
  } catch {
    return [];
  }
}

export function findAdminUserByEmail(email: string): AdminUser | null {
  const users = getAdminUsers();
  const target = email.toLowerCase().trim();
  return users.find((u) => u.email.toLowerCase() === target) ?? null;
}
