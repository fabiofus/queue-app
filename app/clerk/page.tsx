"use client";
import { useState } from "react";
import Board from "@/components/Board";

export default function ClerkPage() {
  const [slug, setSlug] = useState("macelleria-super1");
  const [called, setCalled] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function callNext() {
    setLoading(true);
    setCalled(null);
    const res = await fetch("/api/call-next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterSlug: slug })
    });
    const data = await res.json();
    setCalled(data);
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 640, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Banconista — Chiama Prossimo</h1>
      <input
        value={slug}
        onChange={e => setSlug(e.target.value)}
        placeholder="counter slug"
        style={{ width: "100%", padding: 8, margin: "8px 0", border: "1px solid #ccc", borderRadius: 6 }}
      />
      <button onClick={callNext} disabled={loading} style={{ padding: "10px 16px", borderRadius: 8 }}>
        {loading ? "..." : "Chiama"}
      </button>
      {called && (
        <pre style={{ marginTop: 16, background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
{JSON.stringify(called, null, 2)}
        </pre>
      )}

      {/* Tabellone realtime */}
      <Board slug={slug} />
    </div>
  );
}

