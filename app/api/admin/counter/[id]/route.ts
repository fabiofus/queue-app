import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function DELETE(req: Request, ctx: { params?: { id?: string } }) {
  const fromParams = ctx?.params?.id;
  const url = new URL(req.url);
  const fromPath = url.pathname.split("/").pop() || undefined;
  const fromQuery = url.searchParams.get("id") || undefined;
  const id = fromParams || fromQuery || fromPath;

  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  const key = `counter:meta:${id}`;
  const meta = await kv.get<any>(key);

  await kv.del(key);
  await kv.srem("counters:index", id);
  if (meta?.storeSlug) {
    await kv.srem(`store:index:${meta.storeSlug}`, id);
  }

  return NextResponse.json({ ok: true, id });
}
