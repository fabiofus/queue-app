import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { kv } from '@/lib/kv';
import { supabaseAdmin } from '@/lib/supabase';

function ipHash(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0,32);
}

export async function POST(req: NextRequest) {
  try {
    const { counterSlug, customer, confirmSecondWithin10m } = await req.json();

    if (!counterSlug) {
      return NextResponse.json({ error: 'counterSlug_required' }, { status: 400 });
    }

    const { data: counter, error: cErr } = await supabaseAdmin
      .from('counters')
      .select('id, store_id, last_issued_number, last_called_number')
      .eq('slug', counterSlug)
      .single();
    if (cErr || !counter) {
      return NextResponse.json({ error: 'counter_not_found' }, { status: 404 });
    }

    const hash = ipHash(req);
    const guardKey = `ticket_guard:${counterSlug}:${hash}`;
    const recent = await kv.get<number>(guardKey);
    if (recent && !confirmSecondWithin10m) {
      return NextResponse.json({
        requiresConfirmation: true,
        message: 'Hai già preso un ticket per questo reparto negli ultimi 10 minuti. Confermi di volerne prendere un altro?'
      }, { status: 409 });
    }

    let customer_id: string | null = null;
    if (customer?.full_name || customer?.phone) {
      if (customer?.phone) {
        const { data: existing } = await supabaseAdmin
          .from('customers')
          .select('id')
          .eq('store_id', counter.store_id)
          .eq('phone', customer.phone)
          .maybeSingle();
        if (existing) {
          customer_id = existing.id;
        } else {
          const { data: inserted, error } = await supabaseAdmin
            .from('customers')
            .insert({ store_id: counter.store_id, full_name: customer.full_name ?? null, phone: customer.phone })
            .select('id')
            .single();
          if (error) throw error;
          customer_id = inserted.id;
        }
      } else {
        const { data: inserted, error } = await supabaseAdmin
          .from('customers')
          .insert({ store_id: counter.store_id, full_name: customer.full_name ?? null })
          .select('id')
          .single();
        if (error) throw error;
        customer_id = inserted.id;
      }
    }

    const { data: updatedCounter, error: rpcErr } = await supabaseAdmin.rpc('issue_ticket', { p_slug: counterSlug });
    if (rpcErr || !updatedCounter) {
      return NextResponse.json({ error: 'issue_failed' }, { status: 500 });
    }

    const ticketNumber = updatedCounter.last_issued_number;

    const { error: tErr } = await supabaseAdmin.from('tickets').insert({
      counter_id: updatedCounter.id,
      number: ticketNumber,
      status: 'waiting',
      customer_id,
      ip_hash: hash
    });
    if (tErr) {
      return NextResponse.json({ error: 'ticket_insert_failed' }, { status: 500 });
    }

    await kv.set(guardKey, Date.now(), { ex: 600 });

    const waiting_ahead = ticketNumber - updatedCounter.last_called_number - 1;
    return NextResponse.json({
      ticket_number: ticketNumber,
      last_called_number: updatedCounter.last_called_number,
      waiting_ahead
    });
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
