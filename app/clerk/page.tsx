'use client';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueueSSE } from '@/lib/useQueueSSE';

export default function ClerkPage() {
  const params = useSearchParams();
  const slug = params.get('slug');

  const [adminToken, setAdminToken] = useState<string>('');
  const [lastCalled, setLastCalled] = useState<number | null>(null);
  const [lastIssued, setLastIssued] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('ADMIN_TOKEN') || '';
    setAdminToken(t);
  }, []);
  useEffect(() => {
    if (adminToken) localStorage.setItem('ADMIN_TOKEN', adminToken);
  }, [adminToken]);

  const { state } = useQueueSSE(slug);
  useMemo(() => {
    if (state) {
      setLastCalled(state.last_called_number);
      setLastIssued(state.last_issued_number);
    }
  }, [state]);

  async function callNext() {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await fetch('/api/call-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counterSlug: slug })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || 'Errore');
      }
    } finally {
      setLoading(false);
    }
  }

  async function resetCounter() {
    if (!slug) return;
    if (!adminToken) {
      alert('Inserisci Admin Token');
      return;
    }
    const ok = confirm('Azzerare contatore?');
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/counter/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ counterSlug: slug })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || 'Errore reset');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Bancone</h1>
      {!slug && <div className="text-red-600">Slug mancante</div>}

      <div className="grid gap-3">
        <div>Ultimo chiamato: <b>{lastCalled ?? '-'}</b></div>
        <div>Ultimo emesso: <b>{lastIssued ?? '-'}</b></div>
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
          onChange={e=>setAdminToken(e.target.value)}
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
