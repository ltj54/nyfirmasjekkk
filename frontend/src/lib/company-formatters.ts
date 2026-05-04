import type { CompanyEvent, CompanySummary, OutreachStatus, StructureSignal } from "@/lib/company-check";

export function normalizeWebsiteUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function getOutreachSortValue(entry: OutreachStatus) {
  return entry.timestamp ?? entry.sentAt ?? entry.orgNumber;
}

export function getActiveContactedOutreachEntries(entries: OutreachStatus[]) {
  return getLatestOutreachEntriesByOrg(entries)
    .filter((entry) => entry.status === "sent")
    .sort((left, right) => getOutreachSortValue(right).localeCompare(getOutreachSortValue(left)));
}

export function getNotRelevantOutreachEntries(entries: OutreachStatus[]) {
  return getLatestOutreachEntriesByOrg(entries)
    .filter((entry) => entry.status === "not_relevant")
    .sort((left, right) => getOutreachSortValue(right).localeCompare(getOutreachSortValue(left)));
}

export function getLatestOutreachEntriesByOrg(entries: OutreachStatus[]) {
  const latestByOrgNumber = new Map<string, OutreachStatus>();
  const sortedEntries = [...entries].sort((left, right) => getOutreachSortValue(right).localeCompare(getOutreachSortValue(left)));

  for (const entry of sortedEntries) {
    if (!latestByOrgNumber.has(entry.orgNumber)) {
      latestByOrgNumber.set(entry.orgNumber, entry);
    }
  }

  return Array.from(latestByOrgNumber.values());
}

export function parseOutreachJsonl(jsonl: string): OutreachStatus[] {
  return jsonl
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const entry = JSON.parse(line) as Partial<OutreachStatus>;
      return {
        orgNumber: entry.orgNumber ?? "",
        sent: entry.status === "sent",
        status: entry.status ?? null,
        companyName: entry.companyName ?? null,
        organizationForm: entry.organizationForm ?? null,
        price: entry.price ?? null,
        channel: entry.channel ?? null,
        offerType: entry.offerType ?? null,
        timestamp: entry.timestamp ?? null,
        sentAt: entry.status === "sent" ? entry.timestamp ?? entry.sentAt ?? null : entry.sentAt ?? null,
        note: entry.note ?? null,
      };
    })
    .filter((entry) => /^\d{9}$/.test(entry.orgNumber));
}

export function formatLogDate(value: string | null | undefined) {
  const parts = getNorwegianDateTimeParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : "-";
}

export function formatLogDateTime(value: string | null | undefined) {
  const parts = getNorwegianDateTimeParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}` : "-";
}

function getNorwegianDateTimeParts(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("nb-NO", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute"),
  };
}

export function buildGoogleSearchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(`"${query}"`)}`;
}

export function formatRegistryFlag(value: boolean | null) {
  if (value === true) return "Registrert";
  if (value === false) return "Ikke registrert";
  return "Ukjent";
}

export function formatEmployeeCount(count: number | null, isRegistered: boolean | null) {
  if (typeof count === "number") {
    return `${count}`;
  }
  if (isRegistered === false) {
    return "Ikke rapportert";
  }
  return "Ukjent";
}

export function formatEventType(type: string) {
  switch (type) {
    case "BANKRUPTCY":
      return "Konkurs";
    case "DISSOLUTION":
      return "Tvangsoppløsning";
    case "WINDING_UP":
      return "Avvikling";
    case "ANNUAL_ACCOUNTS":
      return "Årsregnskap";
    case "REGISTRATION":
      return "Registrering";
    case "ADDRESS_CHANGE":
      return "Adresseendring";
    case "ARTICLES_OF_ASSOCIATION":
      return "Vedtekter";
    default:
      return type.replaceAll("_", " ").toLowerCase();
  }
}

export function formatEventSeverity(severity: CompanyEvent["severity"]) {
  switch (severity) {
    case "HIGH":
      return "Høy alvorlighet";
    case "MEDIUM":
      return "Middels alvorlighet";
    case "INFO":
      return "Informasjon";
  }
}

