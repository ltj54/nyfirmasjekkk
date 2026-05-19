import type { CompanySummary } from "@/lib/company-check";

type OutreachEmailCompany = Pick<
  CompanySummary,
  | "name"
  | "organizationForm"
  | "orgNumber"
  | "contactPersonName"
  | "email"
  | "phone"
  | "municipality"
  | "county"
  | "naceCode"
  | "naceDescription"
  | "salesSegment"
  | "website"
  | "websiteDiscovery"
  | "websiteQuality"
>;

export function buildOutreachEmailSubject(markdown: string, company: OutreachEmailCompany) {
  const template = isRegisteredWebsiteUnavailable(company)
    ? extractMailSubject(markdown, "E-postmal - registrert nettside svarer ikke") ?? "Nettsiden til {{companyName}}?"
    : hasWebsiteQualityOpportunity(company)
      ? extractMailSubject(markdown, "E-postmal - nettside kan forbedres") ?? "Nettsiden til {{companyName}}?"
    : extractMailSubject(markdown) ?? "Nettside for {{companyName}}?";
  return applyOutreachTemplate(template, company);
}

export function buildOutreachEmailBody(markdown: string, company: OutreachEmailCompany) {
  const template = isRegisteredWebsiteUnavailable(company)
    ? extractMarkdownSection(markdown, "E-postmal - registrert nettside svarer ikke") ?? defaultRegisteredWebsiteUnavailableEmailTemplate()
    : hasWebsiteQualityOpportunity(company)
      ? extractMarkdownSection(markdown, "E-postmal - nettside kan forbedres") ?? defaultWebsiteQualityOpportunityEmailTemplate()
    : extractMarkdownSection(markdown, "E-postmal") ?? defaultOutreachEmailTemplate();
  const cleanedTemplate = template.replace(/^Emne:\s*`?.+`?\s*$/m, "").trim();
  return applyOutreachTemplate(cleanedTemplate, company);
}

export function websiteQualityMailLine(company: OutreachEmailCompany) {
  const signals = company.websiteQuality?.signals ?? [];
  const signalCodes = new Set(signals.map((signal) => signal.code));
  if (signalCodes.has("THIRD_PARTY_SURFACE")) {
    return "Sosiale medier fungerer fint som kanal, men en fast nettside gir ofte et mer ryddig sted å samle kontaktinfo, tjenester og praktisk informasjon.";
  }

  const toneProfile = websiteQualityToneProfile(company);
  const mediumCodes = new Set(signals.filter((signal) => signal.severity === "MEDIUM").map((signal) => signal.code));
  const mediumPoints = websiteQualityMailPoints(mediumCodes, toneProfile);
  const fallbackPoints = websiteQualityMailPoints(signalCodes, toneProfile);
  const points = mediumPoints.length > 0 ? mediumPoints : fallbackPoints;

  if (points.length === 0) {
    return "";
  }

  const introduction = signalCodes.has("MEDICAL_VISUAL_TRUST_RISK") || signalCodes.has("MEDICAL_REGULATORY_STATUS")
    ? "Siden fremstår visuelt gjennomarbeidet, men siden dette er medisinsk/kirurgisk teknologi ville jeg vært ekstra nøye med"
    : "Siden ser ut til å være på plass, men jeg la merke til et par punkter som kan være verdt å se på";

  return `${introduction}: ${formatNorwegianList(points.slice(0, toneProfile.maxMailPoints))}.`;
}

