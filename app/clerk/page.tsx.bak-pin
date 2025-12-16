'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

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

  const [lastCalled, setLastCalled] = useState<number | null>(null);
  const [lastIssued, setLastIssued] = useState<number | null>(null);
  const [waitingAhead, setWaitingAhead] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminToken, setAdminToken] = useState('');

  // carica stato iniziale dal GET /api/tickets
  useEffect(() => {
    if (!slug) return;
    let abort = false;

    (async () => {
      try {
        const res = await fetch(`/api/tickets?slug=${encodeURIComponent(slug)}`, {
          method: 'GET',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (abort) return;

        const li = data.last_issued_number ?? 0;
        const lc = data.last_called_number ?? 0;
        const wa = data.waiting_ahead ?? Math.max(0, li - lc);

        setLastIssued(li);
        setLastCalled(lc);
        setWaitingAhead(wa);
      } catch {
        // ignora per ora
      }
    })();

    return () => {
      abort = true;
    };
  }, [slug]);

  const callNext = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await fetch('/api/call-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) {
        alert('Errore chiamando il prossimo numero.');
        return;
      }
      const data = await res.json();
      const called = data.called_number ?? null;
      const lastIssuedNew = data.last_issued_number ?? lastIssued ?? null;
      const wa = data.waiting_ahead ?? null;

      setLastCalled(called);
      setLastIssued(lastIssuedNew);
      setWaitingAhead(wa);
    } finally {
      setLoading(false);
    }
  }, [slug, lastIssued]);

  const resetCounter = useCallback(async () => {
    if (!slug || !adminToken) {
      alert('Serve slug e admin token.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/counter/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) {
        alert('Errore nel reset del contatore.');
        return;
      }
      setLastCalled(0);
      setLastIssued(0);
      setWaitingAhead(0);
    } finally {
      setLoading(false);
    }
  }, [slug, adminToken]);

  const waDisplay =
    waitingAhead ??
    Math.max(
      0,
      (lastIssued ?? 0) - (lastCalled ?? 0),
    );

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Bancone</h1>
      {!slug && <div className="text-red-600">Slug mancante</div>}

      <div className="grid gap-3">
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
      </div>

      <div className="border-t pt-4 space-y-3">
        <input
          placeholder="Admin Token"
          value={adminToken}
          onChange={e => setAdminToken(e.target.value)}
          className="border rounded-xl p-3 w-full"
        />
        <button
          onClick={resetCounter}
          disabled={!slug || loading}
          className="bg-red-600 text-white rounded-xl py-3 disabled:opacity-50"
        >
          {loading ? '...' : 'Reset contatore'}
        </button>
      </div>
    </div>
  );
}

