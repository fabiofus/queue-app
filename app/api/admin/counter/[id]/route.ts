import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

// Se vuoi forzare Node runtime, scommenta:
// export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, context: RouteContext) {
  // In Next 16 params è una Promise
  const { id: idFromParams } = await context.params;

  const url = new URL(req.url);
  const idFromPath = url.pathname.split("/").pop() || undefined;
  const idFromQuery = url.searchParams.get("id") || undefined;

  const id = idFromParams || idFromQuery || idFromPath;

  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  const key = `counter:meta:${id}`;
  const meta = await kv.get<any>(key);

  await kv.del(key);
  await kv.srem("counters:index", id);
  if (meta && typeof meta === "object" && (meta as any).storeSlug) {
    await kv.srem(`store:index:${(meta as any).storeSlug}`, id);
  }

  return NextResponse.json({ ok: true, id });
}
