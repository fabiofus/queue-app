import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { assertAdmin } from "@/lib/adminGuard";

export const runtime = "nodejs";

/**
 * GET /api/admin/contacts.csv?slug=macelleria-ilcortile&date=2025-11-12
 */
export async function GET(req: NextRequest) {
  try {
    assertAdmin(req.headers);

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug") || undefined;
    const date = searchParams.get("date") || undefined;

    if (!date) {
      return NextResponse.json(
        { error: "missing_date" },
        { status: 400 },
      );
    }

    // costruiamo range [date 00:00, date 23:59]
    const from = `${date}T00:00:00.000Z`;
    const to = `${date}T23:59:59.999Z`;

    let query = supabaseAdmin
      .from("contacts")
      .select("created_at,full_name,phone,counter_slug")
      .gte("created_at", from)
      .lte("created_at", to);

    if (slug) {
      query = query.eq("counter_slug", slug);
    }

    const { data, error } = await query;

    if (error) {
      console.error("contacts_fetch_failed", error);
      return NextResponse.json(
        { error: "contacts_fetch_failed" },
        { status: 500 },
      );
    }

    const lines = [
      "created_at,counter_slug,full_name,phone",
      ...(data ?? []).map(
        (r: any) =>
          `"${r.created_at}","${r.counter_slug}","${(r.full_name ?? "").replace(/"/g, '""')}","${(r.phone ?? "").replace(/"/g, '""')}"`,
      ),
    ];

    const csv = lines.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="contacts-${slug ?? "all"}-${date}.csv"`,
      },
    });
  } catch (e: any) {
    console.error("contacts_csv_unhandled", e);
    const status = e?.status ?? 500;
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status },
    );
  }
}

