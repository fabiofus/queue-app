import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { assertAdmin } from "@/lib/adminGuard";

export const runtime = "nodejs";

function requireAdmin(req: NextRequest) {
  try {
    assertAdmin(req.headers);
    return null;
  } catch (e: any) {
    return NextResponse.json({ error: "Unauthorized" }, { status: e?.status ?? 401 });
  }
}

function hashPin(pin: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 64);
  return {
    clerk_pin_salt: salt.toString("base64"),
    clerk_pin_hash: hash.toString("base64"),
  };
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "missing_slug" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("merchants")
    .select("slug, display_name, logo_url, theme, copy, is_active, clerk_pin_hash")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("merchant_get_failed", error);
    return NextResponse.json({ error: "merchant_get_failed" }, { status: 500 });
  }

  if (!data) return NextResponse.json({ merchant: null });

  const { clerk_pin_hash, ...rest } = data as any;
  return NextResponse.json({
    merchant: {
      ...rest,
      has_clerk_pin: !!clerk_pin_hash,
    },
  });
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as any;
  if (!body?.slug) return NextResponse.json({ error: "missing_slug" }, { status: 400 });

  const slug = String(body.slug);

  const payload: any = {
    slug,
    display_name: body.display_name ?? slug,
    logo_url: body.logo_url ?? null,
    theme: body.theme ?? {},
    copy: body.copy ?? {},
    is_active: body.is_active ?? true,
    clerk_pin_enabled: body.clerk_pin_enabled ?? true,
  };

  // Se arriva un PIN nuovo, lo hash-iamo e lo salviamo
  if (typeof body.clerk_pin === "string" && body.clerk_pin.trim().length > 0) {
    const pin = body.clerk_pin.trim();
    if (pin.length < 4) {
      return NextResponse.json({ error: "pin_too_short" }, { status: 400 });
    }
    Object.assign(payload, hashPin(pin));
  }

  // Se vuoi cancellare il PIN, manda clear_clerk_pin: true
  if (body.clear_clerk_pin === true) {
    payload.clerk_pin_hash = null;
    payload.clerk_pin_salt = null;
  }

  const { data, error } = await supabaseAdmin
    .from("merchants")
    .upsert(payload, { onConflict: "slug" })
    .select("slug, display_name, logo_url, theme, copy, is_active, clerk_pin_hash")
    .single();

  if (error) {
    console.error("merchant_upsert_failed", error);
    return NextResponse.json({ error: "merchant_upsert_failed" }, { status: 500 });
  }

  const { clerk_pin_hash, ...rest } = data as any;
  return NextResponse.json({
    merchant: {
      ...rest,
      has_clerk_pin: !!clerk_pin_hash,
    },
  });
}
