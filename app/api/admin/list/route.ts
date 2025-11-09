import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function assertAdmin(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || "";
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    throw new Error("Unauthorized");
  }
}

export async function GET(req: NextRequest) {
  try {
    assertAdmin(req);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data, error } = await supabase
      .from("counters")
      .select("id, name, slug, enabled, created_at, stores(name, slug)")
      .order("created_at", { ascending: false })
      .returns<any[]>();

    if (error) throw error;

    const origin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";

    const rows = (data || []).map((c: any) => ({
      id: c.id,
      store: c.stores?.name ?? "",
      storeSlug: c.stores?.slug ?? "",
      name: c.name,
      slug: c.slug,
      enabled: c.enabled,
      takeUrl: origin ? `${origin}/take?slug=${c.slug}` : `/take?slug=${c.slug}`,
      clerkUrl: origin ? `${origin}/clerk?slug=${c.slug}` : `/clerk?slug=${c.slug}`,
      created_at: c.created_at
    }));

    return NextResponse.json({ counters: rows });
  } catch (e: any) {
    const msg = e?.message || "Errore";
    const code = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

