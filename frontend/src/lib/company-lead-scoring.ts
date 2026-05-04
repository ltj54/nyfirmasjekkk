import type { CompanySummary, OutreachStatus, StructureSignal } from "@/lib/company-check";

export type LeadQuickFilter = "HAS_EMAIL" | "HAS_WEBSITE" | "MISSING_WEBSITE" | "NOT_SENT" | "NOT_RELEVANT";

export function getContactability(company: CompanySummary) {
  const points = [company.email, company.phone, company.website, company.contactPersonName].filter(Boolean).length;

  if (company.email) {
    return {
      label: "E-post registrert",
      shortLabel: "Kontaktbar",
      badgeClass: "rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700",
    };
  }

  if (company.phone) {
    return {
      label: "Telefon registrert, men mangler e-post",
      shortLabel: "Delvis",
      badgeClass: "rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700",
    };
  }

  if (points >= 2) {
    return {
      label: "Kontakt mulig, men krever litt manuelt arbeid",
      shortLabel: "Delvis",
      badgeClass: "rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700",
    };
  }

  return {
    label: "Svak kontaktflate i åpne data",
    shortLabel: "Svak",
    badgeClass: "rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-700",
  };
}

export function getLeadPriority(company: CompanySummary) {
  return evaluateLeadSignal(company).priority;
}

export function getBestContactPoint(company: CompanySummary) {
  return { label: evaluateLeadSignal(company).contactLabel };
}

export function getCommercialOpportunity(company: CompanySummary) {
  return evaluateLeadSignal(company).commercial;
}

export function compareLeadPriority(left: CompanySummary, right: CompanySummary) {
  const yellowEmailDifference = yellowEmailRank(left) - yellowEmailRank(right);
  if (yellowEmailDifference !== 0) {
    return yellowEmailDifference;
  }

  const emailDifference = emailRank(left) - emailRank(right);
  if (emailDifference !== 0) {
    return emailDifference;
  }

  const salesSegmentDifference = salesSegmentRank(left) - salesSegmentRank(right);
  if (salesSegmentDifference !== 0) {
    return salesSegmentDifference;
  }

  const priorityDifference = leadPriorityRank(left) - leadPriorityRank(right);
  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const structureDifference = structureSignalRank(left) - structureSignalRank(right);
  if (structureDifference !== 0) {
    return structureDifference;
  }

  const contactabilityDifference = contactabilityRank(left) - contactabilityRank(right);
  if (contactabilityDifference !== 0) {
    return contactabilityDifference;
  }

  const registrationDateLeft = left.registrationDate ? new Date(left.registrationDate).getTime() : 0;
  const registrationDateRight = right.registrationDate ? new Date(right.registrationDate).getTime() : 0;
  if (registrationDateLeft !== registrationDateRight) {
    return registrationDateRight - registrationDateLeft;
  }

  return left.name.localeCompare(right.name, "nb");
}

export function applyLeadQuickFilters(
  companies: CompanySummary[],
  outreachStatusByOrg: Record<string, OutreachStatus>,
  filters: LeadQuickFilter[],
) {
  if (filters.length === 0) {
    return companies;
  }

  return companies.filter((company) => {
    const status = outreachStatusByOrg[company.orgNumber];
    return filters.every((filter) => {
      switch (filter) {
        case "HAS_EMAIL":
          return Boolean(company.email);
        case "HAS_WEBSITE":
          return hasWebsiteSignal(company);
        case "MISSING_WEBSITE":
          return !hasWebsiteSignal(company);
        case "NOT_SENT":
          return !status?.sent;
        case "NOT_RELEVANT":
          return status?.status === "not_relevant";
      }
    });
  });
}

function hasWebsiteSignal(company: CompanySummary) {
  return Boolean(company.website);
}

export function prioritizedListStructureSignals(signals: StructureSignal[]) {
  return [...signals]
    .sort((left, right) => listStructureSignalPriority(left.code) - listStructureSignalPriority(right.code))
    .slice(0, 3);
}