export function websiteComplianceMailLine(company: OutreachEmailCompany) {
  const signalCodes = new Set(company.websiteQuality?.signals.map((signal) => signal.code) ?? []);
  const toneProfile = websiteQualityToneProfile(company);
  const hasComplianceSignal = [
    "MISSING_PRIVACY_NOTICE",
    "COOKIE_CONSENT_RISK",
    "FORM_LABEL_RISK",
    "EMPTY_BUTTON_RISK",
    "MISSING_LANGUAGE",
    "IMAGE_ALT_RISK",
    "MANY_EXTERNAL_SCRIPTS",
    "EXTERNAL_IFRAME_RISK",
    "SENSITIVE_HEALTH_CONTEXT",
    "MEDICAL_REGULATORY_STATUS",
    "MEDICAL_REGULATORY_CONTEXT_MISSING",
    "MEDICAL_VISUAL_TRUST_RISK",
    "HEALTH_TRACKING_CONTEXT",
  ].some((code) => signalCodes.has(code));

  if (signalCodes.has("THIRD_PARTY_SURFACE") && !signalCodes.has("SENSITIVE_HEALTH_CONTEXT")) {
    return "";
  }

  if (!hasComplianceSignal) {
    return "";
  }

  return toneProfile.complianceLine;
}

function websiteQualityMailPoints(signalCodes: Set<string>, toneProfile: WebsiteQualityToneProfile) {
  const points: string[] = [];

  addMailPoint(points, signalCodes.has("WEAK_HOMEPAGE_STRUCTURE") || signalCodes.has("THIN_CONTENT"), toneProfile.homepagePoint);
  addMailPoint(points, signalCodes.has("WEAK_INDUSTRY_RELEVANCE") || signalCodes.has("GENERIC_SERVICE_TEXT"), toneProfile.servicePoint);
  addMailPoint(points, signalCodes.has("MISSING_LOCAL_RELEVANCE") || signalCodes.has("MISSING_ADDRESS_OR_AREA"), toneProfile.localPoint);
  addMailPoint(points, signalCodes.has("WEAK_CONTACT_POINT") || signalCodes.has("CONTACT_DETAILS_NOT_VISIBLE") || signalCodes.has("WEAK_CALL_TO_ACTION"), toneProfile.contactPoint);
  addMailPoint(points, signalCodes.has("MISSING_ORG_NUMBER") || signalCodes.has("LEGAL_NAME_NOT_VISIBLE") || signalCodes.has("DOMAIN_NAME_MISMATCH") || signalCodes.has("EMAIL_DOMAIN_MISMATCH"), toneProfile.trustPoint);
  addMailPoint(points, signalCodes.has("MISSING_META_DESCRIPTION") || signalCodes.has("WEAK_TITLE") || signalCodes.has("WEAK_SHARE_PREVIEW"), toneProfile.searchPoint);
  addMailPoint(points, signalCodes.has("MISSING_VIEWPORT") || signalCodes.has("FIXED_WIDTH_LAYOUT"), "en ekstra sjekk av mobiloppsett og teknisk responsivitet");
  addMailPoint(points, signalCodes.has("IMAGE_ALT_RISK") || signalCodes.has("FORM_LABEL_RISK") || signalCodes.has("EMPTY_BUTTON_RISK") || signalCodes.has("MISSING_LANGUAGE"), toneProfile.accessibilityPoint);
  addMailPoint(
    points,
    signalCodes.has("SENSITIVE_HEALTH_CONTEXT")
      || signalCodes.has("MEDICAL_REGULATORY_STATUS")
      || signalCodes.has("MEDICAL_REGULATORY_CONTEXT_MISSING")
      || toneProfile.strictness === "strict",
    toneProfile.sensitivePoint
  );
  addMailPoint(points, signalCodes.has("MEDICAL_VISUAL_TRUST_RISK"), "tydeligere skille mellom faktiske produktbilder, illustrasjoner og dokumentasjon");
  addMailPoint(points, signalCodes.has("HEAVY_PRODUCT_ANIMATION"), "at tung bilde-/scrollanimasjon ikke tar fokus bort fra dokumentasjon og tillit");
  addMailPoint(points, signalCodes.has("MISSING_PRIVACY_NOTICE") || signalCodes.has("COOKIE_CONSENT_RISK"), toneProfile.privacyPoint);
  addMailPoint(points, signalCodes.has("HEALTH_TRACKING_CONTEXT"), "ekstra ryddighet rundt analyse, tracking og samtykke");
  addMailPoint(points, signalCodes.has("MIXED_CONTENT_RISK") || signalCodes.has("MANY_EXTERNAL_SCRIPTS") || signalCodes.has("EXTERNAL_IFRAME_RISK"), "noen tekniske avhengigheter som bør vurderes");
  addMailPoint(points, signalCodes.has("MISSING_HTTPS") || signalCodes.has("OUTDATED_COPYRIGHT"), toneProfile.maintenancePoint);
  addMailPoint(points, signalCodes.has("NON_NO_DOMAIN"), "vurdering av en tydeligere norsk nettadresse");
  addMailPoint(points, signalCodes.has("THIRD_PARTY_SURFACE"), "samling av informasjonen på en egen nettside");

  return points;
}

