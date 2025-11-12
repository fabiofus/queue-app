'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseBrowser';

type Store = { id: string; name: string; slug: string; logo_url?: string|null };
type Counter = { id: string; store_id: string; name: string; slug: string; is_active: boolean; last_issued_number: number; last_called_number: number };
type StoreWithCounters = Store & { counters: Counter[] };

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [counterName, setCounterName] = useState('');
  const [counterSlug, setCounterSlug] = useState('');
  const [stores, setStores] = useState<StoreWithCounters[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('ADMIN_TOKEN') || '';
    setAdminToken(t);
  }, []);
  useEffect(() => {
    if (adminToken) localStorage.setItem('ADMIN_TOKEN', adminToken);
  }, [adminToken]);

  async function loadList() {
    if (!adminToken) { alert('Inserisci Admin Token'); return; }
    const res = await fetch('/api/admin/list', { headers: { 'x-admin-token': adminToken }});
    if (!res.ok) { alert('Errore lista'); return; }
    const data = await res.json();
    setStores(data.stores || []);
  }

  async function createAll() {
    if (!adminToken) { alert('Token mancante'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/create', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ storeName, storeSlug, counterName, counterSlug })
      });
      const data = await res.json();
      if (!res.ok) { alert(data?.error || 'Errore creazione'); return; }
      await loadList();
    } finally {
      setLoading(false);
    }
  }

  async function uploadLogo(store: Store) {
    if (!adminToken) { alert('Token mancante'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const path = `${store.slug}-${Date.now()}-${file.name}`.replace(/\s+/g,'-');
      const { data: uploaded, error } = await supabaseClient.storage.from('logos').upload(path, file, { upsert: false });
      if (error) { alert('Upload fallito'); return; }
      const { data: pub } = supabaseClient.storage.from('logos').getPublicUrl(uploaded.path);
      const res = await fetch('/api/admin/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ storeId: store.id, logoUrl: pub.publicUrl })
      });
      if (!res.ok) { alert('Salvataggio URL fallito'); return; }
      await loadList();
    };
    input.click();
  }

  async function resetCounter(counter: Counter) {
    if (!adminToken) { alert('Token mancante'); return; }
    if (!confirm(`Azzerare contatore ${counter.name}?`)) return;
    const res = await fetch('/api/admin/counter/reset', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ counterSlug: counter.slug })
    });
    if (!res.ok) { alert('Reset fallito'); return; }
    await loadList();
  }

  async function downloadContacts(store: Store) {
    if (!adminToken) { alert('Token mancante'); return; }
    const res = await fetch(`/api/admin/contacts.csv?storeId=${store.id}`, {
      headers: { 'x-admin-token': adminToken }
    });
    if (!res.ok) { alert('Download fallito'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts-${store.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => { loadList().catch(()=>{}); }, [adminToken]);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>

      <div className="grid gap-3">
        <input
          placeholder="Admin Token"
          value={adminToken}
          onChange={e=>setAdminToken(e.target.value)}
          className="border rounded-xl p-3"
        />
      </div>

      <div className="grid gap-3 border rounded-2xl p-4">
        <h2 className="font-semibold">Crea Store + Reparto</h2>
        <input placeholder="Nome store" value={storeName} onChange={e=>setStoreName(e.target.value)} className="border rounded-xl p-3" />
        <input placeholder="Slug store" value={storeSlug} onChange={e=>setStoreSlug(e.target.value)} className="border rounded-xl p-3" />
        <input placeholder="Nome reparto" value={counterName} onChange={e=>setCounterName(e.target.value)} className="border rounded-xl p-3" />
        <input placeholder="Slug reparto" value={counterSlug} onChange={e=>setCounterSlug(e.target.value)} className="border rounded-xl p-3" />
        <button onClick={createAll} disabled={loading} className="bg-black text-white rounded-xl py-3 disabled:opacity-50">
          {loading ? '...' : 'Crea'}
        </button>
      </div>

      <div className="border rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Reparti attivi</h2>
          <button onClick={loadList} className="border rounded-xl px-3 py-2">Ricarica</button>
        </div>
        <div className="mt-4 space-y-6">
          {stores.map(store => (
            <div key={store.id} className="border rounded-xl p-3">
              <div className="flex items-center gap-3">
                {store.logo_url ? <img src={store.logo_url} alt="logo" className="h-10 w-10 object-contain" /> : <div className="h-10 w-10 bg-gray-200 rounded" />}
                <div className="font-medium">{store.name} <span className="text-gray-500">({store.slug})</span></div>
                <div className="ml-auto flex gap-2">
                  <button onClick={()=>uploadLogo(store)} className="border rounded-xl px-3 py-2">Carica logo</button>
                  <button onClick={()=>downloadContacts(store)} className="border rounded-xl px-3 py-2">Scarica contatti CSV</button>
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                {store.counters.map(c => (
                  <div key={c.id} className="flex items-center justify-between border rounded-xl p-2">
                    <div>
                      <div className="font-medium">{c.name} <span className="text-gray-500">({c.slug})</span></div>
                      <div className="text-sm text-gray-600">Emesso: {c.last_issued_number} • Chiamato: {c.last_called_number}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a className="underline text-blue-600" href={`/take?slug=${c.slug}`} target="_blank">Cliente</a>
                      <a className="underline text-blue-600" href={`/clerk?slug=${c.slug}`} target="_blank">Bancone</a>
                      <button onClick={()=>resetCounter(c)} className="bg-red-600 text-white rounded-xl px-3 py-2">Reset</button>
                    </div>
                  </div>
                ))}
                {store.counters.length === 0 && <div className="text-sm text-gray-500">Nessun reparto</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
