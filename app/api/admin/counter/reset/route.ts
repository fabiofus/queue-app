import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { assertAdmin } from '@/lib/adminGuard';

export async function POST(req: NextRequest) {
  try {
    assertAdmin(req.headers);
    const { counterSlug } = await req.json();
    if (!counterSlug) return NextResponse.json({ error: 'counterSlug_required' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('counters')
      .update({ last_issued_number: 0, last_called_number: 0, last_reset_at: new Date().toISOString() })
      .eq('slug', counterSlug);

    if (error) return NextResponse.json({ error: 'reset_failed' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e:any) {
    const status = e?.status ?? 500;
    return NextResponse.json({ error: e?.message ?? 'server_error' }, { status });
  }
}
