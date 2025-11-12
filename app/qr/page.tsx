import { Suspense } from 'react';
import QrClient from './QrClient';

export default function QrPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6">
          <div>Carico QR…</div>
        </div>
      }
    >
      <QrClient />
    </Suspense>
  );
}

