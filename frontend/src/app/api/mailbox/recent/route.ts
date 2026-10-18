import { NextResponse } from "next/server";

import { localMailboxRequest, mailboxBackend } from "../_lib";

export async function POST(request: Request) {
  if (!localMailboxRequest(request)) {
    return NextResponse.json({ error: "Postkassen kan bare leses lokalt." }, { status: 403 });
  }
  return mailboxBackend("recent?limit=10");
}
