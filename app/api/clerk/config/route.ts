import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const slug = url.searchParams.get("slug") || "";

    if (!slug) {
      return NextResponse.json({ error: "missing_slug" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("counters")
      .select("queue_mode")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      console.error("clerk_config_counter_not_found", error);
      return NextResponse.json(
        { error: "counter_not_found" },
        { status: 404 },
      );
    }

    const queueMode =
      data.queue_mode === "tables" ? "tables" : "single";

    return NextResponse.json({ queue_mode: queueMode });
  } catch (e: any) {
    console.error("clerk_config_unhandled", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 },
    );
  }
}

