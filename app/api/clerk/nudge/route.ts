import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyClerkSession, getClerkCookieName } from "@/lib/clerkSession";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(getClerkCookieName())?.value;
  const session = verifyClerkSession(token);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { slug?: string; ticket_number?: number; message?: string }
    | null;

  const slug = (body?.slug || session.slug || "").trim();
  const ticket = Number(body?.ticket_number);

  if (!slug || !Number.isFinite(ticket)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (slug !== session.slug) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const message = (body?.message || "Il tuo turno è arrivato: per favore presentati al bancone.").trim();

  const { error } = await supabaseAdmin.from("nudges").insert({
    counter_slug: slug,
    ticket_number: ticket,
    message,
  });

  if (error) return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
