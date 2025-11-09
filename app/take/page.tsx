"use client";
import { useState } from "react";

export default function TakePage() {
  const [slug, setSlug] = useState("macelleria-super1");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function take() {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterSlug: slug })
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Prendi Numero</h1>
      <input
        value={slug}
        onChange={e => setSlug(e.target.value)}
        placeholder="counter slug"
        style={{ width: "100%", padding: 8, margin: "8px 0", border: "1px solid #ccc", borderRadius: 6 }}
      />
      <button onClick={take} disabled={loading} style={{ padding: "10px 16px", borderRadius: 8 }}>
        {loading ? "..." : "Prendi"}
      </button>
      {result && (
        <pre style={{ marginTop: 16, background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
{JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

