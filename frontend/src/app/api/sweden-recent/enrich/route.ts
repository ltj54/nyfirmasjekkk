import { isLocalApiRequest } from "@/lib/local-api-access";
import { enrichRecentSwedishCompanies } from "@/lib/sweden-pilot";
import { discoverSwedishWebsiteSuggestions } from "@/lib/sweden-website-suggestions";

export const runtime = "nodejs";
export const maxDuration = 150;

let busy = false;

export async function POST(request: Request) {
  if (!isLocalApiRequest(request.headers.get("host"), request.method, request.headers.get("origin"))) {
    return Response.json({ error: "SCB-sjekken må startes fra den lokale appen." }, { status: 403 });
  }
  const apiKey = process.env.SCB_API_KEY?.trim();
  if (!apiKey) return Response.json({ error: "SCB-tilgang er ikke satt opp ennå." }, { status: 503 });
  if (busy) return Response.json({ error: "En SCB-sjekk pågår allerede." }, { status: 409 });
  let orgNumbers: unknown;
  try {
    const body = await request.json() as { orgNumbers?: unknown };
    orgNumbers = body.orgNumbers;
  } catch {
    return Response.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }
  if (!Array.isArray(orgNumbers) || orgNumbers.length < 1 || orgNumbers.length > 25
    || orgNumbers.some((number) => typeof number !== "string" || !/^\d{10}$/.test(number))
    || new Set(orgNumbers).size !== orgNumbers.length) {
    return Response.json({ error: "Velg 1–25 ulike selskaper fra den synlige siden." }, { status: 400 });
  }
  busy = true;
  try {
    const enrichment = await enrichRecentSwedishCompanies(apiKey, orgNumbers);
    const companiesWithEmail = enrichment.companies.filter((company) => company.email.trim());
    const groups = Array.from({ length: Math.ceil(companiesWithEmail.length / 5) }, (_, index) =>
      companiesWithEmail.slice(index * 5, (index + 1) * 5));
    const suggestionEntries = await groups.reduce<Promise<Array<readonly [string, Awaited<ReturnType<typeof discoverSwedishWebsiteSuggestions>>]>>>(
      async (pending, group) => [
        ...await pending,
        ...await Promise.all(group.map(async (company) => [
          company.id.slice(3),
          await discoverSwedishWebsiteSuggestions(company.name, company.email),
        ] as const)),
      ],
      Promise.resolve([]),
    );
    return Response.json({ ...enrichment, websiteSuggestions: Object.fromEntries(suggestionEntries) },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SCB-sjekken mislyktes.";
    console.error("SCB-berikelse feilet", message);
    return Response.json({ error: message }, { status: 502 });
  } finally {
    busy = false;
  }
}
