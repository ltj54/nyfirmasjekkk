import type { SwedishWebsiteSuggestion } from "./sweden-website-suggestions";

export const SWEDEN_PILOT_LIMIT = 10;
const SCB_BASE_URL = "https://apiafr.scb.se/v1/";

export type SwedishPilotCompany = {
  id: string;
  name: string;
  city: string;
  registrationDate: string | null;
  startDate: string | null;
  endDate: string | null;
  email: string;
  emailReservationCode: number | null;
  emailReservationLabel: string;
  advertisingReservationCode: number | null;
  advertisingReservationLabel: string;
  statusCode: string;
  statusLabel: string;
  fTaxStatusCode: string;
  fTaxStatusLabel: string;
  vatStatusCode: string;
  vatStatusLabel: string;
  employeeClassCode: string;
  employeeClassLabel: string;
  turnoverClassCode: string;
  turnoverClassLabel: string;
  workplaceCount: number | null;
  contactAssessment: "eligible" | "blocked" | "inactive" | "unknown";
  contactAssessmentReason: string;
  industryCodes: string[];
};

export type SwedishPilotResult = {
  companies: SwedishPilotCompany[];
  fetchedAt: string;
  withEmail: number;
  withRegistrationDate: number;
};

export type SwedishRecentEnrichment = {
  companies: SwedishPilotCompany[];
  unavailableOrgNumbers: string[];
  fetchedAt: string;
  websiteSuggestions?: Record<string, SwedishWebsiteSuggestion[]>;
};

type Dependencies = {
  fetcher?: typeof fetch;
  pause?: () => Promise<void>;
};

type CodeTable = ReadonlyMap<string, string>;

type ScbCodeTables = {
  companyStatus: CodeTable;
  emailReservation: CodeTable;
  advertisingReservation: CodeTable;
  fTaxStatus: CodeTable;
  vatStatus: CodeTable;
  employeeClass: CodeTable;
  turnoverClass: CodeTable;
};

const CODE_TABLE_RESOURCES: ReadonlyArray<[keyof ScbCodeTables, string]> = [
  ["companyStatus", "kodtabeller/ftgstatkoder"],
  ["emailReservation", "kodtabeller/epostsparrtypkoder"],
  ["advertisingReservation", "kodtabeller/reklamsparrtypkoder"],
  ["fTaxStatus", "kodtabeller/fskattstatkoder"],
  ["vatStatus", "kodtabeller/momsstatkoder"],
  ["employeeClass", "kodtabeller/anstklkoder"],
  ["turnoverClass", "kodtabeller/omsklkoder"],
];

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

function integer(value: unknown): number | null {
  return Number.isInteger(value) ? value as number : null;
}

function tableLabel(table: CodeTable, code: string | number | null): string {
  if (code === null || code === "") return "Ikke oppgitt";
  return table.get(String(code)) ?? `Ukjent SCB-kode ${code}`;
}

function parseCodeTable(value: unknown): CodeTable {
  if (!Array.isArray(value)) throw new Error("SCB svarte med en ugyldig kodetabell. Prøvehentingen ble avbrutt.");
  const entries = value.map((item) => {
    const row = object(item);
    const code = typeof row.kod === "number" ? String(row.kod) : text(row.kod);
    const label = text(row.klartext);
    if (!code || !label) throw new Error("SCB svarte med en ufullstendig kodetabell. Prøvehentingen ble avbrutt.");
    return [code, label] as const;
  });
  return new Map(entries);
}

function contactAssessment(options: {
  activeStatusCode: string;
  email: string;
  emailReservationCode: number | null;
  advertisingReservationCode: number | null;
}) {
  if (options.activeStatusCode !== "1") {
    return { contactAssessment: "inactive" as const, contactAssessmentReason: "SCB oppgir at virksomheten ikke er aktiv." };
  }
  if (!options.email) {
    return { contactAssessment: "unknown" as const, contactAssessmentReason: "SCB oppgir ingen e-postadresse. Skal ikke kontaktes fra denne listen." };
  }
  if (options.emailReservationCode === null || options.advertisingReservationCode === null) {
    return { contactAssessment: "unknown" as const, contactAssessmentReason: "Reservasjonsstatus er ufullstendig. Skal ikke kontaktes før dette er avklart." };
  }
  if (options.emailReservationCode !== 1 || options.advertisingReservationCode !== 1) {
    return { contactAssessment: "blocked" as const, contactAssessmentReason: "SCB oppgir en markedsføringsreservasjon. Kontakt er sperret." };
  }
  return { contactAssessment: "eligible" as const, contactAssessmentReason: "Aktiv virksomhet med e-post og uten registrert e-post- eller reklamesperre. Må fortsatt vurderes manuelt." };
}

