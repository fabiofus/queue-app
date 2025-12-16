'use client';

import { useState } from 'react';

type Counter = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean | null;
  last_issued_number: number | null;
  last_called_number: number | null;
};

type Store = {
  id: string;
  name: string;
  slug: string;
  counters: Counter[];
};

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // campi per creazione nuovo store/reparto
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreSlug, setNewStoreSlug] = useState('');
  const [newCounterName, setNewCounterName] = useState('');
  const [newCounterSlug, setNewCounterSlug] = useState('');

  async function loadStores() {
    if (!adminToken) {
      alert('Inserisci il token admin');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/list', {
        headers: {
          'x-admin-token': adminToken,
        },
      });
      if (!res.ok) {
        setError('Errore nel caricamento dei reparti');
        return;
      }
      const data = await res.json();
      setStores(data.stores ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function createReparto() {
    if (!adminToken) {
      alert('Inserisci il token admin');
      return;
    }
    if (!newStoreName || !newStoreSlug || !newCounterName || !newCounterSlug) {
      alert('Compila tutti i campi per creare il reparto');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({
          storeName: newStoreName,
          storeSlug: newStoreSlug,
          counterName: newCounterName,
          counterSlug: newCounterSlug,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert('Errore nella creazione del reparto: ' + (data.error || res.status));
        return;
      }
      // pulisco form e ricarico lista
      setNewStoreName('');
      setNewStoreSlug('');
      setNewCounterName('');
      setNewCounterSlug('');
      await loadStores();
    } finally {
      setLoading(false);
    }
  }

  async function downloadReportToday(counter: Counter) {
    if (!adminToken) {
      alert('Inserisci il token admin');
      return;
    }
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    try {
      const res = await fetch(
        `/api/admin/contacts.csv?slug=${encodeURIComponent(
          counter.slug,
        )}&date=${today}`,
        {
          headers: {
            'x-admin-token': adminToken,
          },
        },
      );
      if (!res.ok) {
        alert('Errore nel generare il report');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${counter.slug}-${today}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Errore imprevisto nel download del report');
    }
  }

  async function toggleStore(store: Store, active: boolean) {
    if (!adminToken) {
      alert('Inserisci il token admin');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/store/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({ storeId: store.id, active }),
      });
      if (!res.ok) {
        alert('Errore nel cambiare stato del supermercato');
        return;
      }
      setStores(prev =>
        prev.map(s =>
          s.id === store.id
            ? {
                ...s,
                counters: s.counters.map(c => ({
                  ...c,
                  is_active: active,
                })),
              }
            : s,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteStore(store: Store) {
    if (!adminToken) {
      alert('Inserisci il token admin');
      return;
    }
    const ok = confirm(
      `Sei sicuro di voler eliminare il supermercato "${store.name}" e tutti i suoi reparti?`,
    );
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/store/${store.id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': adminToken,
        },
      });
      if (!res.ok) {
        alert("Errore nell'eliminazione del supermercato");
        return;
      }
      setStores(prev => prev.filter(s => s.id !== store.id));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-2">Admin</h1>

      {/* token + load */}
      <div className="space-y-3 border-b pb-4">
        <input
          type="password"
          placeholder="Admin token"
          value={adminToken}
          onChange={e => setAdminToken(e.target.value)}
          className="border rounded-xl p-3 w-full"
        />
        <button
          onClick={loadStores}
          disabled={loading || !adminToken}
          className="bg-black text-white rounded-xl py-3 px-4 disabled:opacity-50"
        >
          {loading ? 'Carico…' : 'Carica reparti'}
        </button>
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </div>

      {/* form creazione nuovo reparto */}
      <div className="space-y-3 border-b pb-4">
        <h2 className="font-semibold">Crea nuovo supermercato/reparto</h2>
        <input
          placeholder="Nome supermercato"
          value={newStoreName}
          onChange={e => setNewStoreName(e.target.value)}
          className="border rounded-xl p-3 w-full"
        />
        <input
          placeholder="Slug supermercato (es. il-cortile)"
          value={newStoreSlug}
          onChange={e => setNewStoreSlug(e.target.value)}
          className="border rounded-xl p-3 w-full"
        />
        <input
          placeholder="Nome reparto (es. Reparto Salumeria)"
          value={newCounterName}
          onChange={e => setNewCounterName(e.target.value)}
          className="border rounded-xl p-3 w-full"
        />
        <input
          placeholder="Slug reparto (es. salumeria-ilcortile)"
          value={newCounterSlug}
          onChange={e => setNewCounterSlug(e.target.value)}
          className="border rounded-xl p-3 w-full"
        />
        <button
          onClick={createReparto}
          disabled={loading || !adminToken}
          className="bg-green-600 text-white rounded-xl py-3 px-4 disabled:opacity-50"
        >
          {loading ? 'Creo…' : 'Crea reparto'}
        </button>
      </div>

      {/* lista supermercati / reparti */}
      <div className="space-y-4">
        {stores.length === 0 && (
          <div className="text-sm text-gray-600">
            Nessun supermercato trovato. Crea un negozio via form qui sopra o via API /admin/create.
          </div>
        )}

        {stores.map(store => {
          const hasActive = store.counters.some(c => c.is_active);
          return (
            <div
              key={store.id}
              className="border rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{store.name}</div>
                  <div className="text-xs text-gray-500">
                    slug: {store.slug}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleStore(store, !hasActive)}
                    disabled={loading}
                    className="text-sm rounded-xl px-3 py-1 border"
                  >
                    {hasActive ? 'Sospendi' : 'Riattiva'}
                  </button>
                  <button
                    onClick={() => deleteStore(store)}
                    disabled={loading}
                    className="text-sm rounded-xl px-3 py-1 bg-red-600 text-white"
                  >
                    Elimina
                  </button>
                </div>
              </div>

              {store.counters.length > 0 && (
                <div className="pl-2 border-l space-y-2 mt-2">
                  {store.counters.map(c => (
                    <div
                      key={c.id}
                      className="flex flex-col gap-1 text-sm border-b pb-2 last:border-b-0"
                    >
                      <div className="flex justify-between">
                        <div>
                          {c.name}{' '}
                          <span className="text-xs text-gray-500">
                            (slug: {c.slug})
                          </span>
                        </div>
                        <div className="text-xs">
                          {c.is_active ? 'ATTIVO' : 'SOSPESO'} · emesso:{' '}
                          {c.last_issued_number ?? 0} · chiamato:{' '}
                          {c.last_called_number ?? 0}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              `/qr?mode=take&slug=${encodeURIComponent(
                                c.slug,
                              )}`,
                              '_blank',
                            )
                          }
                          className="text-xs rounded-xl px-3 py-1 border"
                        >
                          QR Ticket
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              `/qr?mode=clerk&slug=${encodeURIComponent(
                                c.slug,
                              )}`,
                              '_blank',
                            )
                          }
                          className="text-xs rounded-xl px-3 py-1 border"
                        >
                          QR Bancone
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadReportToday(c)}
                          className="text-xs rounded-xl px-3 py-1 border bg-blue-600 text-white"
                        >
                          Report oggi (CSV)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
