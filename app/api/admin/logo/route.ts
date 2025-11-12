import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { assertAdmin } from '@/lib/adminGuard';

export async function POST(req: NextRequest) {
  try {
    assertAdmin(req.headers);
    const { storeId, logoUrl } = await req.json();
    if (!storeId || !logoUrl) return NextResponse.json({ error: 'missing_params' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('stores')
      .update({ logo_url: logoUrl })
      .eq('id', storeId);
    if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e:any) {
    const status = e?.status ?? 500;
    return NextResponse.json({ error: e?.message ?? 'server_error' }, { status });
  }
}
