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

  const { error } = await supabaseAdmin
    .from("counters")
    .update({ last_issued_number: 0, last_called_number: 0 })
    .eq("slug", slug);

  if (error) return NextResponse.json({ error: "counter_reset_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
