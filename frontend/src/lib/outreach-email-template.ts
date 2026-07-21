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
    ? extractMailSubject(markdown, "E-postmal - registrert nettside svarer ikke") ?? "Nettsiden til {{companyName}} svarte ikke"
    : hasWebsiteQualityOpportunity(company)
      ? extractMailSubject(markdown, "E-postmal - nettside kan forbedres") ?? "En observasjon om nettsiden til {{companyName}}"
    : hasRegisteredWebsiteForManualReview(company)
      ? extractMailSubject(markdown, "E-postmal - registrert nettside bør vurderes manuelt") ?? "Nettsiden til {{companyName}}"
    : extractMailSubject(markdown) ?? "Fant ikke nettsiden til {{companyName}}";
  return applyOutreachTemplate(template, company);
}

export function buildOutreachEmailBody(markdown: string, company: OutreachEmailCompany) {
  const template = isRegisteredWebsiteUnavailable(company)
    ? extractMarkdownSection(markdown, "E-postmal - registrert nettside svarer ikke") ?? defaultRegisteredWebsiteUnavailableEmailTemplate()
    : hasWebsiteQualityOpportunity(company)
      ? extractMarkdownSection(markdown, "E-postmal - nettside kan forbedres") ?? defaultWebsiteQualityOpportunityEmailTemplate()
    : hasRegisteredWebsiteForManualReview(company)
      ? extractMarkdownSection(markdown, "E-postmal - registrert nettside bør vurderes manuelt") ?? defaultRegisteredWebsiteReviewEmailTemplate()
    : extractMarkdownSection(markdown, "E-postmal") ?? defaultOutreachEmailTemplate();
  const cleanedTemplate = template.replace(/^Emne:\s*`?.+`?\s*$/m, "").trim();
  return applyOutreachTemplate(cleanedTemplate, company);
}

export function websiteQualityMailLine(company: OutreachEmailCompany) {
  return approvedWebsiteObservation(company)?.observation ?? "";
}

export function websiteQualityImpactLine(company: OutreachEmailCompany) {
  return approvedWebsiteObservation(company)?.impact ?? "";
}

export function websiteQualityMailSignalCode(company: Pick<OutreachEmailCompany, "naceCode" | "salesSegment" | "websiteQuality">) {
  return approvedWebsiteObservation(company)?.code ?? null;
}

type OutreachEmailSendCompany = Pick<
  OutreachEmailCompany,
  "name" | "organizationForm" | "naceCode" | "naceDescription" | "salesSegment" | "website" | "websiteDiscovery" | "websiteQuality"
>;

export function outreachEmailAutoSendBlockReason(company: OutreachEmailSendCompany) {
  const registeredWebsiteNeedsReview = Boolean(company.website)
    && company.websiteDiscovery?.status === "REGISTERED"
    && company.websiteDiscovery.verifiedReachable !== false
    && (isRegulatedOrEstablishedWebsiteOwner(company) || !approvedWebsiteObservation(company));
  if (registeredWebsiteNeedsReview) {
    return "Registrert nettside krever manuell kontroll og en konkret observasjon før utsending.";
  }
  if (company.website && !isRegisteredWebsiteUnavailable(company) && !approvedWebsiteObservation(company)) {
    return "Nettsidesjekken har ikke et konkret, godkjent funn som kan brukes i automatisk e-post.";
  }
  return null;
}

type ApprovedWebsiteObservation = {
  code: string;
  observation: string;
  impact: string;
};