type WebsiteQualityStrictness = "strict" | "commerce" | "normal" | "light";

type WebsiteQualityToneProfile = {
  strictness: WebsiteQualityStrictness;
  maxMailPoints: number;
  homepagePoint: string;
  servicePoint: string;
  localPoint: string;
  contactPoint: string;
  trustPoint: string;
  searchPoint: string;
  accessibilityPoint: string;
  sensitivePoint: string;
  privacyPoint: string;
  maintenancePoint: string;
  complianceLine: string;
};

const normalWebsiteToneProfile: WebsiteQualityToneProfile = {
  strictness: "normal",
  maxMailPoints: 2,
  homepagePoint: "tydeligere førsteside og forklaring av hva dere tilbyr",
  servicePoint: "tydeligere beskrivelse av tjenester eller aktivitet",
  localPoint: "tydeligere lokal synlighet og område dere dekker",
  contactPoint: "klarere kontaktpunkt og enklere vei til henvendelse",
  trustPoint: "flere tillitssignaler som gjør siden lettere å kjenne igjen",
  searchPoint: "ryddigere visning i Google, e-post og ved deling",
  accessibilityPoint: "noen enkle tilgjengelighetspunkter som bør sjekkes",
  sensitivePoint: "ekstra ryddighet rundt personvern og skjema fordi siden berører et mer tillitsbasert fagområde",
  privacyPoint: "personvern- og samtykketekst der siden samler inn eller måler data",
  maintenancePoint: "noen tekniske eller vedlikeholdsmessige punkter som kan svekke inntrykket",
  complianceLine: "Personvern, skjema og tilgjengelighet er også tillitspunkter som kan være lurt å ha ryddig.",
};

