import { isLocalApiRequest } from "@/lib/local-api-access";
import { loadRecentSwedishCompanies } from "@/lib/sweden-recent";

export const runtime = "nodejs";
export const maxDuration = 300;

let busy = false;

export async function POST(request: Request) {
  if (!isLocalApiRequest(request.headers.get("host"), request.method, request.headers.get("origin"))) {
    return Response.json({ error: "Hentingen må startes fra den lokale appen." }, { status: 403 });
  }
  if (busy) return Response.json({ error: "En svensk registerhenting pågår allerede." }, { status: 409 });
  busy = true;
  try {
    return Response.json(await loadRecentSwedishCompanies(),
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kunne ikke hente svenske registerdata.";
    console.error("Svensk registerhenting feilet", message);
    return Response.json({ error: message }, { status: 502 });
  } finally {
    busy = false;
  }
}
