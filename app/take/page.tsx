"use client";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Board from "@/components/Board";

export const dynamic = "force-dynamic";

function TakeInner() {
  const qp = useSearchParams();
  const slug = useMemo(() => qp.get("slug") || "", [qp]);

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setResult(null); setError(null); }, [slug]);

  async function take() {
    try {
      setLoading(true); setError(null); setResult(null);
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counterSlug: slug })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Errore");
      setResult(data);
    } catch (e:any) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  if (!slug) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold">Prendi Numero</h1>
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800">
          QR non valido: manca <code>?slug=...</code>. Scansiona il QR del banco.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Prendi Numero</h1>
        <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600">
          {slug}
        </span>
      </div>

      <button
        onClick={take}
        disabled={loading}
        className="mt-4 w-full rounded-xl border border-zinc-200 bg-black/90 px-4 py-3 text-white shadow-sm disabled:opacity-60"
      >
        {loading ? "..." : "Prendi il tuo numero"}
      </button>

      {error && (
        <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
{error}
        </pre>
      )}
      {result && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm text-emerald-700">Hai preso il numero</div>
          <div className="text-4xl font-black text-emerald-900">
            {result?.ticket?.ticket_number ?? "—"}
          </div>
        </div>
      )}

      <Board slug={slug} />
    </div>
  );
}

export default function TakePageWrapper() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl p-6">Caricamento…</div>}>
      <TakeInner />
    </Suspense>
  );
}

