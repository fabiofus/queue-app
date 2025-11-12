import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type TicketBody = {
  counterSlug?: string;
  customer?: { full_name?: string | null; phone?: string | null };
  confirmSecondWithin10m?: boolean;
};

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) {
      return NextResponse.json(
        { error: "missing_counterSlug" },
        { status: 400 },
      );
    }

    const { data: counter, error } = await supabaseAdmin
      .from("counters")
      .select("id,slug,last_issued_number,last_called_number,is_active")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !counter) {
      console.error("counter_lookup_failed", error);
      return NextResponse.json(
        { error: "counter_not_found" },
        { status: 404 },
      );
    }

    const lastIssued = counter.last_issued_number ?? 0;
    const lastCalled = counter.last_called_number ?? 0;
    const waitingAhead = Math.max(0, lastIssued - lastCalled);

    return NextResponse.json({
      last_issued_number: lastIssued,
      last_called_number: lastCalled,
      waiting_ahead: waitingAhead,
    });
  } catch (e: any) {
    console.error("tickets_get_unhandled", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 },
    );
  }
}

// POST: prendi un nuovo numero + salva eventuale contatto
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as TicketBody | null;
    const counterSlug = body?.counterSlug;

    if (!counterSlug) {
      return NextResponse.json(
        { error: "missing_counterSlug" },
        { status: 400 },
      );
    }

    const customer = body?.customer;

    // troviamo il counter
    const { data: counter, error } = await supabaseAdmin
      .from("counters")
      .select("id,slug,last_issued_number,last_called_number,is_active")
      .eq("slug", counterSlug)
      .maybeSingle();

    if (error || !counter) {
      console.error("counter_lookup_failed", error);
      return NextResponse.json(
        { error: "counter_not_found" },
        { status: 404 },
      );
    }

    const lastIssued = counter.last_issued_number ?? 0;
    const lastCalled = counter.last_called_number ?? 0;

    // nuovo numero
    const ticketNumber = lastIssued + 1;

    // aggiorna il counter
    const { error: updateError } = await supabaseAdmin
      .from("counters")
      .update({
        last_issued_number: ticketNumber,
        is_active: true,
      })
      .eq("id", counter.id);

    if (updateError) {
      console.error("counter_update_failed", updateError);
      return NextResponse.json(
        { error: "counter_update_failed" },
        { status: 500 },
      );
    }

    // se ci sono dati cliente, salvali in contacts
    if (customer && (customer.full_name || customer.phone)) {
      const { error: insertError } = await supabaseAdmin
        .from("contacts")
        .insert({
          counter_slug: counterSlug,
          full_name: customer.full_name || null,
          phone: customer.phone || null,
        });

      if (insertError) {
        console.error("contacts_insert_failed", insertError);
        // non blocco il ticket se fallisce il salvataggio del contatto
      }
    }

    const waitingAhead = Math.max(0, ticketNumber - lastCalled - 1);

    return NextResponse.json(
      {
        ticket_number: ticketNumber,
        waiting_ahead: waitingAhead,
      },
      { status: 201 },
    );
  } catch (e: any) {
    console.error("tickets_post_unhandled", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 },
    );
  }
}