function normalizeCompany(value: unknown, expectedId: string, tables: ScbCodeTables): SwedishPilotCompany {
  const row = object(value);
  const id = text(row.orgNr);
  if (row.jurform !== "49" || text(row.peOrgNr) !== expectedId || !/^\d{10}$/.test(id) || !text(row.namn)) {
    throw new Error("SCB returnerte en uventet virksomhetstype eller identitet. Prøveutvalget ble avbrutt.");
  }
  const address = object(row.postAdress);
  const industries = Array.isArray(row.naringsgrenar) ? row.naringsgrenar : [];
  const emailReservationCode = integer(row.epostSparrTyp);
  const advertisingReservationCode = integer(row.reklamSparrTyp);
  const statusCode = text(row.ftgStat);
  const fTaxStatusCode = text(row.fSkattStat);
  const vatStatusCode = text(row.momsStat);
  const employeeClassCode = text(row.anstKl);
  const turnoverClassCode = text(row.omsKl);
  const email = text(row.epost);
  return {
    id: `SE:${id}`,
    name: text(row.namn),
    city: text(address.postOrt),
    registrationDate: registrationDate(row.regDat),
    startDate: registrationDate(row.startDat),
    endDate: registrationDate(row.slutDat),
    email,
    emailReservationCode,
    emailReservationLabel: tableLabel(tables.emailReservation, emailReservationCode),
    advertisingReservationCode,
    advertisingReservationLabel: tableLabel(tables.advertisingReservation, advertisingReservationCode),
    statusCode,
    statusLabel: tableLabel(tables.companyStatus, statusCode),
    fTaxStatusCode,
    fTaxStatusLabel: tableLabel(tables.fTaxStatus, fTaxStatusCode),
    vatStatusCode,
    vatStatusLabel: tableLabel(tables.vatStatus, vatStatusCode),
    employeeClassCode,
    employeeClassLabel: tableLabel(tables.employeeClass, employeeClassCode),
    turnoverClassCode,
    turnoverClassLabel: tableLabel(tables.turnoverClass, turnoverClassCode),
    workplaceCount: integer(row.aeAnt),
    ...contactAssessment({
      activeStatusCode: statusCode,
      email,
      emailReservationCode,
      advertisingReservationCode,
    }),
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

  const codeTableEntries = await CODE_TABLE_RESOURCES.reduce<Promise<Array<[keyof ScbCodeTables, CodeTable]>>>(
    async (pendingEntries, [name, resource]) => {
      const entries = await pendingEntries;
      return [...entries, [name, parseCodeTable(await readScb(resource))]];
    },
    Promise.resolve([]),
  );
  const tables = Object.fromEntries(codeTableEntries) as ScbCodeTables;

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
    return [...previous, normalizeCompany(detail, id, tables)];
  }, Promise.resolve([]));
  return {
    companies,
    fetchedAt: new Date().toISOString(),
    withEmail: companies.filter((company) => company.email).length,
    withRegistrationDate: companies.filter((company) => company.registrationDate).length,
  };
}

/** Manually enriches one visible page only; no email or CRM action is performed. */
export async function enrichRecentSwedishCompanies(
  apiKey: string,
  orgNumbers: string[],
  dependencies: Dependencies = {},
): Promise<SwedishRecentEnrichment> {
  if (!apiKey.trim()) throw new Error("SCB-tilgang er ikke satt opp ennå.");
  if (orgNumbers.length < 1 || orgNumbers.length > 25 || new Set(orgNumbers).size !== orgNumbers.length
    || orgNumbers.some((number) => !/^\d{10}$/.test(number))) {
    throw new Error("SCB-sjekken kan bare gjelde 1–25 ulike svenske organisasjonsnumre.");
  }
  const fetcher = dependencies.fetcher ?? fetch;
  const pause = dependencies.pause ?? (() => new Promise<void>((resolve) => setTimeout(resolve, 300)));
  async function readScb(resource: string): Promise<{ status: number; body?: unknown }> {
    await pause();
    const response = await fetcher(`${SCB_BASE_URL}${resource}`, {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 404) return { status: 404 };
    if (!response.ok) throw new Error(upstreamError(response.status));
    return { status: response.status, body: await response.json() };
  }
  const codeTableEntries = await CODE_TABLE_RESOURCES.reduce<Promise<Array<[keyof ScbCodeTables, CodeTable]>>>(
    async (pendingEntries, [name, resource]) => {
      const entries = await pendingEntries;
      const response = await readScb(resource);
      return [...entries, [name, parseCodeTable(response.body)]];
    },
    Promise.resolve([]),
  );
  const tables = Object.fromEntries(codeTableEntries) as ScbCodeTables;
  const checked = await orgNumbers.reduce<Promise<{ companies: SwedishPilotCompany[]; unavailableOrgNumbers: string[] }>>(
    async (pending, orgNumber) => {
      const previous = await pending;
      const expectedId = `16${orgNumber}`;
      const response = await readScb(`juridiskaenheter/${expectedId}/full`);
      if (response.status === 404) previous.unavailableOrgNumbers.push(orgNumber);
      else previous.companies.push(normalizeCompany(response.body, expectedId, tables));
      return previous;
    },
    Promise.resolve({ companies: [], unavailableOrgNumbers: [] }),
  );
  return { ...checked, fetchedAt: new Date().toISOString() };
}
