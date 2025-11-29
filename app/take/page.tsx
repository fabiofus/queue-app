
'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueueSSE } from '@/lib/useQueueSSE';

const COOLDOWN_MS = 10 * 60 * 1000;

function canTakeTicket() {
  if (typeof window === 'undefined') return true;

  const raw = window.localStorage.getItem('lastTakeAt');
  if (!raw) return true;

  const last = Number(raw);
  if (Number.isNaN(last)) return true;

  const diff = Date.now() - last;
  return diff >= COOLDOWN_MS;
}

function getRemainingMinutes() {
  if (typeof window === 'undefined') return 0;

  const raw = window.localStorage.getItem('lastTakeAt');
  if (!raw) return 0;

  const last = Number(raw);
  if (Number.isNaN(last)) return 0;

  const diff = Date.now() - last;
  const remainingMs = COOLDOWN_MS - diff;
  if (remainingMs <= 0) return 0;

  return Math.ceil(remainingMs / 60000);
}

function saveTakeNow() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('lastTakeAt', String(Date.now()));
}

function saveTicketNumber(slug: string | null, ticket: number | null) {
  if (typeof window === 'undefined') return;
  if (!slug) return;
  if (ticket == null) return;
  window.localStorage.setItem(`ticket:${slug}`, String(ticket));
}

function loadTicketNumber(slug: string | null): number | null {
  if (typeof window === 'undefined') return null;
  if (!slug) return null;
  const raw = window.localStorage.getItem(`ticket:${slug}`);
  if (!raw) return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  return n;
}

function clearTicketNumber(slug: string | null) {
  if (typeof window === 'undefined') return;
  if (!slug) return;
  window.localStorage.removeItem(`ticket:${slug}`);
}

export default function TakePage() {
  return (
    <Suspense fallback={<div />}>
      <TakeContent />
    </Suspense>
  );
}

function TakeContent() {
  const params = useSearchParams();
  const slug = params.get('slug');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [ticket, setTicket] = useState<number | null>(null);
  const [waitingAhead, setWaitingAhead] = useState<number | null>(null);
  const [lastCalled, setLastCalled] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [notifiedTwoBefore, setNotifiedTwoBefore] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { state, nextSoon, itsYou, resetFlags } = useQueueSSE(
    slug,
    ticket ?? null,
  );

  // recupera il ticket salvato se ricarichi / riapri la pagina
  useEffect(() => {
    if (!slug) return;
    const stored = loadTicketNumber(slug);
    if (stored != null) {
      setTicket(stored);
    }
  }, [slug]);

  // aggiorna lastCalled dallo stato SSE
  useEffect(() => {
    if (state) {
      setLastCalled(state.last_called_number);
    }
  }, [state]);

  // se il bancone ha già superato il tuo numero, libera il ticket
  useEffect(() => {
    if (!slug) return;
    if (ticket == null) return;
    if (lastCalled == null) return;

    // quando il numero chiamato è maggiore del tuo, consideriamo il ticket "consumato"
    if (lastCalled > ticket) {
      clearTicketNumber(slug);
      setTicket(null);
      setNotifiedTwoBefore(false);
    }
  }, [slug, ticket, lastCalled]);

  // notifica + suono quando mancano 2 numeri
  useEffect(() => {
    if (!ticket || lastCalled == null) return;
    if (notifiedTwoBefore) return;

    if (lastCalled === ticket - 2) {
      if (audioRef.current) {
        try {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        } catch {
          // ignora eventuali errori di autoplay
        }
      }
      alert('Tra due numeri tocca a te!');
      setNotifiedTwoBefore(true);
    }
  }, [ticket, lastCalled, notifiedTwoBefore]);

  async function takeTicket(confirmSecondWithin10m = false) {
    if (!slug) return;

    // BLOCCO: massimo 1 ticket attivo per questo reparto su questo dispositivo
    const existing = loadTicketNumber(slug);
    if (existing != null && !confirmSecondWithin10m) {
      setTicket(existing);
      alert(
        `Hai già un numero attivo per questo reparto: ${existing}. Mostra questo numero al banco.`,
      );
      return;
    }

    if (!confirmSecondWithin10m) {
      if (!canTakeTicket()) {
        const remaining = getRemainingMinutes();
        alert(
          remaining > 0
            ? `Hai già preso un numero da poco. Puoi prenderne un altro tra circa ${remaining} minuti.`
            : 'Hai già preso un numero da poco. Riprova tra qualche minuto.',
        );
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counterSlug: slug,
          customer:
            fullName || phone
              ? { full_name: fullName || null, phone: phone || null }
              : undefined,
          confirmSecondWithin10m,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        const ok = confirm(
          data?.message ||
            'Confermi di voler prendere un secondo ticket entro 10 minuti?',
        );
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
      saveTakeNow();
      saveTicketNumber(slug, data.ticket_number);
      setNotifiedTwoBefore(false);
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
          onChange={e => setFullName(e.target.value)}
          className="border rounded-xl p-3"
        />
        <input
          placeholder="Telefono (facoltativo)"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="border rounded-xl p-3"
        />
        <button
          onClick={() => takeTicket()}
          disabled={!slug || loading}
          className="bg-black text-white rounded-xl py-3 disabled:opacity-50"
        >
          {loading ? 'Attendi…' : 'Prendi numero'}
        </button>
      </div>

      {ticket && (
        <div className="space-y-2">
          <div className="text-lg">
            Il tuo numero: <b>{ticket}</b>
          </div>
          <div>
            Chiamato: <b>{lastCalled ?? '-'}</b>
          </div>
          <div>
            Persone davanti:{' '}
            <b>
              {waitingAhead ??
                Math.max(
                  0,
                  (state?.last_issued_number ?? 0) -
                    (state?.last_called_number ?? 0) -
                    1,
                )}
            </b>
          </div>
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

      <audio ref={audioRef} src="/notification.mp3" preload="auto" />
    </div>
  );
}

