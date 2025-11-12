import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { assertAdmin } from '@/lib/adminGuard';

export async function GET(req: NextRequest) {
  try {
    assertAdmin(req.headers);
    const storeId = new URL(req.url).searchParams.get('storeId');
    if (!storeId) return NextResponse.json({ error: 'storeId_required' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('created_at,full_name,phone')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: 'query_failed' }, { status: 500 });

    const lines = ['created_at,full_name,phone', ...(data ?? []).map(r =>
      [r.created_at, JSON.stringify(r.full_name ?? ''), JSON.stringify(r.phone ?? '')].join(',')
    )].join('\n');

    return new NextResponse(lines, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="contacts.csv"',
      }
    });
  } catch (e:any) {
    const status = e?.status ?? 500;
    return NextResponse.json({ error: e?.message ?? 'server_error' }, { status });
  }
}
