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
  const signalCodes = new Set(company.websiteQuality?.signals.map((signal) => signal.code) ?? []);
  if (signalCodes.has("THIRD_PARTY_SURFACE")) {
    return "Det kan fungere fint, men en egen nettside gir dere et fast sted for åpningstider, tjenester, kontaktinfo og praktisk informasjon - også for kunder som ikke bruker Instagram/Facebook.";
  }

  const points = websiteQualityMailPoints(signalCodes);

  if (points.length === 0) {
    return "";
  }

  return `Uten å gjøre dette til en full teknisk gjennomgang, ser jeg noen områder som kan være verdt å gjøre tydeligere: ${formatNorwegianList(points.slice(0, 3))}.`;
}

export function websiteComplianceMailLine(company: OutreachEmailCompany) {
  const signalCodes = new Set(company.websiteQuality?.signals.map((signal) => signal.code) ?? []);
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
  ].some((code) => signalCodes.has(code));

  if (signalCodes.has("THIRD_PARTY_SURFACE") && !signalCodes.has("SENSITIVE_HEALTH_CONTEXT")) {
    return "";
  }

  if (!hasComplianceSignal) {
    return "";
  }

  if (signalCodes.has("SENSITIVE_HEALTH_CONTEXT")) {
    return "Jeg kan ikke si at dette bryter noen regler uten en full gjennomgang, men når en side berører helse, journal, pasienter eller behandling, ville jeg vært ekstra nøye med personvern, skjema og hvordan opplysninger håndteres.";
  }

  return "Jeg kan ikke si at dette bryter noen regler uten en full gjennomgang, men personvern, skjema og tilgjengelighet er også punkter jeg ville ryddet opp i når siden først oppdateres.";
}

function websiteQualityMailPoints(signalCodes: Set<string>) {
  const points: string[] = [];

  addMailPoint(points, signalCodes.has("WEAK_HOMEPAGE_STRUCTURE") || signalCodes.has("THIN_CONTENT"), "tydeligere førsteside og forklaring av hva dere tilbyr");
  addMailPoint(points, signalCodes.has("WEAK_INDUSTRY_RELEVANCE"), "bedre kobling mellom nettsideteksten og bransjen dere er registrert med");
  addMailPoint(points, signalCodes.has("MISSING_LOCAL_RELEVANCE"), "tydeligere lokal synlighet og område dere dekker");
  addMailPoint(points, signalCodes.has("WEAK_CONTACT_POINT") || signalCodes.has("WEAK_CALL_TO_ACTION"), "klarere kontaktpunkt og enklere vei til henvendelse");
  addMailPoint(points, signalCodes.has("MISSING_ORG_NUMBER") || signalCodes.has("DOMAIN_NAME_MISMATCH"), "flere tillitssignaler som gjør siden lettere å kjenne igjen");
  addMailPoint(points, signalCodes.has("MISSING_META_DESCRIPTION") || signalCodes.has("WEAK_TITLE") || signalCodes.has("WEAK_SHARE_PREVIEW"), "ryddigere visning i Google, e-post og ved deling");
  addMailPoint(points, signalCodes.has("MISSING_VIEWPORT") || signalCodes.has("FIXED_WIDTH_LAYOUT"), "bedre mobiltilpasning");
  addMailPoint(points, signalCodes.has("IMAGE_ALT_RISK") || signalCodes.has("FORM_LABEL_RISK") || signalCodes.has("EMPTY_BUTTON_RISK") || signalCodes.has("MISSING_LANGUAGE"), "noen enkle UU-punkter som bør sjekkes");
  addMailPoint(points, signalCodes.has("SENSITIVE_HEALTH_CONTEXT"), "ekstra ryddighet rundt personvern og skjema fordi siden berører et sensitivt fagområde");
  addMailPoint(points, signalCodes.has("MISSING_PRIVACY_NOTICE") || signalCodes.has("COOKIE_CONSENT_RISK"), "personvern- og samtykketekst der siden samler inn eller måler data");
  addMailPoint(points, signalCodes.has("MIXED_CONTENT_RISK") || signalCodes.has("MANY_EXTERNAL_SCRIPTS") || signalCodes.has("EXTERNAL_IFRAME_RISK"), "noen tekniske avhengigheter som bør vurderes");
  addMailPoint(points, signalCodes.has("NON_NO_DOMAIN"), "vurdering av en tydeligere norsk nettadresse");
  addMailPoint(points, signalCodes.has("THIRD_PARTY_SURFACE"), "samling av informasjonen på en egen nettside");

  return points;
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
    if ((line === "Se eksempel her:" || line === "Eksempel på enkel side:") && isHttpUrl(nextLine)) {
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
    "{{price}}": "3.990",
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

Jeg ville bare høre om dere ønsker en enklere og mer ryddig presentasjon på nett.

Jeg lager nettsider med tydelig presentasjon av tjenester, kontaktinfo og en løsning som fungerer godt på mobil.
{{websiteQualityMailLine}}
{{websiteComplianceMailLine}}

Hvis dere ønsker det, kan jeg sette opp en mer oversiktlig side for {{recipientObject}}.

Du får:
- En ryddig nettside som fungerer godt på mobil
- Tydelig presentasjon av tjenester/aktivitet
- Kontaktinfo lett tilgjengelig for kunder
- Klar løsning {{recipientSubject}} kan bruke med en gang

Eksempel på enkel side:
{{senderWebsite}}

Jeg kan sende et konkret forslag.

Mvh
{{senderName}}
{{senderPhone}}
{{senderEmail}}`;
}

function defaultRegisteredWebsiteUnavailableEmailTemplate() {
  return `Hei {{greeting}},

Jeg så at {{companyName}} har registrert nettsiden {{registeredWebsite}}.

Da jeg sjekket den, så det ut som siden ikke svarte akkurat nå. Det kan være midlertidig, men jeg ville bare gi beskjed.

Jeg kan hjelpe med å få på plass en ryddig nettside på domenet, med kontaktinfo og kort presentasjon av hva dere tilbyr.

Du får:
- En ryddig nettside som fungerer godt på mobil
- Kontaktinfo og kort presentasjon av tjenester/aktivitet
- Klar løsning {{recipientSubject}} kan bruke med en gang

Eksempel på enkel side:
{{senderWebsite}}

Jeg kan ta en rask sjekk og sende et konkret forslag.

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

Jeg så {{companyName}} og ville bare høre om {{recipientSubject}} trenger en nettside.

{{salesSegmentPitch}}

Jeg kan sette opp dette ferdig for {{recipientObject}}, slik at {{recipientSubject}} får en fast side å vise til i e-post, sosiale medier og kundedialog.

Du får:
- En ryddig nettside som fungerer godt på mobil
{{domainLine}}
- Kontaktinfo og kort presentasjon av tjenester/aktivitet
- Klar løsning {{recipientSubject}} kan bruke med en gang

Eksempel på enkel side:
{{senderWebsite}}

Jeg kan sende et konkret forslag til {{recipientPagePossessive}} side.

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