export function formatEventDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const norwegianDateMatch = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (norwegianDateMatch) {
    const [, day, month, year] = norwegianDateMatch;
    return `${year}-${month}-${day}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
}

export function eventSeverityClassName(severity: CompanyEvent["severity"]) {
  switch (severity) {
    case "HIGH":
      return "bg-rose-50 text-rose-700";
    case "MEDIUM":
      return "bg-amber-50 text-amber-700";
    case "INFO":
      return "bg-slate-100 text-slate-700";
  }
}

export function formatRoleType(roleType: string) {
  switch (roleType) {
    case "DAGLIG_LEDER":
      return "Daglig leder";
    case "STYRELEDER":
      return "Styreleder";
    case "STYREMEDLEM":
      return "Styremedlem";
    default:
      return roleType.replaceAll("_", " ").toLowerCase();
  }
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatNokPrice(value: number) {
  return new Intl.NumberFormat("nb-NO").format(value);
}

export function stripWebsiteProtocol(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function formatWebsiteConfidence(confidence: "HIGH" | "MEDIUM" | "LOW") {
  switch (confidence) {
    case "HIGH":
      return "Høy";
    case "MEDIUM":
      return "Middels";
    case "LOW":
      return "Lav";
  }
}

export function formatWebsiteVerification(websiteDiscovery: NonNullable<CompanySummary["websiteDiscovery"]>) {
  if (websiteDiscovery.verifiedReachable === true) {
    return "Kandidaten svarte ved sjekk";
  }
  if (websiteDiscovery.verifiedReachable === false) {
    return "Kandidaten svarte ikke ved sjekk";
  }
  return "Kandidaten er ikke verifisert";
}

export function formatWebsiteContentMatch(websiteDiscovery: NonNullable<CompanySummary["websiteDiscovery"]>) {
  if (websiteDiscovery.contentMatched === true) {
    return "innholdet ligner på selskapet";
  }
  if (websiteDiscovery.verifiedReachable === true) {
    return "ingen tydelig kobling funnet i innholdet";
  }
  return "innhold ikke sjekket";
}

export function websiteCandidateRows(websiteDiscovery: NonNullable<CompanySummary["websiteDiscovery"]>) {
  if (websiteDiscovery.candidateChecks?.length) {
    return websiteDiscovery.candidateChecks;
  }

  return websiteDiscovery.candidates.map((url) => ({
    url,
    reachable: null,
    contentMatched: null,
    pageTitle: null,
    reason: null,
  }));
}

export function formatWebsiteCandidateStatus(candidate: ReturnType<typeof websiteCandidateRows>[number]) {
  if (candidate.contentMatched === true) {
    return "Svarte, innhold ligner";
  }
  if (candidate.reachable === true) {
    return "Svarte, må vurderes";
  }
  if (candidate.reachable === false) {
    return "Svarte ikke";
  }
  return "Ikke sjekket i listevisning";
}

export function websiteDiscoveryExplanationItems(
  websiteDiscovery: NonNullable<CompanySummary["websiteDiscovery"]>,
  companyName: string,
) {
  const items: string[] = [];
  const candidate = websiteDiscovery.verifiedCandidate ?? websiteDiscovery.candidates[0];

  if (websiteDiscovery.source === "EMAIL_DOMAIN") {
    items.push(`Kandidaten ${stripWebsiteProtocol(candidate)} er laget fra domenet i registrert e-postadresse.`);
  } else if (websiteDiscovery.source === "NAME_HEURISTIC") {
    items.push(`Kandidatene er laget fra selskapsnavnet "${companyName}" etter at selskapsform og spesialtegn er fjernet.`);
  } else {
    items.push("Kandidaten kommer fra registrerte eller avledede selskapsdata.");
  }

  if (websiteDiscovery.candidates.length > 1) {
    items.push(`Systemet vurderte ${websiteDiscovery.candidates.length} mulige domener og viser dem i prioritert rekkefølge.`);
  }

  if (websiteDiscovery.candidateChecks?.length) {
    const reachableCount = websiteDiscovery.candidateChecks.filter((candidate) => candidate.reachable === true).length;
    items.push(`På detaljsiden ble alle ${websiteDiscovery.candidateChecks.length} kandidatene teknisk sjekket. ${reachableCount} svarte.`);
  }

  if (websiteDiscovery.verifiedReachable === true) {
    items.push("Domenet svarte på teknisk sjekk med HTTP HEAD eller GET.");
  } else if (websiteDiscovery.verifiedReachable === false) {
    items.push("Domenet svarte ikke på teknisk sjekk innen tidsfristen.");
  }

  if (websiteDiscovery.pageTitle) {
    items.push(`Sidetittelen som ble lest var: "${websiteDiscovery.pageTitle}".`);
  }

  if (websiteDiscovery.contentMatched === true) {
    items.push("Innholdet på siden hadde tydelig kobling til selskapsnavnet eller domenet.");
  } else if (websiteDiscovery.verifiedReachable === true) {
    items.push("Siden svarte, men innholdssjekken fant ikke tydelig kobling til selskapsnavnet eller e-postdomenet.");
  }

  if (websiteDiscovery.confidence === "HIGH") {
    items.push("Sikkerheten er høy fordi både kilde og innhold gir tydelige positive signaler.");
  } else if (websiteDiscovery.confidence === "MEDIUM") {
    items.push("Sikkerheten er middels fordi domenet svarer, men koblingen må fortsatt bekreftes manuelt.");
  } else {
    items.push("Sikkerheten er lav fordi koblingen ikke er bekreftet godt nok.");
  }

  return items;
}

export function describeStructureSignal(signal: StructureSignal) {
  switch (signal.code) {
    case "ACTOR_CONTEXT_ELEVATED":
      return "Dette brukes når aktørhistorikken er sterk nok til å være et eget signal, ikke bare bakgrunnsstøy i nettverksdelen.";
    case "RECENT_BANKRUPTCY_RELATION":
      return "Dette er et tidsnært kryssselskapsmønster, ikke bare et generelt historisk faresignal.";
    case "RECENT_DISSOLUTION_RELATION":
      return "Dette peker på nærhet i tid mellom nytt selskap og tidligere avviklingsspor hos de samme aktørene.";
    case "CLUSTERED_NEW_COMPANY_PATTERN":
      return "Flere nye selskaper på kort tid med samme aktører bør leses som strukturmønster, ikke som enkeltstående oppslag.";
    case "POSSIBLE_REORGANIZATION":
      return "Dette er en heuristisk vurdering som bør undersøkes sammen med nettverk, hendelser og registreringsdatoer.";
    default:
      return null;
  }
}

export function estimateListProgress(elapsedMs: number) {
  if (elapsedMs <= 4000) {
    return 12 + (elapsedMs / 4000) * 33;
  }
  if (elapsedMs <= 15000) {
    return 45 + ((elapsedMs - 4000) / 11000) * 30;
  }
  if (elapsedMs <= 45000) {
    return 75 + ((elapsedMs - 15000) / 30000) * 15;
  }
  return 90;
}

export function structureSignalSeverityClassName(severity: "HIGH" | "MEDIUM" | "INFO") {
  if (severity === "HIGH") {
    return "bg-rose-50 text-rose-700";
  }
  if (severity === "MEDIUM") {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-slate-100 text-slate-700";
}

export function formatStructureSignalSeverity(severity: "HIGH" | "MEDIUM" | "INFO") {
  if (severity === "HIGH") {
    return "Høy relevans";
  }
  if (severity === "MEDIUM") {
    return "Middels relevans";
  }
  return "Til orientering";
}

export function listStructureSignalClassName(severity: "HIGH" | "MEDIUM" | "INFO") {
  if (severity === "HIGH") {
    return "bg-rose-50 text-rose-700";
  }
  if (severity === "MEDIUM") {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-sky-50 text-sky-700";
}