function websiteQualityToneProfile(company: OutreachEmailCompany): WebsiteQualityToneProfile {
  const segmentCode = company.salesSegment?.code;
  const naceCode = company.naceCode?.trim() ?? "";
  if (segmentCode === "HELSE_VELVAERE" || naceCode.startsWith("86") || naceCode.startsWith("88") || naceCode === "96.040") {
    return {
      ...normalWebsiteToneProfile,
      strictness: "strict",
      servicePoint: "tydelig beskrivelse av behandlinger, timer og hva kunden kan forvente",
      contactPoint: "tryggere og mer forklarende kontakt- eller bookingflyt",
      trustPoint: "tydeligere ansvarlig virksomhet og tillitssignaler",
      accessibilityPoint: "skjema og tilgjengelighet, siden slike detaljer betyr mer i tillitsbaserte tjenester",
      sensitivePoint: "ekstra ryddighet rundt personvern og skjema fordi siden berører helse, behandling eller personopplysninger",
      privacyPoint: "personvern og hvordan skjemaopplysninger behandles",
      complianceLine: "For virksomheter innen helse og velvære er det også viktig at kontaktskjema, personvern og informasjonsinnhenting er ryddig.",
    };
  }
  if (segmentCode === "BUTIKK_LOKALHANDEL" || naceCode.startsWith("47")) {
    return {
      ...normalWebsiteToneProfile,
      strictness: "commerce",
      homepagePoint: "tydeligere produkter, åpningstider og hvordan kunder kan handle eller ta kontakt",
      servicePoint: "tydeligere produkt- eller varepresentasjon",
      contactPoint: "klarere kjøpsvei, kontaktpunkt eller forespørselsmulighet",
      trustPoint: "flere tillitssignaler rundt butikken og hvem kunden handler med",
      privacyPoint: "personvern, cookies og praktiske kjøpsvilkår der kunder kan handle eller sende forespørsel",
      complianceLine: "For butikk og netthandel bør kontaktinfo, kjøpsvilkår, levering, retur, personvern og cookies være lett å finne.",
    };
  }
  if (segmentCode === "MAT_SERVERING" || naceCode.startsWith("56")) {
    return {
      ...normalWebsiteToneProfile,
      homepagePoint: "tydeligere meny, åpningstider og hvordan gjester finner eller kontakter dere",
      servicePoint: "tydeligere presentasjon av mat, servering eller bestilling",
      localPoint: "tydeligere adresse, kart og lokal synlighet",
      contactPoint: "enklere vei til bordbestilling, bestilling eller kontakt",
      complianceLine: "For servering bør meny, åpningstider, sted og kontakt være lett å finne.",
    };
  }
  if (segmentCode === "KONSULENT" || ["62", "63", "69", "70", "71", "72", "74"].some((prefix) => naceCode.startsWith(prefix))) {
    return {
      ...normalWebsiteToneProfile,
      homepagePoint: "tydeligere førsteside som raskt forklarer hvem dere hjelper og med hva",
      servicePoint: "tydeligere kompetanse, tjenester og hvem tilbudet passer for",
      trustPoint: "flere tillitssignaler rundt kompetanse, fagområde og ansvarlig virksomhet",
      searchPoint: "ryddigere faglig presentasjon i Google, e-post og ved deling",
      complianceLine: "For fag- og konsulenttjenester handler siden ofte mest om tillit, kompetanse og en enkel vei til kontakt.",
    };
  }
  if (segmentCode === "FORENING_KLUBB" || naceCode.startsWith("94")) {
    return {
      ...normalWebsiteToneProfile,
      strictness: "light",
      homepagePoint: "tydeligere aktivitet, kontaktpersoner og praktisk informasjon",
      servicePoint: "tydeligere informasjon om aktivitet, arrangementer eller medlemskap",
      contactPoint: "enklere vei til kontaktpersoner eller påmelding",
      trustPoint: "tydeligere avsender og hvem som står bak aktiviteten",
      complianceLine: "For foreninger og klubber bør aktivitet, kontaktpersoner og praktisk informasjon være lett å finne.",
    };
  }
  if (["HANDVERK", "RENHOLD_OG_DRIFT", "HAGE_OG_GRONTANLEGG", "TRANSPORT"].includes(segmentCode ?? "")) {
    return {
      ...normalWebsiteToneProfile,
      strictness: "light",
      homepagePoint: "en tydeligere førsteside som raskt viser tjenester og kontakt",
      servicePoint: "tydeligere tjenester og hva kunder kan be om hjelp til",
      localPoint: "tydeligere område dere dekker og lokal synlighet",
      contactPoint: "klarere kontaktpunkt for befaring, tilbud eller bestilling",
      complianceLine: "For lokale tjenester er tydelig telefonnummer, område og vei til forespørsel ofte viktigere enn mye tekst.",
    };
  }
  return normalWebsiteToneProfile;
}

function addMailPoint(points: string[], include: boolean, point: string) {
  if (include && !points.includes(point)) {
    points.push(point);
  }
}

function formatNorwegianList(items: string[]) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }
  if (items.length === 2) {
    return `${items[0]} og ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")} og ${items.at(-1)}`;
}

