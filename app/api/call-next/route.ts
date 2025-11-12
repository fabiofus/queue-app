import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { counterSlug } = await req.json();
    if (!counterSlug) return NextResponse.json({ error: 'counterSlug_required' }, { status: 400 });

    const { data: c } = await supabaseAdmin
      .from('counters')
      .select('id, last_called_number, last_issued_number')
      .eq('slug', counterSlug)
      .single();

    if (!c) return NextResponse.json({ error: 'counter_not_found' }, { status: 404 });

    const nextNumber = c.last_called_number + 1;
    if (nextNumber > c.last_issued_number) {
      return NextResponse.json({ next: null, waiting_left: 0 });
    }

    const { error: up1 } = await supabaseAdmin
      .from('tickets')
      .update({ status: 'called', called_at: new Date().toISOString() })
      .eq('counter_id', c.id)
      .eq('number', nextNumber);
    if (up1) return NextResponse.json({ error: 'update_ticket_failed' }, { status: 500 });

    const { error: up2 } = await supabaseAdmin
      .from('counters')
      .update({ last_called_number: nextNumber })
      .eq('id', c.id);
    if (up2) return NextResponse.json({ error: 'update_counter_failed' }, { status: 500 });

    return NextResponse.json({
      next: { ticket_number: nextNumber },
      waiting_left: c.last_issued_number - nextNumber
    });
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
