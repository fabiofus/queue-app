import { NextRequest, NextResponse } from "next/server";
import { verifyClerkSession, getClerkCookieName } from "@/lib/clerkSession";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(getClerkCookieName())?.value;
  const session = verifyClerkSession(token);
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, slug: session.slug });
}
