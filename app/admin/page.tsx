"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * Tipi base (adatta se il tuo /api/admin/list restituisce campi differenti)
 */
type CounterRow = {
  id: string;
  name: string;          // nome reparto
  slug: string;          // slug reparto (counter)
  store: string;         // nome supermercato
  storeSlug: string;     // slug supermercato
  enabled: boolean;      // reparto attivo/sospeso
  createdAt?: string;
  takeUrl: string;       // URL cliente (QR)
  clerkUrl: string;      // URL banconista
};

type CreatedPayload = {
  store?: { name?: string; slug?: string };
  counter?: { name?: string; slug?: string };
  urls?: { take?: string; clerk?: string };
};

/**
 * Helpers QR (import dinamico per evitare problemi SSR)
 */
async function generateQrDataUrl(text: string): Promise<string> {
  const QR = await import("qrcode");
  // correzione errore in caso di stringa vuota
  const value = text?.trim() || " ";
  return QR.toDataURL(value, { margin: 1, errorCorrectionLevel: "M" });
}

async function downloadQrPng(url: string | undefined, filename = "qr.png") {
  if (!url) return;
  const dataUrl = await generateQrDataUrl(url);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  a.click();
}

async function printQrA4(opts: { url?: string; title?: string; subtitle?: string }) {
  if (!opts.url) return;
  const dataUrl = await generateQrDataUrl(opts.url);
  const w = window.open("", "_blank", "noopener,noreferrer,width=800,height=1100");
  if (!w) return;
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>QR</title>
<style>
  *{box-sizing:border-box}
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';margin:0;padding:2cm}
  .wrap{display:flex;flex-direction:column;align-items:center;gap:24px}
  h1{font-size:28pt;margin:0;text-align:center}
  p{font-size:14pt;margin:0;text-align:center;color:#444}
  .qr{width:14cm;height:14cm;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;padding:1cm;border-radius:12px}
  .qr img{width:100%;height:100%;object-fit:contain}
  .footer{font-size:10pt;color:#666;margin-top:12px}
</style>
</head>
<body>
  <div class="wrap">
    <h1>${(opts.title || "Supermercato").replace(/</g,"&lt;")}</h1>
    <p>${(opts.subtitle || "Prendi il tuo numero").replace(/</g,"&lt;")}</p>
    <div class="qr"><img src="${dataUrl}" alt="QR" /></div>
    <div class="footer">${(opts.url || "").replace(/</g,"&lt;")}</div>
  </div>
  <script>window.print();</script>
</body>
</html>`;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/**
 * Component
 */
export default function AdminPage() {
  // Auth semplice via header
  const [token, setToken] = useState<string>("");
  const [err, setErr] = useState<string>("");

  // Lista reparti
  const [rows, setRows] = useState<CounterRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Form creazione (adatta ai tuoi endpoint reali)
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [counterName, setCounterName] = useState("");
  const [counterSlug, setCounterSlug] = useState("");

  // Esito creazione
  const [created, setCreated] = useState<CreatedPayload | null>(null);

  async function loadList() {
    if (!token) {
      setRows([]);
      return setErr("Inserisci Admin Token");
    }
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/list", {
        headers: { "x-admin-token": token },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Errore caricamento lista");
      // ci aspettiamo data.counters: CounterRow[]
      setRows((data?.counters || []) as CounterRow[]);
    } catch (e: any) {
      setErr(e.message || "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }

  // caricamento iniziale quando inserisci token
  useEffect(() => {
    if (token) loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Riassunto per supermercato
  const storeSummary = useMemo(() => {
    const acc: Record<
      string,
      { store: string; storeSlug: string; total: number; active: number }
    > = {};
    for (const r of rows) {
      if (!acc[r.storeSlug]) acc[r.storeSlug] = { store: r.store, storeSlug: r.storeSlug, total: 0, active: 0 };
      acc[r.storeSlug].total += 1;
      if (r.enabled) acc[r.storeSlug].active += 1;
    }
    return Object.values(acc).sort((a, b) => a.store.localeCompare(b.store));
  }, [rows]);

  /**
   * Azioni Admin
   */
  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return setErr("Inserisci Admin Token");
    setErr("");
    setCreated(null);
    try {
      const res = await fetch("/api/admin/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({
          storeName,
          storeSlug,
          counterName,
          counterSlug,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Errore creazione");
      setCreated(data as CreatedPayload);
      // pulizia campi
      setStoreName("");
      setStoreSlug("");
      setCounterName("");
      setCounterSlug("");
      await loadList();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function toggleCounter(id: string, enabled: boolean) {
    if (!token) return setErr("Inserisci Admin Token");
    try {
      const res = await fetch("/api/admin/counter/status", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ id, enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Errore stato");
      await loadList();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function deleteCounter(id: string) {
    if (!token) return setErr("Inserisci Admin Token");
    if (!confirm("Eliminare definitivamente questo reparto?")) return;
    try {
      const res = await fetch(`/api/admin/counter/${id}`, {
        method: "DELETE",
        headers: { "x-admin-token": token },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Errore eliminazione");
      await loadList();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function toggleStore(storeSlug: string, enabled: boolean) {
    if (!token) return setErr("Inserisci Admin Token");
    try {
      const res = await fetch("/api/admin/store/status", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ storeSlug, enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Errore sospensione supermercato");
      await loadList();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Pannello Admin</h1>

      {/* Token */}
      <div className="mt-4 rounded-2xl border border-zinc-200 p-4">
        <label className="text-sm font-medium">Admin Token</label>
        <input
          type="password"
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Inserisci token per sbloccare le azioni"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
      </div>

      {/* Creazione Store + Reparto */}
      <form onSubmit={onCreate} className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-zinc-200 p-4 md:grid-cols-2">
        <div className="md:col-span-2 text-sm font-semibold">Crea supermarket + reparto</div>

        <div>
          <label className="text-xs font-medium">Nome supermercato</label>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Es. Azienda Agricola Di Vaio"
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium">Slug supermercato</label>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={storeSlug}
            onChange={(e) => setStoreSlug(e.target.value)}
            placeholder="es. di-vaio"
            required
          />
        </div>

        <div>
          <label className="text-xs font-medium">Nome reparto</label>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={counterName}
            onChange={(e) => setCounterName(e.target.value)}
            placeholder="Es. Frutta e Verdura"
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium">Slug reparto (counter)</label>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={counterSlug}
            onChange={(e) => setCounterSlug(e.target.value)}
            placeholder="es. frutta-verdura"
            required
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
            disabled={!token}
          >
            Crea supermarket + reparto
          </button>
        </div>
      </form>

      {/* Box esito creazione + QR */}
      {created && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 text-sm">
          <div className="font-semibold mb-1">Creato:</div>
          <div>Store: {created.store?.name} ({created.store?.slug})</div>
          <div>Reparto: {created.counter?.name} ({created.counter?.slug})</div>
          {created.urls?.take && (
            <>
              <div className="mt-2">
                URL cliente (QR):{" "}
                <a className="underline" href={created.urls.take} target="_blank" rel="noreferrer">
                  {created.urls.take}
                </a>
              </div>
              <div>
                URL banconista:{" "}
                <a className="underline" href={created.urls.clerk} target="_blank" rel="noreferrer">
                  {created.urls.clerk}
                </a>
              </div>
            </>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() =>
                downloadQrPng(
                  created.urls?.take,
                  `${created.store?.slug || "store"}-${created.counter?.slug || "counter"}-QR`
                )
              }
              className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-[11px] font-medium hover:bg-emerald-100"
            >
              Scarica QR (PNG)
            </button>
            <button
              onClick={() =>
                printQrA4({
                  url: created.urls?.take,
                  title: created.store?.name || "Supermercato",
                  subtitle: (created.counter?.name || "Reparto") + " • Prendi il numero",
                })
              }
              className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-[11px] font-medium hover:bg-emerald-100"
            >
              Stampa QR (A4)
            </button>
          </div>
        </div>
      )}

      {/* Riassunto supermercati */}
      <div className="mt-6 rounded-2xl border border-zinc-200 p-4">
        <div className="mb-2 text-sm font-semibold">Supermercati (riassunto)</div>
        {storeSummary.length === 0 ? (
          <div className="text-xs text-zinc-500">Nessun supermercato</div>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {storeSummary.map((s) => (
              <li key={s.storeSlug} className="rounded-xl border border-zinc-200 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{s.store}</div>
                    <div className="text-[11px] text-zinc-500">{s.storeSlug}</div>
                    <div className="mt-1 text-[11px]">Reparti: {s.active}/{s.total} attivi</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {s.active > 0 ? (
                      <button
                        onClick={() => toggleStore(s.storeSlug, false)}
                        className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] hover:bg-amber-100"
                        disabled={!token}
                        title="Sospendi tutti i reparti di questo supermercato"
                      >
                        Sospendi store
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleStore(s.storeSlug, true)}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] hover:bg-emerald-100"
                        disabled={!token}
                        title="Riattiva tutti i reparti di questo supermercato"
                      >
                        Riattiva store
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tabella reparti attivi */}
      <h2 className="mt-6 text-lg font-semibold">Reparti attivi</h2>

      <div className="mt-2 overflow-x-auto rounded-2xl border border-zinc-200">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Supermercato</th>
              <th className="px-3 py-2 font-medium">Slug store</th>
              <th className="px-3 py-2 font-medium">Reparto</th>
              <th className="px-3 py-2 font-medium">Slug reparto</th>
              <th className="px-3 py-2 font-medium">Stato</th>
              <th className="px-3 py-2 font-medium">Creato</th>
              <th className="px-3 py-2 font-medium">Cliente</th>
              <th className="px-3 py-2 font-medium">Banconista</th>
              <th className="px-3 py-2 font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4 text-zinc-500" colSpan={9}>
                  Caricamento…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-zinc-500" colSpan={9}>
                  Nessun reparto
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-zinc-200">
                  <td className="px-3 py-3">{r.store}</td>
                  <td className="px-3 py-3 text-[11px] text-zinc-500">{r.storeSlug}</td>
                  <td className="px-3 py-3">{r.name}</td>
                  <td className="px-3 py-3 text-[11px] text-zinc-500">{r.slug}</td>
                  <td className="px-3 py-3">
                    {r.enabled ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800">attivo</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">sospeso</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[11px] text-zinc-500">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <a className="underline" href={r.takeUrl} target="_blank" rel="noreferrer">
                      Apri
                    </a>
                  </td>
                  <td className="px-3 py-3">
                    <a className="underline" href={r.clerkUrl} target="_blank" rel="noreferrer">
                      Apri
                    </a>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => downloadQrPng(r.takeUrl, `${r.storeSlug}-${r.slug}-QR`)}
                        className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-[11px] hover:bg-zinc-50"
                        title="Scarica QR (PNG)"
                        disabled={!token}
                      >
                        QR PNG
                      </button>
                      <button
                        onClick={() =>
                          printQrA4({
                            url: r.takeUrl,
                            title: r.store || "Supermercato",
                            subtitle: (r.name || "Reparto") + " • Prendi il numero",
                          })
                        }
                        className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-[11px] hover:bg-zinc-50"
                        title="Stampa QR A4"
                        disabled={!token}
                      >
                        QR A4
                      </button>
                      <button
                        onClick={() => toggleCounter(r.id, !r.enabled)}
                        className={
                          "rounded-lg px-2 py-1 text-[11px] border " +
                          (r.enabled
                            ? "border-amber-300 bg-amber-50 hover:bg-amber-100"
                            : "border-emerald-300 bg-emerald-50 hover:bg-emerald-100")
                        }
                        title={r.enabled ? "Sospendi reparto" : "Riattiva reparto"}
                        disabled={!token}
                      >
                        {r.enabled ? "Sospendi" : "Riattiva"}
                      </button>
                      <button
                        onClick={() => deleteCounter(r.id)}
                        className="rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-[11px] hover:bg-red-100"
                        title="Elimina reparto"
                        disabled={!token}
                      >
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Hint API */}
      <p className="mt-4 text-[11px] text-zinc-500">
        Endpoint attesi: <code>/api/admin/list</code>, <code>/api/admin/create</code>,{" "}
        <code>/api/admin/counter/status</code>, <code>/api/admin/counter/[id]</code> (DELETE),{" "}
        <code>/api/admin/store/status</code>. Tutti richiedono header <code>x-admin-token</code>.
      </p>
    </main>
  );
}

