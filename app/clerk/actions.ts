
"use server";

import { revalidatePath } from "next/cache";

export async function resetCounterAction(formData: FormData) {
  const slug = (formData.get("slug") as string) || "";
  if (!slug) throw new Error("slug mancante");

  const token = process.env.ADMIN_TOKEN;
  if (!token) throw new Error("ADMIN_TOKEN mancante");

  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const res = await fetch(
    `${base}/api/admin/counter/reset?slug=${encodeURIComponent(slug)}`,
    {
      method: "POST",
      headers: { "x-admin-token": token },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Reset failed: ${res.status} ${text}`);
  }

  // invalida eventuali cache della pagina clerk/reset
  revalidatePath("/clerk/reset");

  return res.json();
}

