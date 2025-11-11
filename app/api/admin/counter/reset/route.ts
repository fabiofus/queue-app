import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "missing slug" }, { status: 400 });

  const key = `counter:${slug}`;
  await kv.set(key, 0);
  const current = await kv.get<number>(key);
  return NextResponse.json({ ok: true, slug, current });
}

