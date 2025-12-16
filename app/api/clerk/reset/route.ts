import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { scryptSync, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function verifyPin(pin: string, saltB64: string, hashB64: string) {
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const derived = scryptSync(pin, salt, expected.length);
  return timingSafeEqual(expected, derived);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as any;
  const slug = String(body?.slug ?? "").trim();
  const pin = String(body?.pin ?? "").trim();

  if (!slug) return NextResponse.json({ error: "missing_slug" }, { status: 400 });
  if (!pin) return NextResponse.json({ error: "missing_pin" }, { status: 400 });

  const { data: merchant, error: mErr } = await supabaseAdmin
    .from("merchants")
    .select("slug, clerk_pin_enabled, clerk_pin_salt, clerk_pin_hash, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (mErr) {
    console.error("clerk_reset_merchant_read_failed", mErr);
    return NextResponse.json({ error: "merchant_read_failed" }, { status: 500 });
  }

  if (!merchant || merchant.is_active === false) {
    return NextResponse.json({ error: "unknown_slug" }, { status: 404 });
  }

  if (!merchant.clerk_pin_enabled) {
    return NextResponse.json({ error: "pin_disabled" }, { status: 403 });
  }

  if (!merchant.clerk_pin_salt || !merchant.clerk_pin_hash) {
    return NextResponse.json({ error: "pin_not_set" }, { status: 403 });
  }

  const ok = verifyPin(pin, merchant.clerk_pin_salt, merchant.clerk_pin_hash);
  if (!ok) {
    return NextResponse.json({ error: "invalid_pin" }, { status: 401 });
  }

  // Reset contatore
  const { error: cErr } = await supabaseAdmin
    .from("counters")
    .update({ last_issued_number: 0, last_called_number: 0 })
    .eq("slug", slug);

  if (cErr) {
    console.error("clerk_reset_counter_failed", cErr);
    return NextResponse.json({ error: "counter_reset_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
