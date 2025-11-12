'use client';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueueSSE } from '@/lib/useQueueSSE';

export default function TakePage() {
  const params = useSearchParams();
  const slug = params.get('slug');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [ticket, setTicket] = useState<number | null>(null);
  const [waitingAhead, setWaitingAhead] = useState<number | null>(null);
  const [lastCalled, setLastCalled] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const { state, nextSoon, itsYou, resetFlags } = useQueueSSE(slug, ticket ?? null);
  useMemo(() => {
    if (state) {
      setLastCalled(state.last_called_number);
    }
  }, [state]);

  async function takeTicket(confirmSecondWithin10m = false) {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counterSlug: slug,
          customer: (fullName || phone) ? { full_name: fullName || null, phone: phone || null } : undefined,
          confirmSecondWithin10m
        })
      });
      if (res.status === 409) {
        const data = await res.json();
        const ok = confirm(data?.message || 'Confermi di voler prendere un secondo ticket entro 10 minuti?');
        if (ok) return takeTicket(true);
        return;
      }
      if (!res.ok) {
        alert('Errore, riprova.');
        return;
      }
      const data = await res.json();
      setTicket(data.ticket_number);
      setWaitingAhead(data.waiting_ahead);
      resetFlags();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Prendi il tuo numero</h1>
      {!slug && <div className="text-red-600">Slug mancante</div>}

      <div className="grid gap-3">
        <input
          placeholder="Nome e cognome (facoltativo)"
          value={fullName}
          onChange={e=>setFullName(e.target.value)}
          className="border rounded-xl p-3"
        />
        <input
          placeholder="Telefono (facoltativo)"
          value={phone}
          onChange={e=>setPhone(e.target.value)}
          className="border rounded-xl p-3"
        />
        <button
          onClick={()=>takeTicket()}
          disabled={!slug || loading}
          className="bg-black text-white rounded-xl py-3 disabled:opacity-50"
        >
          {loading ? 'Attendi…' : 'Prendi numero'}
        </button>
      </div>

      {ticket && (
        <div className="space-y-2">
          <div className="text-lg">Il tuo numero: <b>{ticket}</b></div>
          <div>Chiamato: <b>{lastCalled ?? '-'}</b></div>
          <div>Persone davanti: <b>{waitingAhead ?? Math.max(0, (state?.last_issued_number ?? 0) - (state?.last_called_number ?? 0) - 1)}</b></div>
        </div>
      )}

      {nextSoon && (
        <div className="p-3 rounded-xl bg-yellow-100 border border-yellow-300">
          Il tuo turno è il prossimo.
        </div>
      )}
      {itsYou && (
        <div className="p-3 rounded-xl bg-green-100 border border-green-300">
          È il tuo turno.
        </div>
      )}
    </div>
  );
}
