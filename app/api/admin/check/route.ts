import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET(req: Request) {
  const ok = req.headers.get("x-admin-token") === env.ADMIN_TOKEN;
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ admin: true });
}
