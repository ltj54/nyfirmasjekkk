import { NextResponse } from "next/server";

import { localMailboxRequest, mailboxBackend } from "../../_lib";

export async function POST(request: Request, context: { params: Promise<{ uid: string }> }) {
  if (!localMailboxRequest(request)) {
    return NextResponse.json({ error: "Postkassen kan bare leses lokalt." }, { status: 403 });
  }
  const { uid } = await context.params;
  if (!/^\d{1,19}$/.test(uid)) {
    return NextResponse.json({ error: "Ugyldig meldings-ID." }, { status: 400 });
  }
  return mailboxBackend(`message/${uid}`);
}
