import { isLocalApiRequest } from "@/lib/local-api-access";
import { readSwedishOutreachLog, recordSwedishOutreach } from "@/lib/sweden-outreach-log";

export const runtime = "nodejs";

let saving = false;

export async function GET(request: Request) {
  if (!isLocalApiRequest(request.headers.get("host"), request.method, request.headers.get("origin"))) {
    return Response.json({ error: "Svensk kontaktlogg er bare tilgjengelig lokalt." }, { status: 403 });
  }
  try {
    const records = await readSwedishOutreachLog();
    if (new URL(request.url).searchParams.has("export")) {
      return new Response(records.map((record) => JSON.stringify(record)).join("\n") + (records.length ? "\n" : ""), {
        headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store",
          "Content-Disposition": 'attachment; filename="swedish-outreach-log.jsonl"' },
      });
    }
    return Response.json({ records }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Kunne ikke lese svensk kontaktlogg." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isLocalApiRequest(request.headers.get("host"), request.method, request.headers.get("origin"))) {
    return Response.json({ error: "Kontakt kan bare registreres fra den lokale appen." }, { status: 403 });
  }
  if (saving) return Response.json({ error: "En registrering pågår allerede. Prøv igjen." }, { status: 409 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }
  saving = true;
  try {
    return Response.json({ record: await recordSwedishOutreach(body) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("Ugyldig") || message.startsWith("Oppgi") || message.startsWith("Bekreft")) {
      return Response.json({ error: message }, { status: 400 });
    }
    return Response.json({ error: "Kunne ikke lagre svensk kontaktregistrering." }, { status: 500 });
  } finally {
    saving = false;
  }
}
