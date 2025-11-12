
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { assertAdmin } from "@/lib/adminGuard";

export const runtime = "nodejs";

type Body = {
  storeName: string;
  storeSlug: string;
  counterName: string;
  counterSlug: string;
};

export async function POST(req: NextRequest) {
  try {
    // protezione admin
    assertAdmin(req.headers);

    const body = (await req.json()) as Partial<Body>;
    const { storeName, storeSlug, counterName, counterSlug } = body;

    if (!storeName || !storeSlug || !counterName || !counterSlug) {
      return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }

    // 1) upsert STORE by slug (solo colonne sicure: id,name,slug)
    let store: { id: string; name: string; slug: string } | null = null;

    {
      const { data: existing, error } = await supabaseAdmin
        .from("stores")
        .select("id,name,slug")
        .eq("slug", storeSlug)
        .maybeSingle();

      if (error) {
        console.error("store_select_failed", error);
        return NextResponse.json({ error: "store_select_failed" }, { status: 500 });
      }

      if (existing) {
        store = existing;
      } else {
        const { data, error: insertError } = await supabaseAdmin
          .from("stores")
          .insert({ name: storeName, slug: storeSlug })
          .select("id,name,slug")
          .single();

        if (insertError || !data) {
          console.error("store_create_failed", insertError);
          return NextResponse.json({ error: "store_create_failed" }, { status: 500 });
        }

        store = data;
      }
    }

    const storeId = store!.id;

    // 2) upsert COUNTER by slug (come prima, ma con colonne valide)
    let counter:
      | {
          id: string;
          name: string;
          slug: string;
          is_active: boolean | null;
          last_issued_number: number | null;
          last_called_number: number | null;
        }
      | null = null;

    {
      const { data: existing, error } = await supabaseAdmin
        .from("counters")
        .select("id,name,slug,is_active,last_issued_number,last_called_number")
        .eq("slug", counterSlug)
        .maybeSingle();

      if (error) {
        console.error("counter_select_failed", error);
        return NextResponse.json({ error: "counter_select_failed" }, { status: 500 });
      }

      if (existing) {
        counter = existing;
      } else {
        const { data, error: insertError } = await supabaseAdmin
          .from("counters")
          .insert({
            store_id: storeId,
            name: counterName,
            slug: counterSlug,
          })
          .select("id,name,slug,is_active,last_issued_number,last_called_number")
          .single();

        if (insertError || !data) {
          console.error("counter_create_failed", insertError);
          return NextResponse.json({ error: "counter_create_failed" }, { status: 500 });
        }

        counter = data;
      }
    }

    return NextResponse.json(
      {
        store,
        counter,
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("admin_create_unhandled", e);
    const status = e?.status ?? 500;
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status });
  }
}