export function describeListStructureSummary(signals: StructureSignal[]) {
  if (signals.some((signal) => signal.code === "POSSIBLE_REORGANIZATION")) {
    return "Tidsnære og delte aktørspor peker mot mulig ny struktur rundt eksisterende aktivitet.";
  }
  if (signals.some((signal) => signal.code === "ACTOR_CONTEXT_ELEVATED")) {
    return "Aktørkonteksten er sterk nok til å løftes som eget signal i vurderingen.";
  }
  if (signals.some((signal) => signal.code === "RECENT_BANKRUPTCY_RELATION")) {
    return "Deler aktører med nylige konkursspor i andre selskaper.";
  }
  if (signals.some((signal) => signal.code === "RECENT_DISSOLUTION_RELATION")) {
    return "Deler aktører med nylige avviklingsspor i andre selskaper.";
  }
  if (signals.some((signal) => signal.code === "CLUSTERED_NEW_COMPANY_PATTERN")) {
    return "Ligger tett i tid med andre nye selskaper med samme aktører.";
  }
  return null;
}

function evaluateLeadSignal(company: CompanySummary) {
  const hasEmail = Boolean(company.email);
  const hasPhone = Boolean(company.phone);
  const hasPossibleWebsite = company.websiteDiscovery?.status === "POSSIBLE_MATCH";
  const hasLikelyWebsite = company.websiteDiscovery?.contentMatched === true;
  const hasMismatchWebsite = company.websiteDiscovery?.verifiedReachable === true && company.websiteDiscovery?.contentMatched === false;
  const hasRegisteredUnreachableWebsite = Boolean(company.website) && company.websiteDiscovery?.status === "REGISTERED" && company.websiteDiscovery.verifiedReachable === false;
  const missingWebsite = !company.website && !hasPossibleWebsite;

  if (company.scoreColor === "RED") {
    return leadSignalResult(
      "Svakt lead",
      "Avklar risiko før salgsarbeid",
      "Avklar risiko før salgsarbeid",
      "Røde registerspor gjør dette mindre egnet som ordinært lead før dyp analyse er vurdert.",
      "Åpne analyse",
      "border-rose-100 bg-rose-50/60"
    );
  }

  if (hasRegisteredUnreachableWebsite) {
    return leadSignalResult(
      "Mulig lead",
      hasEmail ? `Start med e-post: ${company.email}` : "Registrert nettside svarer ikke",
      "Registrert nettside svarer ikke",
      "Selskapet har nettside registrert i BRREG, men den svarte ikke ved teknisk sjekk. Dette er en egen mulighet: hjelp til å få en fungerende side på plass.",
      "Se detaljer",
      "border-amber-100 bg-amber-50/70"
    );
  }

  if (company.website || hasLikelyWebsite) {
    if (company.website) {
      return leadSignalResult(
        "Svakt lead",
        "Gå via registrert nettside",
        "Har registrert nettside",
        "Selskapet har nettside registrert i BRREG. Det gjør nettsidebehovet svakere og bør sjekkes manuelt før eventuell kontakt.",
        "Se detaljer",
        "border-[#D9E2EC] bg-[#F8FAFC]"
      );
    }

    return leadSignalResult(
      "Svakt lead",
      "Sannsynlig nettside funnet, sjekk før kontakt",
      "Sannsynlig nettside funnet",
      "Kandidatdomenet svarer, og innholdet ligner på selskapet. Dette bør normalt ikke prioriteres som nettsideløst lead.",
      "Se detaljer",
      "border-[#D9E2EC] bg-[#F8FAFC]"
    );
  }

  if (missingWebsite && hasEmail) {
    return leadSignalResult(
      "Sterkt lead",
      `Start med e-post: ${company.email}`,
      "Nettside-startpakke aktuell",
      "Mangler registrert nettside og har e-post registrert i åpne data.",
      "Åpne lead",
      "border-[#C7DFF8] bg-[#F1F7FE]"
    );
  }

  if (missingWebsite && hasPhone) {
    return leadSignalResult(
      "Mulig lead",
      `Start med telefon: ${company.phone}`,
      "Mulig lead, men svakere kontaktgrunnlag",
      "Mangler registrert nettside, men har bare telefon. Fravær av e-post gjør dette mindre egnet for rask utsendelse.",
      "Se detaljer",
      "border-amber-100 bg-amber-50/70"
    );
  }

  if (hasMismatchWebsite) {
    return leadSignalResult(
      "Mulig lead",
      "Domene svarer, men kan være feiltreff",
      "Mulig feiltreff på nettside",
      "Domenet svarer, men innholdet ser ikke ut til å matche selskapet. Krever manuell kontroll før det brukes i vurderingen.",
      "Se detaljer",
      "border-amber-100 bg-amber-50/70"
    );
  }

  if (hasPossibleWebsite) {
    return leadSignalResult(
      "Mulig lead",
      "Mulig nettside funnet, må bekreftes manuelt",
      "Mulig nettside må bekreftes",
      "Ingen nettside er registrert i BRREG, men vi har funnet en mulig kandidat. Bekreft før dette behandles som sterkt lead.",
      "Se detaljer",
      "border-amber-100 bg-amber-50/70"
    );
  }

  if (missingWebsite) {
    return leadSignalResult(
      "Mulig lead",
      company.contactPersonName ? `Manuell kontakt mot ${company.contactPersonName}` : "Krever manuell research",
      "Digital tilstedeværelse mangler",
      "Ingen nettside registrert, men uten e-post blir dette mer manuelt å følge opp.",
      "Vurder lead",
      "border-amber-100 bg-amber-50/70"
    );
  }

  if (hasEmail || hasPhone) {
    return leadSignalResult(
      "Mulig lead",
      hasEmail ? `Start med e-post: ${company.email}` : `Start med telefon: ${company.phone}`,
      "Kontaktbar virksomhet",
      hasEmail
        ? "Har synlig kontaktpunkt. Vurder kvaliteten på eksisterende digital flate."
        : "Har telefon, men mangler e-post. Det gjør oppfølgingen mindre effektiv.",
      "Se kontakt",
      "border-emerald-100 bg-emerald-50/60"
    );
  }

  return leadSignalResult(
    "Svakt lead",
    "Krever manuell research",
    "Lavere lead-klarhet",
    "Svak direkte kontaktflate i åpne data.",
    "Se detaljer",
    "border-[#E4E7EB] bg-[#F8FAFC]"
  );
}

