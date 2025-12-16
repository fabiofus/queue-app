"use client";

import { useCallback, useState } from "react";

export default function ClerkClient({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false);
  const [adminToken, setAdminToken] = useState("");

  const callNext = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      await fetch(`/api/call-next?slug=${encodeURIComponent(slug)}`, { method: "POST" });
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const resetCounter = useCallback(async () => {
    if (!slug || !adminToken) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/counter/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({ slug }),
      });
    } finally {
      setLoading(false);
    }
  }, [slug, adminToken]);

  return (
    <>
      {!slug && <div className="text-red-600">Slug mancante</div>}

      <div className="grid gap-3">
        <button
          onClick={callNext}
          disabled={!slug || loading}
          className="bg-black text-white rounded-xl py-3 disabled:opacity-50"
        >
          {loading ? "..." : "Chiama prossimo"}
        </button>
      </div>

      <div className="border-t pt-4 space-y-3">
        <input
          placeholder="Admin Token"
          value={adminToken}
          onChange={(e) => setAdminToken(e.target.value)}
          className="border rounded-xl p-3 w-full"
        />
        <button
          onClick={resetCounter}
          disabled={!slug || loading}
          className="bg-red-600 text-white rounded-xl py-3 disabled:opacity-50"
        >
          {loading ? "..." : "Reset contatore"}
        </button>
      </div>
    </>
  );
}

