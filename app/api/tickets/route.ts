import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

export const runtime = "nodejs";

const COOLDOWN_MS = 10 * 60 * 1000;
const DEVICE_COOKIE = "eng_device_id";

type TicketBody = {
  counterSlug?: string;
  customer?: { full_name?: string | null; phone?: string | null };
  confirmSecondWithin10m?: boolean;
};

function nowIso() {
  return new Date().toISOString();
}

function msDiff(aIso: string, bIso: string) {
  return Date.parse(aIso) - Date.parse(bIso);
}

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) {
      return NextResponse.json({ error: "missing_counterSlug" }, { status: 400 });
    }

    const { data: counter, error } = await supabaseAdmin
      .from("counters")
      .select("id,slug,last_issued_number,last_called_number,is_active")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !counter) {
      console.error("counter_lookup_failed", error);
      return NextResponse.json({ error: "counter_not_found" }, { status: 404 });
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
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as TicketBody | null;
    const counterSlug = (body?.counterSlug || "").trim();
    const confirmSecondWithin10m = !!body?.confirmSecondWithin10m;
    const customer = body?.customer;

    if (!counterSlug) {
      return NextResponse.json({ error: "missing_counterSlug" }, { status: 400 });
    }

    // device id (cookie httpOnly)
    const existingDeviceId = req.cookies.get(DEVICE_COOKIE)?.value;
    const deviceId = existingDeviceId || crypto.randomUUID();

    // 1) trova counter
    const { data: counter, error: counterErr } = await supabaseAdmin
      .from("counters")
      .select("id,slug,last_issued_number,last_called_number,is_active")
      .eq("slug", counterSlug)
      .maybeSingle();

    if (counterErr || !counter) {
      console.error("counter_lookup_failed", counterErr);
      const res = NextResponse.json({ error: "counter_not_found" }, { status: 404 });
      // set cookie se mancava
      if (!existingDeviceId) {
        res.cookies.set(DEVICE_COOKIE, deviceId, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
        });
      }
      return res;
    }

    const lastIssued = counter.last_issued_number ?? 0;
    const lastCalled = counter.last_called_number ?? 0;

    // 2) regole anti-abuso: 1 ticket attivo + cooldown (server-side)
    const { data: dev } = await supabaseAdmin
      .from("take_devices")
      .select("last_take_at, active_ticket_number")
      .eq("counter_slug", counterSlug)
      .eq("device_id", deviceId)
      .maybeSingle();

    if (!confirmSecondWithin10m && dev?.active_ticket_number) {
      const active = dev.active_ticket_number;
      // se non è ancora stato chiamato, blocca
      if ((counter.last_called_number ?? 0) < active) {
        const res = NextResponse.json(
          { error: "active_ticket_exists", ticket_number: active, message: `Hai già un numero attivo: ${active}.` },
          { status: 409 }
        );
        if (!existingDeviceId) {
          res.cookies.set(DEVICE_COOKIE, deviceId, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
          });
        }
        return res;
      }
      // altrimenti è “consumato”: lo consideriamo libero (non serve pulire subito)
    }

    if (!confirmSecondWithin10m && dev?.last_take_at) {
      const diff = Date.now() - Date.parse(dev.last_take_at);
      if (diff < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - diff;
        const remainingMin = Math.ceil(remainingMs / 60000);
        const res = NextResponse.json(
          {
            error: "cooldown",
            remaining_minutes: remainingMin,
            message: `Hai già preso un numero da poco. Puoi prenderne un altro tra circa ${remainingMin} minuti.`,
          },
          { status: 409 }
        );
        if (!existingDeviceId) {
          res.cookies.set(DEVICE_COOKIE, deviceId, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
          });
        }
        return res;
      }
    }

    // 3) assegna nuovo numero (nota: non è transactional; per carichi alti conviene RPC)
    const ticketNumber = lastIssued + 1;

    const { error: updateError } = await supabaseAdmin
      .from("counters")
      .update({ last_issued_number: ticketNumber, is_active: true })
      .eq("id", counter.id);

    if (updateError) {
      console.error("counter_update_failed", updateError);
      const res = NextResponse.json({ error: "counter_update_failed" }, { status: 500 });
      if (!existingDeviceId) {
        res.cookies.set(DEVICE_COOKIE, deviceId, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
        });
      }
      return res;
    }

    // 4) salva contatto agganciato al ticket_number
    if (customer && (customer.full_name || customer.phone)) {
      const { error: insertError } = await supabaseAdmin.from("contacts").insert({
        counter_slug: counterSlug,
        ticket_number: ticketNumber,
        full_name: customer.full_name || null,
        phone: customer.phone || null,
      });
      if (insertError) console.error("contacts_insert_failed", insertError);
    }

    // 5) aggiorna device state (cooldown + ticket attivo)
    await supabaseAdmin.from("take_devices").upsert({
      counter_slug: counterSlug,
      device_id: deviceId,
      last_take_at: nowIso(),
      active_ticket_number: ticketNumber,
    });

    const waitingAhead = Math.max(0, ticketNumber - lastCalled - 1);

    const res = NextResponse.json(
      { ticket_number: ticketNumber, waiting_ahead: waitingAhead },
      { status: 201 }
    );

    if (!existingDeviceId) {
      res.cookies.set(DEVICE_COOKIE, deviceId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return res;
  } catch (e: any) {
    console.error("tickets_post_unhandled", e);
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
