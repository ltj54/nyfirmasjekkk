import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const backendBaseUrl = "http://127.0.0.1:8080";

export function localMailboxRequest(request: Request) {
  const url = new URL(request.url);
  const localHost = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  return localHost && request.headers.get("origin") === url.origin;
}

async function localMailboxToken() {
  const secretsPath = path.resolve(process.cwd(), "../scripts/local-secrets.ps1");
  const secrets = await readFile(secretsPath, "utf8");
  const prefix = '$env:APP_MAIL_READ_TOKEN = "';
  const line = secrets.split(/\r?\n/).map((entry) => entry.trim()).find((entry) => entry.startsWith(prefix));
  const token = line?.endsWith('"') ? line.slice(prefix.length, -1) : undefined;
  return token && /^[a-f\d]{64}$/i.test(token) ? token : undefined;
}

export async function mailboxBackend(path: string) {
  let token: string | undefined;
  try {
    token = await localMailboxToken();
  } catch {
    // The local secrets file may not be configured yet.
  }
  if (!token) {
    return NextResponse.json({ error: "Lokal e-posttilgang er ikke konfigurert." }, { status: 503 });
  }
  try {
    const response = await fetch(`${backendBaseUrl}/api/mailbox/${path}`, {
      method: "POST",
      cache: "no-store",
      headers: { "X-Mailbox-Token": token },
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Kunne ikke lese postkassen." }, { status: response.status });
    }
    return NextResponse.json(await response.json(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "E-posttjenesten er utilgjengelig." }, { status: 502 });
  }
}
