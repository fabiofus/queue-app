"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Snapshot = { serving: number|null; next: number|null; waiting: number; };

const supabaseBrowser = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

async function fetchSnapshot(slug: string): Promise<Snapshot> {
  const supabase = supabaseBrowser();
  const today = new Date().toISOString().slice(0,10);

  const { data: called } = await supabase
    .from("tickets")
    .select("ticket_number")
    .eq("counter_slug", slug).eq("ticket_date", today).eq("status","called")
    .order("ticket_number", { ascending: false }).limit(1);

  const { data: next } = await supabase
    .from("tickets")
    .select("ticket_number")
    .eq("counter_slug", slug).eq("ticket_date", today).eq("status","waiting")
    .order("ticket_number", { ascending: true }).limit(1);

  const { count } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("counter_slug", slug).eq("ticket_date", today).eq("status","waiting");

  return {
    serving: called?.[0]?.ticket_number ?? null,
    next: next?.[0]?.ticket_number ?? null,
    waiting: count ?? 0,
  };
}

export default function Board({ slug }: { slug: string }) {
  const [snap, setSnap] = useState<Snapshot>({ serving:null, next:null, waiting:0 });
  const supabase = useMemo(() => supabaseBrowser(), []);

  useEffect(() => {
    fetchSnapshot(slug).then(setSnap).catch(console.error);
  }, [slug]);

  useEffect(() => {
    const channel = supabase
      .channel(`board:${slug}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "tickets", filter: `counter_slug=eq.${slug}` },
        () => { fetchSnapshot(slug).then(setSnap).catch(console.error); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [slug, supabase]);

  return (
    <div className="mt-6 space-y-3">
      <div className="rounded-2xl border border-zinc-200 p-5 shadow-sm">
        <div className="text-sm text-zinc-500">Stiamo servendo</div>
        <div className="text-6xl font-black leading-none tracking-tight">{snap.serving ?? "—"}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-zinc-200 p-5 shadow-sm">
          <div className="text-sm text-zinc-500">Prossimo</div>
          <div className="text-3xl font-bold">{snap.next ?? "—"}</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 p-5 shadow-sm">
          <div className="text-sm text-zinc-500">In coda</div>
          <div className="text-3xl font-bold">{snap.waiting}</div>
        </div>
      </div>
      <div className="text-xs text-zinc-500">Banco: <code>{slug}</code> — realtime</div>
    </div>
  );
}

