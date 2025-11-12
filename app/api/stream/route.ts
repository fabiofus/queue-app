import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  if (!slug) {
    return new Response('slug required', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`event: ping\ndata: ok\n\n`));

      let lastState = '';
      const poll = async () => {
        try {
          const { data } = await supabaseAdmin
            .from('counters')
            .select('last_called_number,last_issued_number')
            .eq('slug', slug)
            .single();
          if (!data) return;
          const state = JSON.stringify(data);
          if (state !== lastState) {
            lastState = state;
            controller.enqueue(encoder.encode(`event: state\ndata: ${state}\n\n`));
          }
        } catch {}
      };

      await poll();
      const interval = setInterval(poll, 1500);
      const keepalive = setInterval(() => {
        controller.enqueue(encoder.encode(`event: ping\ndata: ok\n\n`));
      }, 15000);

      const abort = () => { clearInterval(interval); clearInterval(keepalive); controller.close(); };
      req.signal.addEventListener('abort', abort);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    }
  });
}
