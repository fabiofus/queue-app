// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.headers.get("x-admin-token");
  if (token !== process.env.ADMIN_TOKEN) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