function approvedWebsiteObservation(company: Pick<OutreachEmailCompany, "naceCode" | "salesSegment" | "websiteQuality">): ApprovedWebsiteObservation | null {
  const signals = company.websiteQuality?.signals ?? [];
  const approved: Array<{
    code: string;
    observation: string;
    impact: string;
    include?: (severity: string) => boolean;
  }> = [
    {
      code: "WEAK_CONTACT_POINT",
      observation: "Jeg fant ikke telefon, e-post eller et tydelig kontaktpunkt på siden.",
      impact: "Det kan gjøre det unødvendig vanskelig for nye kunder å ta kontakt.",
    },
    {
      code: "CONTACT_DETAILS_NOT_VISIBLE",
      observation: "Siden nevner kontakt, men jeg fant ikke tydelig telefonnummer eller e-postadresse.",
      impact: "Det kan gjøre det unødvendig vanskelig for nye kunder å ta kontakt.",
    },
    {
      code: "MISSING_PRIVACY_NOTICE",
      observation: "Siden ser ut til å samle inn kontaktdata, men jeg fant ingen tydelig personvernlenke eller personverntekst.",
      impact: "Besøkende bør enkelt kunne se hvordan opplysningene deres behandles.",
    },
    {
      code: "CRAWL_FORM_PRIVACY_REVIEW",
      observation: "Jeg fant et skjema på nettsiden, men ingen tydelig personverntekst på sidene som ble kontrollert.",
      impact: "Besøkende bør enkelt kunne se hvordan opplysningene deres behandles.",
    },
    {
      code: "MISSING_HTTPS",
      observation: "Nettsiden bruker ikke en sikker HTTPS-forbindelse.",
      impact: "Det kan føre til varsler i nettleseren og svekke tilliten til siden.",
      include: (severity) => severity === "HIGH",
    },
    {
      code: "MISSING_ORG_NUMBER",
      observation: "Jeg fant ikke organisasjonsnummeret tydelig oppgitt på nettsiden.",
      impact: "Tydelig selskapsinformasjon kan gjøre det enklere for nye kunder å vite hvem de forholder seg til.",
    },
    {
      code: "MISSING_OPENING_HOURS",
      observation: "Jeg fant ikke tydelig oppgitte åpningstider eller tilgjengelighet på nettsiden.",
      impact: "Det kan gjøre det vanskeligere for besøkende å vite når de kan komme innom eller ta kontakt.",
      include: () => isOpeningHoursMailRelevant(company),
    },
    {
      code: "MISSING_ABOUT_SECTION",
      observation: "Jeg fant ingen tydelig presentasjon av hvem som står bak virksomheten.",
      impact: "En kort presentasjon kan gjøre det enklere for nye kunder å bli trygge på hvem de kontakter.",
      include: (severity) => severity === "HIGH",
    },
  ];

  for (const candidate of approved) {
    const signal = signals.find((item) => item.code === candidate.code && (candidate.include?.(item.severity) ?? true));
    if (signal) {
      return candidate;
    }
  }
  return null;
}

function isOpeningHoursMailRelevant(company: Pick<OutreachEmailCompany, "naceCode" | "salesSegment">) {
  const segmentCode = company.salesSegment?.code;
  const naceCode = company.naceCode?.trim() ?? "";
  return segmentCode === "BUTIKK_LOKALHANDEL"
    || segmentCode === "MAT_SERVERING"
    || naceCode.startsWith("47")
    || naceCode.startsWith("56");
}