export function buildOutreachEmailHtml(body: string) {
  const lines = body.split(/\r?\n/);
  const parts: string[] = [];
  let listOpen = false;

  function closeList() {
    if (!listOpen) {
      return;
    }
    parts.push("</ul>");
    listOpen = false;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (!line) {
      closeList();
      continue;
    }

    if (line.startsWith("- ")) {
      if (!listOpen) {
        parts.push('<ul style="margin: 8px 0 14px 20px; padding: 0;">');
        listOpen = true;
      }
      parts.push(`<li style="margin: 4px 0;">${escapeHtml(line.slice(2))}</li>`);
      continue;
    }

    closeList();

    const signatureBlock = collectSignatureBlock(lines, index);
    if (signatureBlock.length > 0) {
      parts.push(
        `<p style="margin: 0 0 14px;">${signatureBlock.map((signatureLine) => renderInlineHtml(signatureLine)).join("<br>")}</p>`
      );
      index += signatureBlock.length - 1;
      continue;
    }

    const nextLine = lines[index + 1]?.trim() ?? "";
    if ((line === "Se eksempel her:" || line === "Eksempel på enkel side:" || line === "Eksempel:") && isHttpUrl(nextLine)) {
      parts.push(
        `<p style="margin: 0 0 14px;">${escapeHtml(line)} <a href="${escapeHtml(nextLine)}" style="color: #1F5FA9;">Se eksempel</a></p>`
      );
      index += 1;
      continue;
    }

    if (isEmailAddress(line)) {
      parts.push(
        `<p style="margin: 0 0 14px;"><a href="mailto:${escapeHtml(line)}" style="color: #1F5FA9;">${escapeHtml(line)}</a></p>`
      );
      continue;
    }

    if (isHttpUrl(line)) {
      parts.push(
        `<p style="margin: 0 0 14px;"><a href="${escapeHtml(line)}" style="color: #1F5FA9;">${escapeHtml(line)}</a></p>`
      );
      continue;
    }

    parts.push(`<p style="margin: 0 0 14px;">${escapeHtml(line)}</p>`);
  }

  closeList();

  return `<div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.55; color: #1F2933;">${parts.join("")}</div>`;
}

function collectSignatureBlock(lines: string[], startIndex: number) {
  if (lines[startIndex]?.trim() !== "Mvh") {
    return [];
  }

  const block: string[] = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      continue;
    }
    block.push(line);
  }
  return block;
}

function renderInlineHtml(line: string) {
  if (isEmailAddress(line)) {
    return `<a href="mailto:${escapeHtml(line)}" style="color: #1F5FA9;">${escapeHtml(line)}</a>`;
  }
  if (isHttpUrl(line)) {
    return `<a href="${escapeHtml(line)}" style="color: #1F5FA9;">${escapeHtml(line)}</a>`;
  }
  return escapeHtml(line);
}

function extractMailSubject(markdown: string, heading = "E-postmal") {
  const section = extractMarkdownSection(markdown, heading);
  if (!section) {
    return null;
  }

  const match = section.match(/Emne:\s*`?([^\n`]+)`?/);
  return match?.[1]?.trim() ?? null;
}

function extractMarkdownSection(markdown: string, heading: string) {
  const marker = `## ${heading}`;
  const startIndex = markdown.indexOf(marker);
  if (startIndex < 0) {
    return null;
  }

  const contentStart = startIndex + marker.length;
  const remaining = markdown.slice(contentStart).trimStart();
  const nextHeadingIndex = remaining.search(/\n##\s+/);
  return (nextHeadingIndex >= 0 ? remaining.slice(0, nextHeadingIndex) : remaining).trim();
}

