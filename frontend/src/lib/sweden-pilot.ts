export const SWEDEN_PILOT_LIMIT = 10;
const SCB_BASE_URL = "https://apiafr.scb.se/v1/";

export type SwedishPilotCompany = {
  id: string;
  name: string;
  city: string;
  registrationDate: string | null;
  email: string;
  emailReservationCode: number | null;
  statusCode: string;
  industryCodes: string[];
};

export type SwedishPilotResult = {
  companies: SwedishPilotCompany[];
  fetchedAt: string;
  withEmail: number;
  withRegistrationDate: number;
};

type Dependencies = {
  fetcher?: typeof fetch;
  pause?: () => Promise<void>;
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("SCB svarte med et uventet dataformat. Ingen oppføringer ble importert.");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function registrationDate(value: unknown): string | null {
  const date = text(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  return date;
}

function normalizeCompany(value: unknown, expectedId: string): SwedishPilotCompany {
  const row = object(value);
  const id = text(row.orgNr);
  if (row.jurform !== "49" || text(row.peOrgNr) !== expectedId || !/^\d{10}$/.test(id) || !text(row.namn)) {
    throw new Error("SCB returnerte en uventet virksomhetstype eller identitet. Prøveutvalget ble avbrutt.");
  }
  const address = object(row.postAdress);
  const industries = Array.isArray(row.naringsgrenar) ? row.naringsgrenar : [];
  return {
    id: `SE:${id}`,
    name: text(row.namn),
    city: text(address.postOrt),
    registrationDate: registrationDate(row.regDat),
    email: text(row.epost),
    emailReservationCode: Number.isInteger(row.epostSparrTyp) ? row.epostSparrTyp as number : null,
    statusCode: text(row.ftgStat),
    industryCodes: industries.map((item) => text(object(item).naringsgren)).filter(Boolean),
  };
}

function upstreamError(status: number): string {
  if (status === 401 || status === 403) return "SCB avviste API-nøkkelen. Kontroller tilgangen hos SCB.";
  if (status === 429) return "SCB ber oss vente før neste forsøk. Ingen nye forsøk kjøres automatisk.";
  return `SCB er utilgjengelig akkurat nå (HTTP ${status}). Prøv igjen senere.`;
}

/** Read-only, bounded sample: one AB list and at most ten full company lookups. */
export async function fetchSwedishPilot(apiKey: string, dependencies: Dependencies = {}): Promise<SwedishPilotResult> {
  if (!apiKey.trim()) throw new Error("Gratis API-nøkkel fra SCB må legges inn før henting.");
  const fetcher = dependencies.fetcher ?? fetch;
  const pause = dependencies.pause ?? (() => new Promise<void>((resolve) => setTimeout(resolve, 300)));

  async function readScb(resource: string): Promise<unknown> {
    await pause();
    const response = await fetcher(`${SCB_BASE_URL}${resource}`, {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(upstreamError(response.status));
    return response.json();
  }

  const listing = object(await readScb(`juridiskaenheter/juridiskform/49?limit=${SWEDEN_PILOT_LIMIT}`));
  if (!Array.isArray(listing.jes)) throw new Error("SCB-svaret mangler virksomhetslisten. Ingen oppføringer ble importert.");
  const rows = listing.jes.slice(0, SWEDEN_PILOT_LIMIT);
  const companies = await rows.reduce<Promise<SwedishPilotCompany[]>>(async (pending, value) => {
    const previous = await pending;
    const row = object(value);
    const id = text(row.peOrgNr);
    if (row.jurform !== "49" || !/^\d{12}$/.test(id)) {
      throw new Error("SCB returnerte en uventet identitet i AB-utvalget. Hentingen ble avbrutt.");
    }
    const detail = await readScb(`juridiskaenheter/${id}/full`);
    return [...previous, normalizeCompany(detail, id)];
  }, Promise.resolve([]));
  return {
    companies,
    fetchedAt: new Date().toISOString(),
    withEmail: companies.filter((company) => company.email).length,
    withRegistrationDate: companies.filter((company) => company.registrationDate).length,
  };
}
