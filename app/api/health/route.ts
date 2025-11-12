import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    // client ANON lato server (usa chiavi server, non NEXT_PUBLIC)
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // query minima per testare la connessione
    const { error } = await supabase.from("stores").select("id").limit(1);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "health_fail" },
      { status: 500 }
    );
  }
}
