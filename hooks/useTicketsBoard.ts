'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type BoardState = {
  servingNow: number | null;
  next: number | null;
  waitingCount: number;
  loading: boolean;
  error?: string;
};

export function useTicketsBoard(counterSlug: string): BoardState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [rows, setRows] = useState<Array<{ id: number; called_at: string | null }>>([]);

  const supabase = useMemo(() => supabaseBrowser(), []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    const { data, error } = await supabase
      .from('tickets')
      .select('id, called_at')
      .eq('counter_slug', counterSlug)
      .order('id', { ascending: true });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setRows(data ?? []);
    setLoading(false);
  }, [supabase, counterSlug]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const channel = supabase
      .channel(`tickets:${counterSlug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `counter_slug=eq.${counterSlug}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, counterSlug, refetch]);

  const servingNow = useMemo(() => {
    const called = rows.filter(r => r.called_at !== null);
    if (called.length === 0) return null;
    return called[called.length - 1].id;
  }, [rows]);

  const next = useMemo(() => {
    const waiting = rows.filter(r => r.called_at === null);
    return waiting.length > 0 ? waiting[0].id : null;
  }, [rows]);

  const waitingCount = useMemo(() => rows.filter(r => r.called_at === null).length, [rows]);

  return { servingNow, next, waitingCount, loading, error };
}

