import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { counterSlug } = await req.json();
    if (!counterSlug) return NextResponse.json({ error: "counterSlug mancante" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data, error } = await supabase.rpc("call_next", { p_counter_slug: counterSlug });
    if (error) throw error;

    return NextResponse.json({ next: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
