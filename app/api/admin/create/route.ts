import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function assertAdmin(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || "";
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    throw new Error("Unauthorized");
  }
}

export async function POST(req: NextRequest) {
  try {
    assertAdmin(req);
    const { storeName, storeSlug, counterName, counterSlug } = await req.json();

    if (!storeName || !storeSlug || !counterName || !counterSlug) {
      return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // upsert store
    const { data: store, error: e1 } = await supabase
      .from("stores")
      .upsert({ name: storeName, slug: storeSlug }, { onConflict: "slug" })
      .select()
      .single();

    if (e1) throw e1;

    // crea counter (se esiste slug → errore)
    const { data: counter, error: e2 } = await supabase
      .from("counters")
      .insert({
        store_id: store.id,
        name: counterName,
        slug: counterSlug,
        enabled: true,
      })
      .select()
      .single();

    if (e2) throw e2;

    // URL da consegnare
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : ""; // solo per build; in runtime client mostrerà origin

    const takeUrl = base ? `${base}/take?slug=${counter.slug}` : `/take?slug=${counter.slug}`;
    const clerkUrl = base ? `${base}/clerk?slug=${counter.slug}` : `/clerk?slug=${counter.slug}`;

    return NextResponse.json({
      store: { id: store.id, name: store.name, slug: store.slug },
      counter: { id: counter.id, name: counter.name, slug: counter.slug },
      urls: { take: takeUrl, clerk: clerkUrl }
    });
  } catch (e: any) {
    const msg = e?.message || "Errore";
    const code = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

