import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { assertAdmin } from "@/lib/adminGuard";

export const runtime = "nodejs";

type Body = {
  storeId?: string;
  active?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    assertAdmin(req.headers);

    const body = (await req.json().catch(() => null)) as Body | null;
    const storeId = body?.storeId;
    const active = body?.active;

    if (!storeId || typeof active !== "boolean") {
      return NextResponse.json(
        { error: "missing_params" },
        { status: 400 },
      );
    }

    // cambio stato a tutti i counters di quello store
    const { error: countersError } = await supabaseAdmin
      .from("counters")
      .update({ is_active: active })
      .eq("store_id", storeId);

    if (countersError) {
      console.error("store_status_counters_failed", countersError);
      return NextResponse.json(
        { error: "store_status_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, storeId, active }, { status: 200 });
  } catch (e: any) {
    console.error("store_status_unhandled", e);
    const status = e?.status ?? 500;
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status },
    );
  }
}

