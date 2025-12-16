import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyClerkSession, getClerkCookieName } from "@/lib/clerkSession";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(getClerkCookieName())?.value;
  const session = verifyClerkSession(token);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const slug = (req.nextUrl.searchParams.get("slug") || session.slug || "").trim();
  const ticket = Number((req.nextUrl.searchParams.get("ticket") || "").trim());

  if (!slug || !Number.isFinite(ticket)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (slug !== session.slug) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("full_name, phone, ticket_number")
    .eq("counter_slug", slug)
    .eq("ticket_number", ticket)
    .order("id", { ascending: false })
    .limit(1);

  if (error) return NextResponse.json({ error: "query_failed" }, { status: 500 });

  const row = (data && data[0]) || null;
  return NextResponse.json({ contact: row ? { full_name: row.full_name, phone: row.phone } : null });
}
