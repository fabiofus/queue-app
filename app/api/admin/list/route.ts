import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { assertAdmin } from '@/lib/adminGuard';

export async function GET(req: NextRequest) {
  try {
    assertAdmin(req.headers);
    const { data: stores } = await supabaseAdmin
      .from('stores')
      .select('id,name,slug,logo_url')
      .order('created_at', { ascending: true });

    const { data: counters } = await supabaseAdmin
      .from('counters')
      .select('id,store_id,name,slug,is_active,last_issued_number,last_called_number')
      .order('created_at', { ascending: true });

    const grouped = (stores ?? []).map(s => ({
      ...s,
      counters: (counters ?? []).filter(c => c.store_id === s.id)
    }));

    return NextResponse.json({ stores: grouped });
  } catch (e:any) {
    const status = e?.status ?? 500;
    return NextResponse.json({ error: e?.message ?? 'server_error' }, { status });
  }
}
