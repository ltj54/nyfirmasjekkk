import { isLocalApiRequest } from "@/lib/local-api-access";
import { enrichRecentSwedishSoleProprietorships } from "@/lib/sweden-pilot";
import { loadRecentSwedishCompanies, resolveSoleProprietorshipIdentifiers } from "@/lib/sweden-recent";

export const runtime = "nodejs";
export const maxDuration = 300;

let busy = false;

export async function POST(request: Request) {
  if (!isLocalApiRequest(request.headers.get("host"), request.method, request.headers.get("origin"))) {
    return Response.json({ error: "E-kontrollen må startes fra den lokale appen." }, { status: 403 });
  }
  const apiKey = process.env.SCB_API_KEY?.trim();
  if (!apiKey) return Response.json({ error: "SCB-tilgang er ikke satt opp ennå." }, { status: 503 });
  if (busy) return Response.json({ error: "En E-kontroll pågår allerede." }, { status: 409 });
  let requested: { cutoffDate?: unknown; sourceFileModifiedAt?: unknown };
  try {
    requested = await request.json() as typeof requested;
  } catch {
    return Response.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }
  if (typeof requested.cutoffDate !== "string" || typeof requested.sourceFileModifiedAt !== "string") {
    return Response.json({ error: "Hent registerlisten på nytt før E-kontroll." }, { status: 400 });
  }
  busy = true;
  try {
    const recent = await loadRecentSwedishCompanies();
    if (recent.cutoffDate !== requested.cutoffDate || recent.sourceFileModifiedAt !== requested.sourceFileModifiedAt) {
      return Response.json({ error: "Registerlisten er endret. Hent nye virksomheter på nytt." }, { status: 409 });
    }
    if (recent.soleProprietorships.length === 0 || recent.soleProprietorships.length > 100) {
      return Response.json({ error: "E-kontrollen støtter 1–100 registreringer om gangen. Ingen oppslag ble gjort." }, { status: 422 });
    }
    const lookups = await resolveSoleProprietorshipIdentifiers(recent.cutoffDate, recent.soleProprietorships);
    const enrichment = lookups.length ? await enrichRecentSwedishSoleProprietorships(apiKey, lookups) : {
      companies: [], unavailableIds: [], fetchedAt: new Date().toISOString(),
    };
    const resolved = new Set(lookups.map(({ candidate }) => candidate.id));
    return Response.json({
      ...enrichment,
      unavailableIds: [
        ...enrichment.unavailableIds,
        ...recent.soleProprietorships.filter((candidate) => !resolved.has(candidate.id)).map((candidate) => candidate.id),
      ],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Upstream network errors may contain request URLs; never echo or log an E identifier.
    console.error("Svensk E-kontroll feilet", error instanceof Error ? error.name : "Ukjent feil");
    return Response.json({ error: "E-kontrollen kunne ikke fullføres. Prøv igjen eller hent registerlisten på nytt." }, { status: 502 });
  } finally {
    busy = false;
  }
}
