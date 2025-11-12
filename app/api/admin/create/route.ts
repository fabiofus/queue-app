import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { assertAdmin } from '@/lib/adminGuard';

export async function POST(req: NextRequest) {
  try {
    assertAdmin(req.headers);
    const { storeName, storeSlug, counterName, counterSlug } = await req.json();

    if (!storeName || !storeSlug || !counterName || !counterSlug) {
      return NextResponse.json({ error: 'missing_params' }, { status: 400 });
    }

    // upsert store by slug
    let storeId: string;
    {
      const { data: existing } = await supabaseAdmin
        .from('stores')
        .select('id')
        .eq('slug', storeSlug)
        .maybeSingle();
      if (existing) {
        storeId = existing.id;
      } else {
        const { data, error } = await supabaseAdmin
          .from('stores')
          .insert({ name: storeName, slug: storeSlug })
          .select('id')
          .single();
        if (error) return NextResponse.json({ error: 'store_create_failed' }, { status: 500 });
        storeId = data.id;
      }
    }

    // upsert counter by slug
    let counter: any;
    {
      const { data: existing } = await supabaseAdmin
        .from('counters')
        .select('id,name,slug,is_active,last_issued_number,last_called_number')
        .eq('slug', counterSlug)
        .maybeSingle();
      if (existing) {
        counter = existing;
      } else {
        const { data, error } = await supabaseAdmin
          .from('counters')
          .insert({ store_id: storeId, name: counterName, slug: counterSlug })
          .select('id,name,slug,is_active,last_issued_number,last_called_number')
          .single();
        if (error) return NextResponse.json({ error: 'counter_create_failed' }, { status: 500 });
        counter = data;
      }
    }

    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('id,name,slug,logo_url')
      .eq('id', storeId)
      .single();

    return NextResponse.json({ store, counter });
  } catch (e:any) {
    const status = e?.status ?? 500;
    return NextResponse.json({ error: e?.message ?? 'server_error' }, { status });
  }
}
