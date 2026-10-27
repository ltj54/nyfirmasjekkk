import { NextResponse, type NextRequest } from "next/server";

import { isLocalApiRequest } from "@/lib/local-api-access";

export function proxy(request: NextRequest) {
  if (!isLocalApiRequest(request.headers.get("host"), request.method, request.headers.get("origin"))) {
    return NextResponse.json({ error: "API-et krever en lokal forespørsel fra appen." }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
