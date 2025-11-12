import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { assertAdmin } from "@/lib/adminGuard";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertAdmin(req.headers);

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }

    // prima elimino i counter associati
    const { error: countersError } = await supabaseAdmin
      .from("counters")
      .delete()
      .eq("store_id", id);

    if (countersError) {
      console.error("store_delete_counters_failed", countersError);
      return NextResponse.json(
        { error: "store_delete_counters_failed" },
        { status: 500 },
      );
    }

    // poi elimino lo store
    const { error: storeError } = await supabaseAdmin
      .from("stores")
      .delete()
      .eq("id", id);

    if (storeError) {
      console.error("store_delete_failed", storeError);
      return NextResponse.json(
        { error: "store_delete_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    console.error("store_delete_unhandled", e);
    const status = e?.status ?? 500;
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status },
    );
  }
}

