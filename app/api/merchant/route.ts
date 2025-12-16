import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "missing_slug" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("merchants")
    .select("slug, display_name, logo_url, theme, copy, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("merchant_public_get_failed", error);
    return NextResponse.json({ error: "merchant_get_failed" }, { status: 500 });
  }

  // se non esiste, ritorniamo null e la pagina userà i default
  return NextResponse.json({ merchant: data ?? null });
}