function leadSignalResult(
  label: "Sterkt lead" | "Mulig lead" | "Svakt lead",
  contactLabel: string,
  title: string,
  summary: string,
  actionLabel: string,
  cardClass: string,
) {
  return {
    priority: {
      label,
      badgeClass: leadPriorityBadgeClass(label),
    },
    contactLabel,
    commercial: {
      title,
      summary,
      actionLabel,
      cardClass,
    },
  };
}

function leadPriorityBadgeClass(label: "Sterkt lead" | "Mulig lead" | "Svakt lead") {
  if (label === "Sterkt lead") {
    return "rounded-sm bg-[#E6F0FA] px-2.5 py-1 text-[10px] font-semibold text-[#1F5FA9]";
  }
  return "rounded-sm bg-[#F0F4F8] px-2.5 py-1 text-[10px] font-semibold text-[#52606D]";
}

function leadPriorityRank(company: CompanySummary) {
  const label = getLeadPriority(company).label;
  if (label === "Sterkt lead") return 0;
  if (label === "Mulig lead") return 1;
  return 2;
}

function yellowEmailRank(company: CompanySummary) {
  return company.scoreColor === "YELLOW" && Boolean(company.email) ? 0 : 1;
}

function emailRank(company: CompanySummary) {
  return company.email ? 0 : 1;
}

function salesSegmentRank(company: CompanySummary) {
  return -(company.salesSegment?.score ?? 50);
}

function structureSignalRank(company: CompanySummary) {
  const severities = prioritizedListStructureSignals(company.structureSignals || []).map((signal) => signal.severity);
  if (severities.includes("HIGH")) return 0;
  if (severities.includes("MEDIUM")) return 1;
  if (severities.includes("INFO")) return 2;
  return 3;
}

function contactabilityRank(company: CompanySummary) {
  const label = getContactability(company).shortLabel;
  if (label === "Kontaktbar") return 0;
  if (label === "Delvis") return 1;
  return 2;
}

function listStructureSignalPriority(code: string) {
  switch (code) {
    case "POSSIBLE_REORGANIZATION":
      return 0;
    case "ACTOR_CONTEXT_ELEVATED":
      return 1;
    case "RECENT_BANKRUPTCY_RELATION":
      return 2;
    case "RECENT_DISSOLUTION_RELATION":
      return 3;
    case "BANKRUPTCY_RELATION":
      return 4;
    case "DISSOLUTION_RELATION":
      return 5;
    case "CLUSTERED_NEW_COMPANY_PATTERN":
      return 6;
    case "BO_SIGNAL":
      return 7;
    case "BANKRUPTCY_SIGNAL":
      return 8;
    case "DISSOLUTION_SIGNAL":
      return 9;
    case "ACTOR_RISK_PATTERN":
      return 10;
    case "SHARED_ACTOR_PATTERN":
      return 11;
    case "NEW_COMPANY_WINDOW":
      return 12;
    case "LIMITED_DATA_PATTERN":
      return 13;
    default:
      return 20;
  }
}
