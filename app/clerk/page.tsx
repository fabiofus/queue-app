'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Merchant = {
  display_name?: string;
  theme?: Record<string, any>;
  copy?: Record<string, any>;
};

type Contact = {
  full_name: string | null;
  phone: string | null;
  seats: number | null;
  notes: string | null;
};

export default function ClerkPage() {
  return (
    <Suspense fallback={<div />}>
      <ClerkContent />
    </Suspense>
  );
}

function ClerkContent() {
  const params = useSearchParams();
  const slug = params.get('slug') || '';

  const [merchant, setMerchant] = useState<Merchant | null>(null);

  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState('');

  const [lastCalled, setLastCalled] = useState<number | null>(null);
  const [lastIssued, setLastIssued] = useState<number | null>(null);
  const [waitingAhead, setWaitingAhead] = useState<number | null>(null);

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);

  const [manualCreating, setManualCreating] = useState(false);
  const [lastManualTicket, setLastManualTicket] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    fetch(`/api/merchant?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        setMerchant(d?.merchant ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setMerchant(null);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    fetch('/api/clerk/session', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled) return;
        if (d?.ok && d?.slug === slug) setAuthed(true);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await fetch(`/api/tickets?slug=${encodeURIComponent(slug)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        setLastIssued(data.last_issued_number ?? 0);
        setLastCalled(data.last_called_number ?? 0);
        setWaitingAhead(
          data.waiting_ahead ??
            Math.max(
              0,
              (data.last_issued_number ?? 0) - (data.last_called_number ?? 0),
            ),
        );
      } catch {}
    })();
  }, [slug]);

  const title = (merchant?.copy?.clerk_title as string) || 'Bancone';
  const subtitle =
    (merchant?.copy?.clerk_subtitle as string) ||
    (merchant?.display_name
      ? `Locale: ${merchant.display_name}`
      : slug
      ? `Slug: ${slug}`
      : '');

  const login = useCallback(async () => {
    if (!slug) return alert('Slug mancante');
    if (!pin) return alert('Inserisci il PIN');
    setLoading(true);
    try {
      const res = await fetch('/api/clerk/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.error === 'invalid_pin'
            ? 'PIN errato'
            : data?.error === 'pin_not_set'
            ? 'PIN non impostato (contatta ENG)'
            : data?.error || 'Errore login';
        alert(msg);
        return;
      }
      setAuthed(true);
      setPin('');
    } finally {
      setLoading(false);
    }
  }, [slug, pin]);

  const callNext = useCallback(
    async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const res = await fetch('/api/clerk/call-next', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) setAuthed(false);
          alert(data?.error || 'Errore chiamando il prossimo numero.');
          return;
        }

        const called = data.called_number ?? null;
        const issued = data.last_issued_number ?? lastIssued ?? null;
        const wa = data.waiting_ahead ?? null;

        setLastCalled(called);
        setLastIssued(issued);
        setWaitingAhead(wa);

        if (called != null && called > 0) {
          const r2 = await fetch(
            `/api/clerk/ticket-info?slug=${encodeURIComponent(
              slug,
            )}&ticket=${encodeURIComponent(String(called))}`,
            { cache: 'no-store' },
          );
          const d2 = await r2.json().catch(() => ({}));
          setContact(d2?.contact ?? null);
        } else {
          setContact(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [slug, lastIssued],
  );

  const resetCounter = useCallback(
    async () => {
      if (!slug) return;
      const ok = confirm('Resetto il contatore a 0?');
      if (!ok) return;

      setLoading(true);
      try {
        const res = await fetch('/api/clerk/reset-counter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) setAuthed(false);
          alert(data?.error || 'Errore reset');
          return;
        }

        setLastCalled(0);
        setLastIssued(0);
        setWaitingAhead(0);
        setContact(null);
        setLastManualTicket(null);
        alert('Contatore resettato ✅');
      } finally {
        setLoading(false);
      }
    },
    [slug],
  );

  const sendNudge = useCallback(
    async () => {
      const current = lastCalled ?? 0;
      if (current <= 0) return alert('Nessun numero chiamato.');

      const defaultMsg =
        (merchant?.copy?.nudge_message as string) ||
        'Il tuo turno è arrivato: per favore presentati al bancone.';
      const msg = prompt('Messaggio sollecito:', defaultMsg);
      if (msg == null) return;

      setLoading(true);
      try {
        const res = await fetch('/api/clerk/nudge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, ticket_number: current, message: msg }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) setAuthed(false);
          alert(data?.error || 'Errore invio sollecito');
          return;
        }
        alert('Sollecito inviato ✅');
      } finally {
        setLoading(false);
      }
    },
    [slug, lastCalled, merchant],
  );

  const handleManualTicket = useCallback(
    async () => {
      if (!slug) return;

      setManualCreating(true);
      try {
        const res = await fetch('/api/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            counterSlug: slug,
            confirmSecondWithin10m: true,
            fromClerk: true,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(data?.error || 'Errore creando il numero per il cliente.');
          return;
        }

        const ticketNumber = data.ticket_number ?? null;
        setLastManualTicket(ticketNumber);

        const issued = data.last_issued_number ?? lastIssued ?? null;
        const wa = data.waiting_ahead ?? null;
        if (issued != null) setLastIssued(issued);
        if (wa != null) setWaitingAhead(wa);
      } finally {
        setManualCreating(false);
      }
    },
    [slug, lastIssued],
  );

  const waDisplay = useMemo(() => {
    return (
      waitingAhead ?? Math.max(0, (lastIssued ?? 0) - (lastCalled ?? 0))
    );
  }, [waitingAhead, lastIssued, lastCalled]);

  const phoneDigits = (contact?.phone || '').replace(/[^\d+]/g, '');
  const waLink = phoneDigits
    ? `https://wa.me/${phoneDigits.replace(/^\+/, '')}`
    : null;
  const telLink = phoneDigits ? `tel:${phoneDigits}` : null;

  const reportHref =
    slug !== ''
      ? `/api/clerk/contacts.csv?slug=${encodeURIComponent(slug)}`
      : '#';

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && (
          <div className="text-sm text-gray-600">{subtitle}</div>
        )}
      </div>

      {!slug && <div className="text-red-600">Slug mancante</div>}

      {!authed ? (
        <div className="space-y-3 border rounded-xl p-4">
          <div className="font-semibold">Accesso gestore</div>
          <input
            className="border rounded-xl p-3 w-full"
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
          />
          <button
            onClick={login}
            disabled={!slug || loading}
            className="bg-black text-white rounded-xl py-3 w-full disabled:opacity-50"
          >
            {loading ? '...' : 'Entra'}
          </button>
          <div className="text-xs text-gray-500">Powered by ENG</div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 border rounded-xl p-4">
            <div>
              Ultimo chiamato: <b>{lastCalled ?? '-'}</b>
            </div>
            <div>
              Ultimo emesso: <b>{lastIssued ?? '-'}</b>
            </div>
            <div>
              Persone in attesa: <b>{waDisplay}</b>
            </div>

            <button
              onClick={callNext}
              disabled={!slug || loading}
              className="bg-black text-white rounded-xl py-3 disabled:opacity-50"
            >
              {loading ? '...' : 'Chiama prossimo'}
            </button>

            <button
              onClick={handleManualTicket}
              disabled={!slug || manualCreating}
              className="bg-sky-600 text-white rounded-xl py-3 disabled:opacity-50"
            >
              {manualCreating
                ? 'Assegno numero...'
                : 'Prendi numero per cliente senza app'}
            </button>

            {lastManualTicket != null && (
              <div className="text-sm text-gray-700">
                Ultimo numero assegnato manualmente:{' '}
                <b>{lastManualTicket}</b>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-2">
              <button
                onClick={sendNudge}
                disabled={!slug || loading || (lastCalled ?? 0) <= 0}
                className="border rounded-xl py-3 px-4 disabled:opacity-50"
              >
                Sollecita cliente
              </button>

              <button
                onClick={resetCounter}
                disabled={!slug || loading}
                className="bg-red-600 text-white rounded-xl py-3 px-4 disabled:opacity-50"
              >
                Reset contatore
              </button>
            </div>

            {slug && (
              <a
                href={reportHref}
                target="_blank"
                className="border rounded-xl py-3 px-4 text-center text-sm mt-2"
              >
                Scarica report di oggi (CSV)
              </a>
            )}
          </div>

          <div className="border rounded-xl p-4">
            <div className="font-semibold mb-2">
              Dettagli cliente (se inseriti)
            </div>
            {contact ? (
              <div className="space-y-2 text-sm">
                <div>
                  Nome: <b>{contact.full_name || '—'}</b>
                </div>
                <div>
                  Telefono: <b>{contact.phone || '—'}</b>
                </div>
                <div>
                  Posti: <b>{contact.seats ?? '—'}</b>
                </div>
                <div>
                  Note: <b>{contact.notes || '—'}</b>
                </div>
                {(waLink || telLink) && (
                  <div className="flex gap-2 flex-wrap">
                    {waLink && (
                      <a
                        className="border rounded-xl px-3 py-2"
                        href={waLink}
                        target="_blank"
                      >
                        WhatsApp
                      </a>
                    )}
                    {telLink && (
                      <a
                        className="border rounded-xl px-3 py-2"
                        href={telLink}
                      >
                        Chiama
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                Nessun dato disponibile per questo numero.
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500">Powered by ENG</div>
        </div>
      )}
    </div>
  );
}
