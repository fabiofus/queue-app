import { NextRequest, NextResponse } from "next/server";
import { scryptSync, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { signClerkSession, getClerkCookieName } from "@/lib/clerkSession";

export const runtime = "nodejs";

function verifyPin(pin: string, saltB64: string, hashB64: string) {
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const derived = scryptSync(pin, salt, expected.length);
  return timingSafeEqual(expected, derived);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { slug?: string; pin?: string } | null;
  const slug = (body?.slug || "").trim();
  const pin = (body?.pin || "").trim();

  if (!slug || !pin) return NextResponse.json({ error: "missing_slug_or_pin" }, { status: 400 });

  const { data: m, error } = await supabaseAdmin
    .from("merchants")
    .select("slug, is_active, clerk_pin_enabled, clerk_pin_salt, clerk_pin_hash")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !m) return NextResponse.json({ error: "merchant_not_found" }, { status: 404 });
  if (m.is_active === false) return NextResponse.json({ error: "merchant_inactive" }, { status: 403 });
  if (m.clerk_pin_enabled === false) return NextResponse.json({ error: "pin_disabled" }, { status: 403 });
  if (!m.clerk_pin_salt || !m.clerk_pin_hash) return NextResponse.json({ error: "pin_not_set" }, { status: 400 });

  const ok = verifyPin(pin, m.clerk_pin_salt, m.clerk_pin_hash);
  if (!ok) return NextResponse.json({ error: "invalid_pin" }, { status: 401 });

  const token = signClerkSession(slug);
  const res = NextResponse.json({ ok: true });

  res.cookies.set(getClerkCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return res;
}
