"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Snapshot = {
  serving: number | null;   // ultimo 'called'
  next: number | null;      // prossimo 'waiting'
  waiting: number;          // quanti in 'waiting'
};

async function fetchSnapshot(slug: string): Promise<Snapshot> {
  const supabase = supabaseBrowser();
  const today = new Date().toISOString().slice(0,10); // yyyy-mm-dd

  // ultimo chiamato
  const { data: calledRows, error: err1 } = await supabase
    .from("tickets")
    .select("ticket_number")
    .eq("counter_slug", slug)
    .eq("ticket_date", today)
    .eq("status", "called")
    .order("ticket_number", { ascending: false })
    .limit(1);
  if (err1) throw err1;

  // prossimo (waiting più basso)
  const { data: nextRows, error: err2 } = await supabase
    .from("tickets")
    .select("ticket_number")
    .eq("counter_slug", slug)
    .eq("ticket_date", today)
    .eq("status", "waiting")
    .order("ticket_number", { ascending: true })
    .limit(1);
  if (err2) throw err2;

  // quanti in coda
  const { count, error: err3 } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("counter_slug", slug)
    .eq("ticket_date", today)
    .eq("status", "waiting");
  if (err3) throw err3;

  return {
    serving: calledRows?.[0]?.ticket_number ?? null,
    next: nextRows?.[0]?.ticket_number ?? null,
    waiting: count ?? 0,
  };
}

export default function Board({ slug }: { slug: string }) {
  const [snap, setSnap] = useState<Snapshot>({ serving: null, next: null, waiting: 0 });
  const supabase = useMemo(() => supabaseBrowser(), []);

  // load iniziale
  useEffect(() => {
    fetchSnapshot(slug).then(setSnap).catch(console.error);
  }, [slug]);

  // Realtime su tabella tickets per questo slug
  useEffect(() => {
    const channel = supabase
      .channel(`board:${slug}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `counter_slug=eq.${slug}`,
        },
        () => {
          // ogni cambio ricalcola snapshot
          fetchSnapshot(slug).then(setSnap).catch(console.error);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug, supabase]);

  const styleBox: React.CSSProperties = { padding: 16, border: "1px solid #ddd", borderRadius: 10, marginTop: 12 };

  return (
    <div style={{ marginTop: 20 }}>
      <div style={styleBox}>
        <div style={{ fontSize: 14, opacity: 0.7 }}>Stiamo servendo</div>
        <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }}>
          {snap.serving ?? "—"}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div style={styleBox}>
          <div style={{ fontSize: 14, opacity: 0.7 }}>Prossimo</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{snap.next ?? "—"}</div>
        </div>
        <div style={styleBox}>
          <div style={{ fontSize: 14, opacity: 0.7 }}>In coda</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{snap.waiting}</div>
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>
        Banco: <code>{slug}</code> — aggiornamento in tempo reale
      </div>
    </div>
  );
}

