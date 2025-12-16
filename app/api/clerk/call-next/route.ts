import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyClerkSession, getClerkCookieName } from "@/lib/clerkSession";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(getClerkCookieName())?.value;
  const session = verifyClerkSession(token);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { slug?: string } | null;
  const slug = (body?.slug || session.slug || "").trim();
  if (!slug) return NextResponse.json({ error: "missing_slug" }, { status: 400 });
  if (slug !== session.slug) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: c, error } = await supabaseAdmin
    .from("counters")
    .select("id, slug, last_issued_number, last_called_number, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !c) return NextResponse.json({ error: "counter_not_found" }, { status: 404 });

  const lastIssued = c.last_issued_number ?? 0;
  const lastCalled = c.last_called_number ?? 0;

  if (lastIssued <= lastCalled) {
    return NextResponse.json({
      called_number: lastCalled,
      last_issued_number: lastIssued,
      waiting_ahead: 0,
      message: "no_one_waiting",
    });
  }

  const nextCalled = lastCalled + 1;

  const { error: updErr } = await supabaseAdmin
    .from("counters")
    .update({ last_called_number: nextCalled, is_active: true })
    .eq("id", c.id);

  if (updErr) return NextResponse.json({ error: "counter_update_failed" }, { status: 500 });

  return NextResponse.json({
    called_number: nextCalled,
    last_issued_number: lastIssued,
    waiting_ahead: Math.max(0, lastIssued - nextCalled),
  });
}
