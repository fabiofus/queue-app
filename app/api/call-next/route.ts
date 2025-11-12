
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Body = {
  slug?: string;
  counterSlug?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    const slug = body?.slug || body?.counterSlug;

    if (!slug) {
      return NextResponse.json({ error: "missing_slug" }, { status: 400 });
    }

    // prendo il counter
    const { data: counter, error } = await supabaseAdmin
      .from("counters")
      .select("id,slug,last_issued_number,last_called_number,is_active")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !counter) {
      console.error("call_next_counter_not_found", error);
      return NextResponse.json(
        { error: "counter_not_found" },
        { status: 404 }
      );
    }

    const lastIssued = counter.last_issued_number ?? 0;
    const lastCalled = counter.last_called_number ?? 0;

    // se non c'è nessuno da chiamare
    if (lastCalled >= lastIssued) {
      return NextResponse.json(
        {
          called_number: lastCalled,
          last_issued_number: lastIssued,
          waiting_ahead: 0,
          has_next: false,
        },
        { status: 200 }
      );
    }

    const newCalled = lastCalled + 1;

    const { error: updateError } = await supabaseAdmin
      .from("counters")
      .update({
        last_called_number: newCalled,
        is_active: true,
      })
      .eq("id", counter.id);

    if (updateError) {
      console.error("call_next_update_failed", updateError);
      return NextResponse.json(
        { error: "counter_update_failed" },
        { status: 500 }
      );
    }

    const waitingAhead = Math.max(0, lastIssued - newCalled);

    return NextResponse.json(
      {
        called_number: newCalled,
        last_issued_number: lastIssued,
        waiting_ahead: waitingAhead,
        has_next: newCalled < lastIssued,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("call_next_unhandled", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}

