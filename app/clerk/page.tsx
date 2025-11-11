"use client";
import React, { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Board from "@/components/Board";

export const dynamic = "force-dynamic";

function ClerkInner() {
  const qp = useSearchParams();
  const slug = useMemo(() => qp.get("slug") || "", [qp]);

  const [called, setCalled] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function callNext() {
    try {
      setLoading(true); setErr(null); setCalled(null);
      const res = await fetch("/api/call-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counterSlug: slug })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Errore");
      setCalled(data);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!slug) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold">Banconista</h1>
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800">
          QR non valido: manca <code>?slug=...</code>. Apri questa pagina dal QR del banco.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Banconista</h1>
        <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600">
          {slug}
        </span>
      </div>

      <button
        onClick={callNext}
        disabled={loading}
        className="w-full rounded-xl border border-zinc-200 bg-black/90 px-4 py-3 text-white shadow-sm disabled:opacity-60"
      >
        {loading ? "..." : "Chiama prossimo"}
      </button>

      {err && (
        <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
{err}
        </pre>
      )}
      {called && (
        <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm text-blue-700">Hai chiamato</div>
          <div className="text-4xl font-black text-blue-900">
            {called?.next?.ticket_number ?? "—"}
          </div>
        </div>
      )}

      <Board slug={slug} />
    </div>
  );
}

export default function ClerkPageWrapper() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl p-6">Caricamento…</div>}>
      <ClerkInner />
    </Suspense>
  );
}

