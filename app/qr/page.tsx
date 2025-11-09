"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QRPage() {
  const slug = "macelleria-ilcortile";
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    const url = `${window.location.origin}/take?slug=${slug}`;
    QRCode.toDataURL(url, { margin: 1, scale: 8 }).then(setDataUrl);
  }, []);

  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/take?slug=${slug}`;

  return (
    <div className="mx-auto max-w-xl p-6 text-center font-[system-ui]">
      <h1 className="text-2xl font-semibold mb-3">QR — Reparto macelleria</h1>
      <div className="text-zinc-600 mb-4 text-sm">
        Supermercato Il Cortile
      </div>
      <div className="mt-4">
        {dataUrl && (
          <img
            src={dataUrl}
            alt="QR"
            className="mx-auto bg-white p-4 rounded-2xl shadow"
          />
        )}
      </div>
      <div className="mt-4 text-sm text-zinc-500">
        Link: <code>{url}</code>
      </div>
    </div>
  );
}
