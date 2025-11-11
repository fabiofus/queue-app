import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "missing slug" }, { status: 400 });

  const key = `counter:${slug}`;
  const current = (await kv.get<number>(key)) ?? 0;
  return NextResponse.json({ ok: true, slug, current });
}

