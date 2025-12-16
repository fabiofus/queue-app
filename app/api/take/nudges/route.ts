import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get("slug") || "").trim();
  const ticket = Number((req.nextUrl.searchParams.get("ticket") || "").trim());
  if (!slug || !Number.isFinite(ticket)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("nudges")
    .select("id, message, created_at")
    .eq("counter_slug", slug)
    .eq("ticket_number", ticket)
    .is("consumed_at", null)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) return NextResponse.json({ error: "query_failed" }, { status: 500 });

  const row = (data && data[0]) || null;
  if (!row) return NextResponse.json({ nudge: null });

  await supabaseAdmin.from("nudges").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

  return NextResponse.json({ nudge: { message: row.message, created_at: row.created_at } });
}
