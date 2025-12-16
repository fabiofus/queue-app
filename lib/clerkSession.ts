import crypto from "crypto";

const COOKIE_NAME = "eng_clerk_session";
const ONE_DAY_S = 60 * 60 * 24;

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(input: string) {
  const pad = input.length % 4 ? "=".repeat(4 - (input.length % 4)) : "";
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}
function getSecret() {
  const s = process.env.CLERK_SESSION_SECRET;
  if (!s) throw new Error("CLERK_SESSION_SECRET mancante");
  return s;
}

export function getClerkCookieName() {
  return COOKIE_NAME;
}

export function signClerkSession(slug: string, maxAgeSec = ONE_DAY_S) {
  const payload = { v: 1, slug, exp: Math.floor(Date.now() / 1000) + maxAgeSec };
  const payloadPart = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", getSecret()).update(payloadPart).digest();
  return `${payloadPart}.${b64url(sig)}`;
}

export function verifyClerkSession(token: string | undefined | null): { slug: string } | null {
  if (!token) return null;
  const [payloadPart, sigPart] = token.split(".");
  if (!payloadPart || !sigPart) return null;

  const expected = crypto.createHmac("sha256", getSecret()).update(payloadPart).digest();
  const got = b64urlDecode(sigPart);
  if (got.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(got, expected)) return null;

  const payloadRaw = b64urlDecode(payloadPart).toString("utf8");
  const payload = JSON.parse(payloadRaw) as { v: number; slug: string; exp: number };

  if (!payload?.slug || !payload?.exp) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return { slug: payload.slug };
}
