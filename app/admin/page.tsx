"use client";
import { useEffect, useState } from "react";

type Row = {
  id: string;
  store: string;
  storeSlug: string;
  name: string;
  slug: string;
  enabled: boolean;
  takeUrl: string;
  clerkUrl: string;
  created_at: string;
};

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [storeName, setStoreName] = useState("Supermercato Il Cortile");
  const [storeSlug, setStoreSlug] = useState("il-cortile");
  const [counterName, setCounterName] = useState("Reparto macelleria");
  const [counterSlug, setCounterSlug] = useState("macelleria-ilcortile");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("adminToken") || "";
    setToken(t);
  }, []);

  function saveToken(v: string) {
    setToken(v);
    localStorage.setItem("adminToken", v);
  }

  async function loadList() {
    if (!token) return;
    setLoadingList(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/list", {
        headers: { "x-admin-token": token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Errore lista");
      setRows(data.counters || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadList();
  }, [token]);

  async function createCounter() {
    if (!token) { setErr("Inserisci Admin Token"); return; }
    setCreating(true); setErr(null); setCreated(null);
    try {
      const res = await fetch("/api/admin/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token
        },
        body: JSON.stringify({ storeName, storeSlug, counterName, counterSlug })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Errore creazione");
      setCreated(data);
      await loadList();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6 font-[system-ui]">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <div className="mt-4 rounded-2xl border border-zinc-200 p-4">
        <label className="block text-sm text-zinc-600 mb-1">Admin Token</label>
        <input
          value={token}
          onChange={e => saveToken(e.target.value)}
          placeholder="incolla il token"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 rounded-2xl border border-zinc-200 p-4">
        <div>
          <label className="block text-sm text-zinc-600 mb-1">Nome supermercato</label>
          <input value={storeName} onChange={e => setStoreName(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-zinc-600 mb-1">Slug supermercato</label>
          <input value={storeSlug} onChange={e => setStoreSlug(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-zinc-600 mb-1">Nome reparto</label>
          <input value={counterName} onChange={e => setCounterName(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-zinc-600 mb-1">Slug reparto (counter)</label>
          <input value={counterSlug} onChange={e => setCounterSlug(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2" />
        </div>
        <button
          onClick={createCounter}
          disabled={creating}
          className="rounded-xl border border-zinc-200 bg-black/90 px-4 py-3 text-white disabled:opacity-60"
        >
          {creating ? "..." : "Crea supermarket + reparto"}
        </button>

        {err && (
          <pre className="whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{err}</pre>
        )}
        {created && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
            <div className="text-sm">Creato:</div>
            <div className="text-xs opacity-80">Store: {created.store.name} ({created.store.slug})</div>
            <div className="text-xs opacity-80">Reparto: {created.counter.name} ({created.counter.slug})</div>
            <div className="mt-2 text-sm">URL cliente (QR): <code>{created.urls.take}</code></div>
            <div className="text-sm">URL banconista: <code>{created.urls.clerk}</code></div>
          </div>
        )}
      </div>

      <h2 className="mt-6 text-lg font-semibold">Reparti attivi</h2>
      <button onClick={loadList} disabled={loadingList} className="mt-2 rounded-lg border border-zinc-200 px-3 py-2">
        {loadingList ? "..." : "Ricarica elenco"}
      </button>

      <div className="mt-3 space-y-2">
        {rows.map(r => (
          <div key={r.id} className="rounded-xl border border-zinc-200 p-3">
            <div className="text-sm font-medium">{r.store} — {r.name}</div>
            <div className="text-xs text-zinc-500">slug: <code>{r.slug}</code> • store: <code>{r.storeSlug}</code></div>
            <div className="mt-1 text-xs">
              Cliente: <code>{r.takeUrl}</code>
            </div>
            <div className="text-xs">
              Banconista: <code>{r.clerkUrl}</code>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-zinc-500">Nessun reparto ancora.</div>}
      </div>
    </div>
  );
}