function applyOutreachTemplate(template: string, company: OutreachEmailCompany) {
  const displayName = displayCompanyName(company);
  const contactName = company.contactPersonName?.trim() || "";
  const greeting = contactName ? firstNameFromContactName(contactName) : `dere i ${displayName}`;
  const location = [company.municipality, company.county].filter(Boolean).join(", ");
  const recipientSubject = contactName ? "du" : "dere";
  const recipientPossessive = contactName ? "ditt" : "deres";
  const recipientObject = contactName ? "deg" : "dere";
  const recipientPagePossessive = contactName ? "din" : "deres";

  const replacements: Record<string, string> = {
    "{{companyName}}": displayName,
    "{{registeredCompanyName}}": company.name,
    "{{orgNumber}}": company.orgNumber,
    "{{contactPerson}}": contactName,
    "{{companyEmail}}": company.email?.trim() || "",
    "{{companyPhone}}": company.phone?.trim() || "",
    "{{location}}": location,
    "{{naceCode}}": company.naceCode?.trim() || "",
    "{{naceDescription}}": company.naceDescription?.trim() || "",
    "{{salesSegment}}": company.salesSegment?.label ?? "Annet",
    "{{salesSegmentPitch}}": company.salesSegment?.emailPitch ?? "For nye virksomheter er en nettside nyttig for å vise hva dere tilbyr, hvem dere hjelper og hvordan kunder kan ta kontakt.",
    "{{salesSegmentExplanation}}": company.salesSegment?.explanation ?? "",
    "{{domainExample}}": domainExampleForCompany(company.name),
    "{{domainLine}}": domainLineForCompany(company),
    "{{greeting}}": greeting,
    "{{recipientSubject}}": recipientSubject,
    "{{recipientPossessive}}": recipientPossessive,
    "{{recipientObject}}": recipientObject,
    "{{recipientPagePossessive}}": recipientPagePossessive,
    "{{price}}": "1.990",
    "{{senderName}}": "Lars Johannessen",
    "{{senderPhone}}": "977 24 209",
    "{{senderEmail}}": "kontakt@ltj-production.no",
    "{{senderWebsite}}": "https://ltj-production.no/",
    "{{registeredWebsite}}": company.website?.trim() || "",
    "{{registeredWebsiteIntro}}": registeredWebsiteIntro(company),
    "{{websiteQualitySummary}}": company.websiteQuality?.summary ?? "",
    "{{websiteQualityMailLine}}": websiteQualityMailLine(company),
    "{{websiteComplianceMailLine}}": websiteComplianceMailLine(company),
  };

  let nextText = template;
  for (const [key, value] of Object.entries(replacements)) {
    nextText = nextText.replaceAll(key, value);
  }

  return nextText
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function defaultWebsiteQualityOpportunityEmailTemplate() {
  return `Hei {{greeting}},

{{registeredWebsiteIntro}}

Jeg tok en rask titt og ser at siden allerede er på plass. Samtidig kan det kanskje være mulig å gjøre presentasjonen litt tydeligere for nye kunder.

Jeg lager nettsider med tydelig presentasjon av tjenester, kontaktinfo og en løsning som fungerer godt på mobil.
{{websiteQualityMailLine}}
{{websiteComplianceMailLine}}

Jeg kan gjerne sende et konkret forslag til hvordan siden kan gjøres mer oversiktlig.

Eksempel:
{{senderWebsite}}

Mvh
{{senderName}}
{{senderPhone}}
{{senderEmail}}`;
}

function defaultRegisteredWebsiteUnavailableEmailTemplate() {
  return `Hei {{greeting}},

Jeg så at {{companyName}} har registrert nettsiden {{registeredWebsite}}.

Da jeg sjekket den, fikk jeg ikke kontakt med siden. Det kan selvfølgelig være midlertidig, men jeg ville bare gi en liten beskjed.

Hvis dere trenger hjelp, kan jeg sette opp eller rydde opp i en nettside med kontaktinfo, kort presentasjon og god mobilvisning.

Eksempel:
{{senderWebsite}}

Jeg kan gjerne ta en rask sjekk og sende et konkret forslag.

Mvh
{{senderName}}
{{senderPhone}}
{{senderEmail}}`;
}

function isRegisteredWebsiteUnavailable(company: OutreachEmailCompany) {
  return Boolean(company.website)
    && company.websiteDiscovery?.status === "REGISTERED"
    && company.websiteDiscovery.verifiedReachable === false;
}

function hasWebsiteQualityOpportunity(company: OutreachEmailCompany) {
  return Boolean(company.website)
    && company.websiteDiscovery?.status === "REGISTERED"
    && company.websiteDiscovery.verifiedReachable !== false
    && (company.websiteQuality?.status === "WEAK" || company.websiteQuality?.status === "NEEDS_REVIEW");
}

function defaultOutreachEmailTemplate() {
  return `Hei {{greeting}},

Jeg kom over {{companyName}} og så at jeg ikke fant noen tydelig nettside registrert.

{{salesSegmentPitch}}

Jeg lager ryddige nettsider for nye virksomheter, med kontaktinfo, kort presentasjon og en løsning som fungerer godt på mobil.

Du får:
- En nettside klar til bruk
{{domainLine}}
- Kontaktinfo og kort presentasjon av tjenester/aktivitet
- Kontaktskjema eller tydelig kontaktvei

Eksempel:
{{senderWebsite}}

Jeg kan sende et konkret forslag til {{recipientPagePossessive}} side, helt uforpliktende.

Mvh
{{senderName}}
{{senderPhone}}
{{senderEmail}}`;
}

function firstNameFromContactName(value: string) {
  return value.split(/\s+/)[0] ?? value;
}

function displayCompanyName(company: Pick<OutreachEmailCompany, "name" | "organizationForm">) {
  const name = company.name.trim();
  const organizationForm = company.organizationForm?.trim().toUpperCase() ?? "";
  if (!organizationForm || new RegExp(`\\b${escapeRegExp(organizationForm)}\\b`, "i").test(name)) {
    return name;
  }
  return `${name} ${organizationForm}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function domainExampleForCompany(companyName: string) {
  const suffixes = [
    "aksjeselskap",
    "enkeltpersonforetak",
    "as",
    "asa",
    "enk",
    "da",
    "ans",
    "nuf",
    "sa",
    "stift",
    "fli",
    "ba",
  ];
  const namePart = companyName.split(/\s+-\s+/)[0] || companyName;
  const normalized = namePart
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "o")
    .replaceAll("å", "a")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("&", " og ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((part) => part && !suffixes.includes(part))
    .slice(0, 4)
    .join("-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${normalized || "firmanavn"}.no`;
}

function domainLineForCompany(company: OutreachEmailCompany) {
  if (company.website?.trim()) {
    if (company.websiteDiscovery?.verifiedReachable === false) {
      return `- Ryddig bruk av domenet ${stripWebsiteForMail(company.website.trim())}`;
    }
    if (company.websiteQuality?.signals.some((signal) => signal.code === "THIRD_PARTY_SURFACE")) {
      return "- En fast nettside i tillegg til Instagram/Facebook";
    }
    return "- En mer ryddig og tydelig nettside på dagens domene";
  }
  return `- Egen nettadresse, for eksempel ${domainExampleForCompany(company.name)}`;
}

function registeredWebsiteIntro(company: OutreachEmailCompany) {
  const website = company.website?.trim() || "";
  const signalCodes = new Set(company.websiteQuality?.signals.map((signal) => signal.code) ?? []);

  if (signalCodes.has("THIRD_PARTY_SURFACE")) {
    return `Jeg så at dere bruker ${website} som digital flate.`;
  }

  return `Jeg så at dere har nettsiden ${website} registrert i BRREG.`;
}

function stripWebsiteForMail(website: string) {
  return website.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/g, "");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function isHttpUrl(value: string) {
  return /^https?:\/\/\S+$/i.test(value);
}

function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
