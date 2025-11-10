'use client';

import { useTicketsBoard } from '@/hooks/useTicketsBoard';

export default function TicketsBoard({ counterSlug }: { counterSlug: string }) {
  const { servingNow, next, waitingCount, loading, error } = useTicketsBoard(counterSlug);

  if (error) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
        Errore tabellone: {error}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-4 md:p-6 shadow-sm grid gap-3 md:gap-4">
      <div className="text-sm uppercase tracking-wide text-gray-500">Tabellone</div>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="rounded-xl bg-green-50 p-4 text-center">
          <div className="text-xs text-green-700">Serving now</div>
          <div className="text-3xl md:text-5xl font-bold text-green-900">
            {loading ? '…' : (servingNow ?? '—')}
          </div>
        </div>

        <div className="rounded-xl bg-yellow-50 p-4 text-center">
          <div className="text-xs text-yellow-700">Next</div>
          <div className="text-3xl md:text-5xl font-bold text-yellow-900">
            {loading ? '…' : (next ?? '—')}
          </div>
        </div>

        <div className="rounded-xl bg-blue-50 p-4 text-center">
          <div className="text-xs text-blue-700">In attesa</div>
          <div className="text-3xl md:text-5xl font-bold text-blue-900">
            {loading ? '…' : waitingCount}
          </div>
        </div>
      </div>
    </div>
  );
}

