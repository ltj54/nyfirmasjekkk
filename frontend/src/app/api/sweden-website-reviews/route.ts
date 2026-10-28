import { isLocalApiRequest } from "@/lib/local-api-access";
import { readWebsiteReviews, saveWebsiteReview } from "@/lib/sweden-websites";

export const runtime = "nodejs";

let saving = false;

export async function GET(request: Request) {
  if (!isLocalApiRequest(request.headers.get("host"), request.method, request.headers.get("origin"))) {
    return Response.json({ error: "Nettsidevurderingene er bare tilgjengelige lokalt." }, { status: 403 });
  }
  try {
    return Response.json({ reviews: await readWebsiteReviews() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Kunne ikke lese nettsidevurderingene." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isLocalApiRequest(request.headers.get("host"), request.method, request.headers.get("origin"))) {
    return Response.json({ error: "Nettsidevurderinger kan bare lagres fra den lokale appen." }, { status: 403 });
  }
  if (saving) return Response.json({ error: "En nettsidevurdering lagres allerede. Prøv igjen." }, { status: 409 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }
  saving = true;
  try {
    return Response.json({ review: await saveWebsiteReview(body) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/^(Ugyldig|Oppgi|Skriv)/.test(message)) return Response.json({ error: message }, { status: 400 });
    return Response.json({ error: "Kunne ikke lagre nettsidevurderingen." }, { status: 500 });
  } finally {
    saving = false;
  }
}
