import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { assertAdmin } from "@/lib/adminGuard";

export const runtime = "nodejs";

type Body = {
  slug?: string;
  counterSlug?: string;
};

export async function POST(req: NextRequest) {
  try {
    // controlla x-admin-token
    assertAdmin(req.headers);

    const body = (await req.json().catch(() => null)) as Body | null;
    const slug = body?.slug || body?.counterSlug;

    if (!slug) {
      return NextResponse.json({ error: "missing_slug" }, { status: 400 });
    }

    const { data: counter, error } = await supabaseAdmin
      .from("counters")
      .select("id,slug,last_issued_number,last_called_number,is_active")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !counter) {
      console.error("reset_counter_not_found", error);
      return NextResponse.json(
        { error: "counter_not_found" },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("counters")
      .update({
        last_issued_number: 0,
        last_called_number: 0,
        is_active: true,
      })
      .eq("id", counter.id);

    if (updateError) {
      console.error("reset_counter_update_failed", updateError);
      return NextResponse.json(
        { error: "counter_update_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("reset_counter_unhandled", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}

