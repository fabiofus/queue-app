'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';

export default function QrClient() {
  const params = useSearchParams();
  const slug = params.get('slug') || '';
  const mode = params.get('mode') || 'take'; // 'take' | 'clerk'
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const base =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://queue-app-beige.vercel.app';

    const targetPath = mode === 'clerk' ? '/clerk' : '/take';
    const url = `${base}${targetPath}?slug=${encodeURIComponent(slug)}`;

    QRCode.toDataURL(url)
      .then(setDataUrl)
      .catch((err: unknown) => {
        console.error('qr_error', err);
      });
  }, [slug, mode]);

  if (!slug) {
    return (
      <div className="p-6">
        <p>Slug mancante</p>
      </div>
    );
  }

  const label =
    mode === 'clerk' ? 'QR Bancone' : 'QR Ticket (cliente)';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-xl font-bold">{label}</h1>
      <p className="text-sm text-gray-600">
        slug: <b>{slug}</b>
      </p>
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={label}
          className="border rounded-xl bg-white p-4"
        />
      ) : (
        <div>Generazione QR…</div>
      )}
    </div>
  );
}

