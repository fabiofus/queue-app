import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { assertAdmin } from "@/lib/adminGuard";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // protezione admin
    assertAdmin(req.headers);

    // prendi tutti gli store
    const { data: stores, error: storesError } = await supabaseAdmin
      .from("stores")
      .select("id,name,slug")
      .order("name", { ascending: true });

    if (storesError) {
      console.error("admin_list_stores_failed", storesError);
      return NextResponse.json(
        { error: "stores_fetch_failed" },
        { status: 500 }
      );
    }

    // prendi tutti i counter
    const { data: counters, error: countersError } = await supabaseAdmin
      .from("counters")
      .select("id,name,slug,is_active,store_id,last_issued_number,last_called_number")
      .order("name", { ascending: true });

    if (countersError) {
      console.error("admin_list_counters_failed", countersError);
      return NextResponse.json(
        { error: "counters_fetch_failed" },
        { status: 500 }
      );
    }

    // join store + counters
    const grouped = (stores ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      counters: (counters ?? []).filter((c) => c.store_id === s.id),
    }));

    return NextResponse.json({ stores: grouped }, { status: 200 });
  } catch (e: any) {
    console.error("admin_list_unhandled", e);
    const status = e?.status ?? 500;
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status }
    );
  }
}

