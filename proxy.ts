import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/api/admin/:path*"],
};

export default function proxy(req: NextRequest) {
  const token = req.headers.get("x-admin-token");
  const expected = process.env.ADMIN_TOKEN;

  if (!expected) {
    return NextResponse.json(
      { error: "Server misconfigured: ADMIN_TOKEN env var missing" },
      { status: 500 }
    );
  }

  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}
