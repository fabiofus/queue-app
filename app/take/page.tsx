"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Board from "@/components/Board";

export default function TakePage() {
  const searchParams = useSearchParams();
  const qpSlug = searchParams.get("slug") || "macelleria-super1";
  const [slug, setSlug] = useState(qpSlug);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => setSlug(qpSlug), [qpSlug]);

  async function take() {
    try {
      setLoading(true);
      setResult(null);
      setError(null);
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counterSlug: slug })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Errore sconosciuto");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Prendi Numero</h1>
      <p style={{ opacity: 0.7, marginBottom: 8 }}>
        URL param <code>?slug=...</code>: <b>{qpSlug}</b>
      </p>
      <input
        value={slug}
        onChange={e => setSlug(e.target.value)}
        placeholder="counter slug"
        style={{ width: "100%", padding: 8, margin: "8px 0", border: "1px solid #ccc", borderRadius: 6 }}
      />
      <button onClick={take} disabled={loading} style={{ padding: "10px 16px", borderRadius: 8 }}>
        {loading ? "..." : "Prendi"}
      </button>

      {error && (
        <pre style={{ marginTop: 16, background: "#ffecec", padding: 12, borderRadius: 8 }}>
{error}
        </pre>
      )}
      {result && (
        <pre style={{ marginTop: 16, background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
{JSON.stringify(result, null, 2)}
        </pre>
      )}

      {/* Tabellone realtime */}
      <Board slug={slug} />
    </div>
  );
}