export function websiteComplianceMailLine(company: OutreachEmailCompany) {
  const signalCodes = new Set(company.websiteQuality?.signals.map((signal) => signal.code) ?? []);
  const toneProfile = websiteQualityToneProfile(company);
  const hasComplianceSignal = [
    "MISSING_PRIVACY_NOTICE",
    "CRAWL_PRIVACY_PAGE_NOT_FOUND",
    "CRAWL_FORM_PRIVACY_REVIEW",
    "CRAWL_TERMS_PAGE_NOT_FOUND",
    "PRIVACY_LINK_REVIEW",
    "COOKIE_CONSENT_RISK",
    "FORM_LABEL_RISK",
    "EMPTY_BUTTON_RISK",
    "MISSING_LANGUAGE",
    "LANGUAGE_MISMATCH_RISK",
    "IMAGE_ALT_RISK",
    "MISSING_MAIN_LANDMARK",
    "WEAK_PAGE_LANDMARKS",
    "SKIPPED_HEADING_LEVELS",
    "VAGUE_LINK_TEXT",
    "TABLE_HEADERS_MISSING",
    "FORM_AUTOCOMPLETE_MISSING",
    "FORM_INPUT_TYPE_RISK",
    "FOCUS_STYLE_RISK",
    "AUTOPLAY_MEDIA_RISK",
    "MOTION_ACCESSIBILITY_RISK",
    "IFRAME_TITLE_RISK",
    "BROKEN_INTERNAL_LINKS",
    "MISSING_HSTS_HEADER",
    "MISSING_CSP_HEADER",
    "MISSING_REFERRER_POLICY",
    "MISSING_PERMISSIONS_POLICY",
    "TLS_CERTIFICATE_REVIEW",
    "TLS_CERTIFICATE_EXPIRING",
    "HTTP_TO_HTTPS_REDIRECT_REVIEW",
    "WEAK_HSTS_HEADER",
    "WEAK_CSP_HEADER",
    "SERVER_TECH_HEADER_EXPOSED",
    "SECURITY_TXT_MISSING",
    "ROBOTS_SENSITIVE_PATHS",
    "ADMIN_OR_LOGIN_PATH_EXPOSED",
    "LOGIN_FORM_SECURITY_REVIEW",
    "FILE_UPLOAD_REVIEW",
    "API_ENDPOINTS_VISIBLE",
    "CMS_VERSION_EXPOSED",
    "SOURCE_MAP_EXPOSED",
    "DEVELOPMENT_REFERENCE_EXPOSED",
    "TARGET_BLANK_NOOPENER_MISSING",
    "PERSONAL_DATA_GET_FORM",
    "SENSITIVE_DATA_FORM",
    "EXTERNAL_FORM_ACTION",
    "DOM_XSS_SURFACE_REVIEW",
    "DANGEROUS_JS_SINK_REVIEW",
    "INLINE_EVENT_HANDLER_REVIEW",
    "JAVASCRIPT_HREF_REVIEW",
    "THIRD_PARTY_SCRIPT_INTEGRITY_REVIEW",
    "MANY_THIRD_PARTY_SCRIPT_HOSTS",
    "MANY_INLINE_SCRIPTS_WITHOUT_CSP",
    "POST_FORM_CSRF_REVIEW",
    "OUTDATED_JS_LIBRARY_REVIEW",
    "EMAIL_SECURITY_DNS_REVIEW",
    "EMAIL_MX_MISSING",
    "DNS_CAA_MISSING",
    "SPF_LOOKUP_RISK",
    "DUPLICATE_SPF_RECORDS",
    "DMARC_RUA_MISSING",
    "COOKIE_SECURE_FLAG_MISSING",
    "COOKIE_HTTPONLY_REVIEW",
    "COOKIE_SAMESITE_REVIEW",
    "SPF_POLICY_SOFT",
    "DMARC_POLICY_NONE",
    "GOOGLE_ANALYTICS_WITHOUT_CONSENT",
    "META_PIXEL_WITHOUT_CONSENT",
    "SESSION_TRACKING_WITHOUT_CONSENT",
    "THIRD_PARTY_EMBED_CONSENT_RISK",
    "THIRD_PARTY_FORM_RISK",
    "INSECURE_FORM_ACTION",
    "COMMERCE_TERMS_MISSING",
    "COMMERCE_RETURN_INFO_MISSING",
    "MANY_EXTERNAL_SCRIPTS",
    "EXTERNAL_IFRAME_RISK",
    "SENSITIVE_HEALTH_CONTEXT",
    "MEDICAL_REGULATORY_STATUS",
    "MEDICAL_REGULATORY_CONTEXT_MISSING",
    "MEDICAL_VISUAL_TRUST_RISK",
    "HEALTH_TRACKING_CONTEXT",
    "INCOMPLETE_MARKET_OR_CHECKOUT",
    "TEMPLATE_PLACEHOLDER_CONTENT",
    "GENERIC_OR_AI_IMAGE_RISK",
    "CLOUDFLARE_EMAIL_PROTECTION",
    "CLIENT_LOADING_OVERLAY",
    "VISIBLE_DISCOUNT_CODE",
    "PAYMENT_TRUST_INFO_MISSING",
    "NEWSLETTER_FORM_LABEL_RISK",
  ].some((code) => signalCodes.has(code));

  if (signalCodes.has("THIRD_PARTY_SURFACE") && !signalCodes.has("SENSITIVE_HEALTH_CONTEXT")) {
    return "";
  }

  if (!hasComplianceSignal) {
    return "";
  }

  return toneProfile.complianceLine;
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
  complianceLine: "Slike ting handler ikke bare om teknikk, men også om tillit for besøkende som vurderer å ta kontakt.",
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
      complianceLine: "For virksomheter innen helse, rådgivning eller lavterskel hjelp er det ekstra viktig at nettsiden fremstår trygg, tydelig og ryddig - særlig rundt kontakt, personvern og hvem som står bak tjenesten.",
    };
  }
  if (isAdviceOrLowThresholdContext(company)) {
    return {
      ...normalWebsiteToneProfile,
      strictness: "strict",
      servicePoint: "tydeligere beskrivelse av hvem tilbudet hjelper og hvordan kontakten foregår",
      contactPoint: "tryggere og mer forklarende kontaktflyt",
      trustPoint: "tydeligere ansvarlig avsender, personer og tillitssignaler",
      accessibilityPoint: "skjema, knapper og tilgjengelighet fordi kontaktveien bør være enkel å bruke",
      sensitivePoint: "ekstra ryddighet rundt personvern, kontakt og hvem som står bak tjenesten",
      privacyPoint: "personvern og hvordan henvendelser eller skjemaopplysninger behandles",
      complianceLine: "For virksomheter innen helse, rådgivning eller lavterskel hjelp er det ekstra viktig at nettsiden fremstår trygg, tydelig og ryddig - særlig rundt kontakt, personvern og hvem som står bak tjenesten.",
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

function isAdviceOrLowThresholdContext(company: OutreachEmailCompany) {
  const text = normalizeContextText(`${company.name} ${company.naceDescription ?? ""} ${company.salesSegment?.label ?? ""}`);
  return text.includes("spor en venn")
    || text.includes("spør en venn")
    || text.includes("lavterskel")
    || text.includes("radgiv")
    || text.includes("rådgiv")
    || text.includes("samtale")
    || text.includes("psyk")
    || text.includes("omsorg")
    || text.includes("sosial")
    || text.includes("stotte")
    || text.includes("støtte");
}

function normalizeContextText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
  const greeting = contactName ? firstNameFromContactName(contactName) : "";
  const greetingLine = greeting ? `Hei ${greeting},` : "Hei,";
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
    "{{domainExample}}": domainExamplesForCompany(company)[0] ?? "firmanavn.no",
    "{{domainLine}}": domainLineForCompany(company),
    "{{greeting}}": greeting,
    "{{greetingLine}}": greetingLine,
    "{{recipientSubject}}": recipientSubject,
    "{{recipientPossessive}}": recipientPossessive,
    "{{recipientObject}}": recipientObject,
    "{{recipientPagePossessive}}": recipientPagePossessive,
    "{{price}}": "1 990",
    "{{priceValue}}": "1 990",
    "{{senderName}}": "Lars Johannessen",
    "{{senderPhone}}": "977 24 209",
    "{{senderEmail}}": "kontakt@ltj-production.no",
    "{{senderWebsite}}": "https://www.ltj-production.no/",
    "{{websiteCheckSenderWebsite}}": "https://www.ltj-production.no/nettsidesjekk.html",
    "{{registeredWebsite}}": company.website?.trim() || "",
    "{{registeredWebsiteIntro}}": registeredWebsiteIntro(company),
    "{{websiteQualitySummary}}": company.websiteQuality?.summary ?? "",
    "{{websiteQualityMailLine}}": websiteQualityMailLine(company),
    "{{websiteQualityImpactLine}}": websiteQualityImpactLine(company),
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
  return `{{greetingLine}}

Jeg tok en rask førstesjekk av nettsiden til {{companyName}}.

{{websiteQualityMailLine}}
{{websiteQualityImpactLine}}

Dette er ikke en full gjennomgang, men det kan være verdt å se nærmere på.

Hvis dere ønsker det, kan jeg sende en kort rapport med konkrete funn og forslag til forbedringer.

Her er et eksempel på hva jeg ser etter:
{{websiteCheckSenderWebsite}}

Skal jeg sende rapporten?

Mvh
{{senderName}}
LTJ Production
{{senderPhone}}
{{senderEmail}}`;
}

function defaultRegisteredWebsiteUnavailableEmailTemplate() {
  return `{{greetingLine}}

Jeg så at {{registeredWebsite}} er registrert som nettside for {{companyName}}.

Da jeg sjekket den, svarte ikke siden hos meg. Det kan selvfølgelig være midlertidig, men jeg ville nevne det i tilfelle dere ikke er klar over det.

Hvis nettsiden ikke er ferdig eller ikke lenger skal brukes, kan jeg hjelpe med å få på plass en ny nettside med tydelig presentasjon og kontaktinformasjon.

Jeg tilbyr en profesjonell førsteside til {{priceValue}} kr.

Her kan dere se hvordan jeg jobber:
{{senderWebsite}}

Er det aktuelt at jeg sender et uforpliktende forslag?

Mvh
{{senderName}}
LTJ Production
{{senderPhone}}
{{senderEmail}}`;
}

function isRegisteredWebsiteUnavailable(company: Pick<OutreachEmailCompany, "website" | "websiteDiscovery">) {
  return Boolean(company.website)
    && company.websiteDiscovery?.status === "REGISTERED"
    && company.websiteDiscovery.verifiedReachable === false;
}

function hasWebsiteQualityOpportunity(company: OutreachEmailCompany) {
  const discovery = company.websiteDiscovery;
  return Boolean(company.website)
    && (discovery?.status === "REGISTERED" || isWebsiteCandidateContext(company))
    && discovery?.verifiedReachable !== false
    && !isRegulatedOrEstablishedWebsiteOwner(company)
    && approvedWebsiteObservation(company) !== null;
}

function hasRegisteredWebsiteForManualReview(company: OutreachEmailCompany) {
  return Boolean(company.website)
    && company.websiteDiscovery?.verifiedReachable !== false;
}

function isRegulatedOrEstablishedWebsiteOwner(company: Pick<OutreachEmailCompany, "name" | "organizationForm" | "naceDescription">) {
  const text = `${company.name} ${company.organizationForm ?? ""} ${company.naceDescription ?? ""}`.toLowerCase();
  return [
    "forsikring",
    "insurance",
    "bank",
    "finans",
    "financial",
    "pensjon",
    "kreditt",
    "forbund",
    "forening",
    "medlemsorganisasjon",
    "arbeidstakerorganisasjon",
  ].some((word) => text.includes(word));
}

function defaultRegisteredWebsiteReviewEmailTemplate() {
  return `{{greetingLine}}

Jeg kom over nettsiden til {{companyName}} i forbindelse med en gjennomgang av lokale virksomheter.

Jeg tilbyr korte nettsidesjekker med vurdering av blant annet mobilbruk, kontaktinformasjon, teknisk kvalitet og personvern.

Hvis det er interessant, kan jeg ta en nærmere titt på siden deres og sende noen konkrete punkter.

Her kan dere se hva sjekken omfatter:
{{websiteCheckSenderWebsite}}

Er det aktuelt?

Mvh
{{senderName}}
LTJ Production
{{senderPhone}}
{{senderEmail}}`;
}

function defaultOutreachEmailTemplate() {
  return `{{greetingLine}}

Jeg kom over {{companyName}}, men fant ikke en tydelig nettside eller kontaktside.

Jeg lager profesjonelle nettsider for små virksomheter, med presentasjon, kontaktinformasjon og en tydelig vei for kunder som ønsker å ta kontakt.

Jeg tilbyr en profesjonell førsteside til {{priceValue}} kr.

Her er et eksempel på hvordan jeg jobber:
{{senderWebsite}}

Skal jeg sende et uforpliktende forslag til hvordan en side for {{companyName}} kan se ut?

Mvh
{{senderName}}
LTJ Production
{{senderPhone}}
{{senderEmail}}`;
}

function firstNameFromContactName(value: string) {
  return value.split(/\s+/)[0] ?? value;
}

function displayCompanyName(company: Pick<OutreachEmailCompany, "name" | "organizationForm">) {
  return company.name
    .replace(/\s+(AS|ASA|ENK|NUF|DA|ANS|SA|BA|LTD|LIMITED|LLC|INC|GMBH|OU|OÜ)$/i, "")
    .replace(/\.+(AS|ASA|ENK|NUF|DA|ANS|SA|BA|LTD|LIMITED|LLC|INC|GMBH|OU|OÜ)$/i, "")
    .trim();
}

function domainExamplesForCompany(company: OutreachEmailCompany) {
  const suffixes = [
    "aksjeselskap",
    "enkeltpersonforetak",
    "as",
    "asa",
    "ab",
    "enk",
    "da",
    "ans",
    "nuf",
    "sa",
    "stift",
    "fli",
    "ba",
    "ltd",
    "limited",
    "llc",
    "inc",
    "gmbh",
    "og",
    "and",
    "of",
    "the",
    "i",
    "for",
    "til",
    "av",
    "pa",
    "paa",
    "fra",
    "med",
    "mot",
    "hos",
    "ved",
    "om",
    "under",
    "over",
    "innen",
    "utan",
    "utanfor",
    "uten",
    "utenfor",
    "och",
    "att",
    "eller",
    "samt",
    "in",
    "on",
    "at",
    "to",
    "from",
    "with",
    "by",
    "gruppe",
    "gruppa",
    "group",
    "stottegruppe",
    "support",
    "supportgroup",
    "association",
    "forening",
    "lag",
  ];
  const words = normalizedCompanyNameWords(company.name, suffixes);
  const naceCode = company.naceCode?.trim() ?? "";
  const segmentCode = company.salesSegment?.code;
  const locationWord = normalizedLocationWord(company.municipality);
  const emailWords = normalizedEmailLocalWords(company.email, suffixes);
  const emailDomainWords = normalizedEmailDomainWords(company.email, suffixes);
  const coreNameWords = compactCoreCompanyWords(words);
  const foodDomains = foodDomainExamples(
    coreNameWords.length > 0 ? coreNameWords : words,
    locationWord,
    emailWords,
    segmentCode === "MAT_SERVERING" || naceCode.startsWith("56")
  );
  if (foodDomains.length > 0) {
    return foodDomains;
  }

  const suggestions: string[] = [];
  const addSuggestion = (value: string) => {
    if (!suggestions.includes(value)) {
      suggestions.push(value);
    }
  };
  const normalizedWords = coreNameWords.length > 0 ? coreNameWords : words.slice(0, 4);
  const normalized = normalizedWords
    .join("-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (normalized) {
    addSuggestion(`${normalized}.no`);
  }
  const compactName = coreNameWords.length > 0 ? coreNameWords.join("") : words.slice(0, 2).join("");
  if (compactName && compactName !== normalized.replaceAll("-", "") && compactName.length >= 5 && compactName.length <= 24) {
    addSuggestion(`${compactName}.no`);
  }
  if (locationWord && words.length > 0) {
    if (compactName.length >= 5 && compactName.length + locationWord.length <= 26) {
      addSuggestion(withOptionalLocation(compactName, locationWord));
    }
    if (coreNameWords.length === 0 && words[0].length + locationWord.length <= 24) {
      addSuggestion(withOptionalLocation(words[0], locationWord));
    }
  }
  if (emailWords.length > 0 && shouldUseEmailDomainHint(emailWords, coreNameWords)) {
    addSuggestion(`${emailWords.join("")}.no`);
    if (emailWords.length >= 2) {
      addSuggestion(`${emailWords.join("-")}.no`);
    }
  }
  if (emailDomainWords.length > 0 && shouldUseEmailDomainHint(emailDomainWords, coreNameWords)) {
    addSuggestion(`${emailDomainWords.join("")}.no`);
    if (emailDomainWords.length >= 2) {
      addSuggestion(`${emailDomainWords.join("-")}.no`);
    }
  }

  return (suggestions.length > 0 ? suggestions : ["firmanavn.no"]).slice(0, 4);
}

function normalizedCompanyNameWords(companyName: string, excludedWords: string[]) {
  const namePart = companyName.split(/\s+-\s+/)[0] || companyName;
  return namePart
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "o")
    .replaceAll("å", "a")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("&", " og ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((part) => part && !excludedWords.includes(part));
}

function normalizedLocationWord(value: string | null | undefined) {
  const words = normalizedCompanyNameWords(value ?? "", []);
  return words.find((word) => word.length >= 4) ?? null;
}

function normalizedEmailLocalWords(email: string | null | undefined, excludedWords: string[]) {
  const localPart = email?.split("@")[0] ?? "";
  const cleanedLocalPart = localPart
    .replace(/\bog\b/gi, " og ")
    .replace(/(as|asa|enk|nuf|da|ans|sa|ba)$/i, " $1");
  return normalizedCompanyNameWords(cleanedLocalPart, excludedWords);
}

function normalizedEmailDomainWords(email: string | null | undefined, excludedWords: string[]) {
  const domain = email?.split("@")[1]?.split(".")[0] ?? "";
  const commonDomains = new Set(["gmail", "hotmail", "outlook", "yahoo", "icloud", "live", "online"]);
  if (!domain || commonDomains.has(domain.toLowerCase())) {
    return [];
  }
  return normalizedCompanyNameWords(domain, excludedWords);
}

function compactCoreCompanyWords(words: string[]) {
  if (words.length <= 3) {
    return words;
  }

  const stopWords = new Set([
    "jacobsen",
    "johansen",
    "hansen",
    "olsen",
    "andersen",
    "pedersen",
    "nilsen",
    "larsen",
    "karlsen",
    "kristiansen",
    "eriksen",
    "berg",
    "dahl",
  ]);
  const withoutLikelyPersonSuffix = words.filter((word, index) => index < 2 || !stopWords.has(word));
  return withoutLikelyPersonSuffix.slice(0, 3);
}

function shouldUseEmailDomainHint(emailWords: string[], coreNameWords: string[]) {
  if (emailWords.length === 0) {
    return false;
  }

  const emailText = emailWords.join("");
  const coreText = coreNameWords.join("");
  if (!coreText) {
    return emailText.length >= 5 && emailWords.length >= 2;
  }

  if (emailText.includes(coreText) || coreText.includes(emailText)) {
    return true;
  }

  return emailWords.some((word) => word.length >= 4 && coreNameWords.includes(word));
}

function withOptionalLocation(base: string, locationWord: string) {
  const compactBase = base.replaceAll("-", "");
  if (compactBase.includes(locationWord) || locationWord.includes(compactBase)) {
    return `${base}.no`;
  }
  return `${base}-${locationWord}.no`;
}

function foodDomainExamples(
  words: string[],
  locationWord: string | null,
  emailWords: string[],
  isFoodSegment: boolean
) {
  if (!isFoodSegment || words.length === 0) {
    return [];
  }

  const suggestions: string[] = [];
  const addSuggestion = (value: string) => {
    if (!suggestions.includes(value)) {
      suggestions.push(value);
    }
  };

  if (emailWords.length > 0) {
    const emailBrand = emailWords.join("");
    if (emailBrand.length >= 5 && emailBrand.length <= 24) {
      addSuggestion(`${emailBrand}.no`);
    }
    if (emailWords.length >= 2) {
      const hyphenatedEmailBrand = emailWords.join("-");
      if (hyphenatedEmailBrand.length >= 5 && hyphenatedEmailBrand.length <= 28) {
        addSuggestion(`${hyphenatedEmailBrand}.no`);
      }
    }
  }

  if (words.length >= 2) {
    const compactBrand = words.slice(0, 2).join("");
    if (compactBrand.length >= 5 && compactBrand.length <= 20) {
      if (locationWord && compactBrand.length + locationWord.length <= 26) {
        addSuggestion(withOptionalLocation(compactBrand, locationWord));
      }
      addSuggestion(`${compactBrand}.no`);
      addSuggestion(`${compactBrand}-catering.no`);
    }
  }

  const firstWord = words[0];
  if (firstWord && firstWord.length <= 16) {
    if (locationWord && firstWord.length + locationWord.length <= 24) {
      addSuggestion(withOptionalLocation(firstWord, locationWord));
      addSuggestion(withOptionalLocation(`${firstWord}-catering`, locationWord));
    }
    addSuggestion(`${firstWord}catering.no`);
  }

  if (locationWord) {
    addSuggestion(`catering-${locationWord}.no`);
  }

  return suggestions.slice(0, 4);
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
  const examples = domainExamplesForCompany(company);
  if (examples.length <= 1) {
    return `- Egen nettadresse, for eksempel ${examples[0] ?? "firmanavn.no"}`;
  }
  return `- Egen nettadresse, for eksempel ${formatNorwegianList(examples)}`;
}

function registeredWebsiteIntro(company: OutreachEmailCompany) {
  const website = company.website?.trim() || "";
  const signalCodes = new Set(company.websiteQuality?.signals.map((signal) => signal.code) ?? []);

  if (signalCodes.has("THIRD_PARTY_SURFACE")) {
    return `${website} ser ut til å være brukt som digital flate.`;
  }
  if (isWebsiteCandidateContext(company)) {
    return `${website} kan se ut til å være en aktuell nettside for virksomheten, selv om jeg ikke ser at den er registrert som nettside i BRREG.`;
  }

  return `${website} er registrert som nettside i BRREG.`;
}

function isWebsiteCandidateContext(company: OutreachEmailCompany) {
  return company.websiteDiscovery?.status === "POSSIBLE_MATCH"
    && company.websiteDiscovery.source === "Detaljside nettsidekandidat";
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
