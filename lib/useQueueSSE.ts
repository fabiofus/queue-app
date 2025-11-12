'use client';
import { useEffect, useRef, useState } from 'react';

type State = { last_called_number: number; last_issued_number: number };

export function useQueueSSE(slug: string | null, myTicket?: number | null) {
  const [state, setState] = useState<State | null>(null);
  const [nextSoon, setNextSoon] = useState(false);
  const [itsYou, setItsYou] = useState(false);
  const lastCalledRef = useRef<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    const es = new EventSource(`/api/stream?slug=${encodeURIComponent(slug)}`);
    es.addEventListener('state', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as State;
      setState(data);
      if (myTicket) {
        if (data.last_called_number === myTicket - 1 && lastCalledRef.current !== data.last_called_number) {
          setNextSoon(true);
          setItsYou(false);
        } else if (data.last_called_number === myTicket) {
          setItsYou(true);
          setNextSoon(false);
        }
      }
      lastCalledRef.current = data.last_called_number ?? null;
    });
    return () => es.close();
  }, [slug, myTicket]);

  return { state, nextSoon, itsYou, resetFlags: () => { setNextSoon(false); setItsYou(false); } };
}
