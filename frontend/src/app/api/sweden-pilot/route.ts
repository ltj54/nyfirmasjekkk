import { fetchSwedishPilot } from "@/lib/sweden-pilot";
import { isLocalApiRequest } from "@/lib/local-api-access";

export const runtime = "nodejs";
export const maxDuration = 150;

let busy = false;

export async function POST(request: Request) {
  if (!isLocalApiRequest(request.headers.get("host"), request.method, request.headers.get("origin"))) {
    return Response.json({ error: "Prøvehenting må startes fra den lokale appen." }, { status: 403 });
  }
  const apiKey = process.env.SCB_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: "SCB-tilgang er ikke satt opp ennå. Legg SCB_API_KEY i frontend/.env.local og start frontend på nytt." }, { status: 503 });
  }
  if (busy) return Response.json({ error: "En prøvehenting pågår allerede. Vent til den er ferdig." }, { status: 409 });
  busy = true;
  try {
    return Response.json(await fetchSwedishPilot(apiKey), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kunne ikke hente prøveutvalget fra SCB.";
    console.error("SCB-prøvehenting feilet", message);
    return Response.json({ error: message }, { status: 502 });
  } finally {
    busy = false;
  }
}
