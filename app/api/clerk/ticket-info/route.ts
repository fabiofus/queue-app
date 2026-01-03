import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const slug = url.searchParams.get("slug") || "";
    const ticketParam = url.searchParams.get("ticket") || "";

    if (!slug) {
      return NextResponse.json({ error: "missing_slug" }, { status: 400 });
    }

    const ticketNumber = Number(ticketParam);
    if (!ticketNumber || Number.isNaN(ticketNumber)) {
      return NextResponse.json({ error: "invalid_ticket" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("contacts")
      .select("full_name, phone, seats, notes")
      .eq("counter_slug", slug)
      .eq("ticket_number", ticketNumber)
      .maybeSingle();

    if (error) {
      console.error("ticket_info_query_failed", error);
      return NextResponse.json({ error: "ticket_info_error" }, { status: 500 });
    }

    return NextResponse.json({
      contact: data
        ? {
            full_name: data.full_name,
            phone: data.phone,
            seats: data.seats,
            notes: data.notes,
          }
        : null,
    });
  } catch (e: any) {
    console.error("ticket_info_unhandled", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 },
    );
  }
}
