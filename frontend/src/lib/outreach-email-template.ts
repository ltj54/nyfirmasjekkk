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
    ? extractMailSubject(markdown, "E-postmal - registrert nettside svarer ikke") ?? "Kort observasjon om {{registeredWebsite}}"
    : hasWebsiteQualityOpportunity(company)
      ? extractMailSubject(markdown, "E-postmal - nettside kan forbedres") ?? "Spørsmål om nettsiden til {{companyName}}"
    : hasRegisteredWebsiteForManualReview(company)
      ? extractMailSubject(markdown, "E-postmal - registrert nettside bør vurderes") ?? "Spørsmål om nettsiden til {{companyName}}"
    : extractMailSubject(markdown) ?? "Nettside for {{companyName}}";
  return applyOutreachTemplate(template, company);
}

export function buildOutreachEmailBody(markdown: string, company: OutreachEmailCompany) {
  const template = isRegisteredWebsiteUnavailable(company)
    ? extractMarkdownSection(markdown, "E-postmal - registrert nettside svarer ikke") ?? defaultRegisteredWebsiteUnavailableEmailTemplate()
    : hasWebsiteQualityOpportunity(company)
      ? extractMarkdownSection(markdown, "E-postmal - nettside kan forbedres") ?? defaultWebsiteQualityOpportunityEmailTemplate()
    : hasRegisteredWebsiteForManualReview(company)
      ? extractMarkdownSection(markdown, "E-postmal - registrert nettside bør vurderes") ?? defaultRegisteredWebsiteReviewEmailTemplate()
    : extractMarkdownSection(markdown, "E-postmal") ?? defaultOutreachEmailTemplate();
  const cleanedTemplate = template.replace(/^Emne:\s*`?.+`?\s*$/m, "").trim();
  return applyOutreachTemplate(cleanedTemplate, company);
}

export function websiteQualityMailLine(company: OutreachEmailCompany) {
  const signals = company.websiteQuality?.signals ?? [];
  const signalCodes = new Set(signals.map((signal) => signal.code));
  if (signalCodes.has("THIRD_PARTY_SURFACE")) {
    return "Jeg så blant annet noen mulige forbedringspunkter knyttet til kontaktinfo og en fast nettside.";
  }

  const isCandidate = isWebsiteCandidateContext(company);
  const isThin = signalCodes.has("THIN_CONTENT") || signalCodes.has("TEMPLATE_PLACEHOLDER_CONTENT") || signalCodes.has("WEAK_HOMEPAGE_STRUCTURE");

  if (isCandidate && isThin) {
    return "Jeg så blant annet noen mulige forbedringspunkter knyttet til innhold og førsteinntrykk.";
  }

  const categoryPoints = websiteQualityMailCategoryPoints(signalCodes);
  if (categoryPoints.length > 0) {
    const limit = isCandidate ? 2 : 2;
    return `Jeg så blant annet noen mulige forbedringspunkter knyttet til ${formatNorwegianList(categoryPoints.slice(0, limit))}.`;
  }

  return signals.length > 0
    ? "Jeg så blant annet noen mulige forbedringspunkter knyttet til innhold, kontaktinfo eller teknisk kvalitet."
    : "";
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

function hasSemanticAccessibilityRisk(signalCodes: Set<string>) {
  return signalCodes.has("MISSING_MAIN_LANDMARK")
    || signalCodes.has("WEAK_PAGE_LANDMARKS")
    || signalCodes.has("SKIPPED_HEADING_LEVELS")
    || signalCodes.has("VAGUE_LINK_TEXT")
    || signalCodes.has("TABLE_HEADERS_MISSING")
    || signalCodes.has("IFRAME_TITLE_RISK");
}

function hasFormAccessibilityRisk(signalCodes: Set<string>) {
  return signalCodes.has("FORM_LABEL_RISK")
    || signalCodes.has("NEWSLETTER_FORM_LABEL_RISK")
    || signalCodes.has("FORM_AUTOCOMPLETE_MISSING")
    || signalCodes.has("FORM_INPUT_TYPE_RISK")
    || signalCodes.has("INSECURE_FORM_ACTION")
    || signalCodes.has("PASSWORD_AUTOCOMPLETE_RISK");
}

function hasCommerceRisk(signalCodes: Set<string>) {
  return signalCodes.has("COMMERCE_TERMS_MISSING")
    || signalCodes.has("COMMERCE_RETURN_INFO_MISSING")
    || signalCodes.has("COMMERCE_DELIVERY_INFO_MISSING")
    || signalCodes.has("PAYMENT_TRUST_INFO_MISSING");
}

function hasSecurityHeaderRisk(signalCodes: Set<string>) {
  return signalCodes.has("MISSING_HSTS_HEADER")
    || signalCodes.has("MISSING_CSP_HEADER")
    || signalCodes.has("MISSING_CONTENT_TYPE_OPTIONS")
    || signalCodes.has("MISSING_REFERRER_POLICY")
    || signalCodes.has("MISSING_PERMISSIONS_POLICY")
    || signalCodes.has("MISSING_FRAME_PROTECTION")
    || signalCodes.has("TLS_CERTIFICATE_REVIEW")
    || signalCodes.has("TLS_CERTIFICATE_EXPIRING")
    || signalCodes.has("HTTP_TO_HTTPS_REDIRECT_REVIEW")
    || signalCodes.has("WEAK_HSTS_HEADER")
    || signalCodes.has("WEAK_CSP_HEADER")
    || signalCodes.has("SERVER_TECH_HEADER_EXPOSED")
    || signalCodes.has("SECURITY_TXT_MISSING")
    || signalCodes.has("ROBOTS_SENSITIVE_PATHS");
}

function hasApplicationSecurityRisk(signalCodes: Set<string>) {
  return signalCodes.has("ADMIN_OR_LOGIN_PATH_EXPOSED")
    || signalCodes.has("LOGIN_FORM_SECURITY_REVIEW")
    || signalCodes.has("FILE_UPLOAD_REVIEW")
    || signalCodes.has("API_ENDPOINTS_VISIBLE")
    || signalCodes.has("CMS_VERSION_EXPOSED")
    || signalCodes.has("SOURCE_MAP_EXPOSED")
    || signalCodes.has("DEVELOPMENT_REFERENCE_EXPOSED")
    || signalCodes.has("TARGET_BLANK_NOOPENER_MISSING")
    || signalCodes.has("PERSONAL_DATA_GET_FORM")
    || signalCodes.has("SENSITIVE_DATA_FORM")
    || signalCodes.has("EXTERNAL_FORM_ACTION")
    || signalCodes.has("DOM_XSS_SURFACE_REVIEW")
    || signalCodes.has("DANGEROUS_JS_SINK_REVIEW")
    || signalCodes.has("INLINE_EVENT_HANDLER_REVIEW")
    || signalCodes.has("JAVASCRIPT_HREF_REVIEW")
    || signalCodes.has("THIRD_PARTY_SCRIPT_INTEGRITY_REVIEW")
    || signalCodes.has("MANY_THIRD_PARTY_SCRIPT_HOSTS")
    || signalCodes.has("MANY_INLINE_SCRIPTS_WITHOUT_CSP")
    || signalCodes.has("POST_FORM_CSRF_REVIEW")
    || signalCodes.has("OUTDATED_JS_LIBRARY_REVIEW")
    || signalCodes.has("EMAIL_SECURITY_DNS_REVIEW")
    || signalCodes.has("EMAIL_MX_MISSING")
    || signalCodes.has("DNS_CAA_MISSING")
    || signalCodes.has("SPF_POLICY_SOFT")
    || signalCodes.has("SPF_LOOKUP_RISK")
    || signalCodes.has("DUPLICATE_SPF_RECORDS")
    || signalCodes.has("DMARC_POLICY_NONE")
    || signalCodes.has("DMARC_RUA_MISSING")
    || signalCodes.has("COOKIE_SECURE_FLAG_MISSING")
    || signalCodes.has("COOKIE_HTTPONLY_REVIEW")
    || signalCodes.has("COOKIE_SAMESITE_REVIEW");
}

function websiteQualityMailCategoryPoints(signalCodes: Set<string>) {
  const points: string[] = [];

  addMailPoint(points, hasTrustOrContentRisk(signalCodes), "innhold og tillit");
  addMailPoint(points, signalCodes.has("MIXED_CONTENT_RISK") || hasTechnologyExposure(signalCodes), "teknisk kvalitet");
  addMailPoint(points, hasSecurityHeaderRisk(signalCodes), "teknisk trygghet");
  addMailPoint(points, hasPrivacyOrThirdPartyRisk(signalCodes), "personvern og skjema");
  addMailPoint(points, hasAccessibilityCategoryRisk(signalCodes), "brukervennlighet");
  addMailPoint(points, hasApplicationSecurityRisk(signalCodes), "teknisk ryddighet");
  addMailPoint(points, hasEmailSecurityRisk(signalCodes), "e-postoppsett");
  addMailPoint(points, hasCommerceRisk(signalCodes), "kjøpsinformasjon");

  return points;
}

function hasTechnologyExposure(signalCodes: Set<string>) {
  return signalCodes.has("TECHNOLOGY_STACK_DETECTED")
    || signalCodes.has("SERVER_TECH_HEADER_EXPOSED")
    || signalCodes.has("CMS_VERSION_EXPOSED")
    || signalCodes.has("SOURCE_MAP_EXPOSED")
    || signalCodes.has("DEVELOPMENT_REFERENCE_EXPOSED")
    || signalCodes.has("ROBOTS_SENSITIVE_PATHS");
}

function hasPrivacyOrThirdPartyRisk(signalCodes: Set<string>) {
  return signalCodes.has("MISSING_PRIVACY_NOTICE")
    || signalCodes.has("CRAWL_PRIVACY_PAGE_NOT_FOUND")
    || signalCodes.has("CRAWL_FORM_PRIVACY_REVIEW")
    || signalCodes.has("PRIVACY_LINK_REVIEW")
    || signalCodes.has("COOKIE_CONSENT_RISK")
    || signalCodes.has("COOKIE_SECURE_FLAG_MISSING")
    || signalCodes.has("COOKIE_HTTPONLY_REVIEW")
    || signalCodes.has("COOKIE_SAMESITE_REVIEW")
    || signalCodes.has("MANY_EXTERNAL_SCRIPTS")
    || signalCodes.has("EXTERNAL_IFRAME_RISK")
    || signalCodes.has("THIRD_PARTY_EMBED_CONSENT_RISK")
    || signalCodes.has("THIRD_PARTY_FORM_RISK")
    || signalCodes.has("PERSONAL_DATA_GET_FORM")
    || signalCodes.has("SENSITIVE_DATA_FORM")
    || signalCodes.has("EXTERNAL_FORM_ACTION")
    || signalCodes.has("GOOGLE_ANALYTICS_WITHOUT_CONSENT")
    || signalCodes.has("META_PIXEL_WITHOUT_CONSENT")
    || signalCodes.has("SESSION_TRACKING_WITHOUT_CONSENT");
}

function hasAccessibilityCategoryRisk(signalCodes: Set<string>) {
  return hasSemanticAccessibilityRisk(signalCodes)
    || hasFormAccessibilityRisk(signalCodes)
    || signalCodes.has("IMAGE_ALT_RISK")
    || signalCodes.has("EMPTY_BUTTON_RISK")
    || signalCodes.has("MISSING_LANGUAGE")
    || signalCodes.has("LANGUAGE_MISMATCH_RISK")
    || signalCodes.has("FOCUS_STYLE_RISK")
    || signalCodes.has("AUTOPLAY_MEDIA_RISK")
    || signalCodes.has("MOTION_ACCESSIBILITY_RISK")
    || signalCodes.has("FIXED_WIDTH_LAYOUT")
    || signalCodes.has("MISSING_VIEWPORT");
}

function hasEmailSecurityRisk(signalCodes: Set<string>) {
  return signalCodes.has("EMAIL_SECURITY_DNS_REVIEW")
    || signalCodes.has("EMAIL_MX_MISSING")
    || signalCodes.has("DNS_CAA_MISSING")
    || signalCodes.has("SPF_POLICY_SOFT")
    || signalCodes.has("SPF_LOOKUP_RISK")
    || signalCodes.has("DUPLICATE_SPF_RECORDS")
    || signalCodes.has("DMARC_POLICY_NONE")
    || signalCodes.has("DMARC_RUA_MISSING");
}

function hasTrustOrContentRisk(signalCodes: Set<string>) {
  return signalCodes.has("WEAK_HOMEPAGE_STRUCTURE")
    || signalCodes.has("THIN_CONTENT")
    || signalCodes.has("WEAK_NAVIGATION")
    || signalCodes.has("WEAK_INDUSTRY_RELEVANCE")
    || signalCodes.has("GENERIC_SERVICE_TEXT")
    || signalCodes.has("AI_LIKE_PRESENTATION_RISK")
    || signalCodes.has("MISSING_ORG_NUMBER")
    || signalCodes.has("LEGAL_NAME_NOT_VISIBLE")
    || signalCodes.has("MISSING_ADDRESS_OR_AREA")
    || signalCodes.has("MISSING_ABOUT_SECTION")
    || signalCodes.has("MISSING_SOCIAL_PROOF")
    || signalCodes.has("AI_LIKE_PRESENTATION_RISK")
    || signalCodes.has("GENERIC_PRESENTATION_TRUST_RISK")
    || signalCodes.has("GENERIC_OR_AI_IMAGE_RISK")
    || signalCodes.has("PLACEHOLDER_IMAGE_RISK")
    || signalCodes.has("CTA_DESTINATION_MISMATCH")
    || signalCodes.has("TEMPLATE_PLACEHOLDER_CONTENT")
    || signalCodes.has("INCOMPLETE_MARKET_OR_CHECKOUT")
    || signalCodes.has("DATA_HANDLING_INFO_REVIEW");
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
    "{{domainExample}}": domainExamplesForCompany(company)[0] ?? "firmanavn.no",
    "{{domainLine}}": domainLineForCompany(company),
    "{{greeting}}": greeting,
    "{{recipientSubject}}": recipientSubject,
    "{{recipientPossessive}}": recipientPossessive,
    "{{recipientObject}}": recipientObject,
    "{{recipientPagePossessive}}": recipientPagePossessive,
    "{{price}}": "1.990",
    "{{priceValue}}": "1.990",
    "{{senderName}}": "Lars Johannessen",
    "{{senderPhone}}": "977 24 209",
    "{{senderEmail}}": "kontakt@ltj-production.no",
    "{{senderWebsite}}": "https://www.ltj-production.no/",
    "{{websiteCheckSenderWebsite}}": "https://www.ltj-production.no/nettsidesjekk.html",
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

Jeg tok en enkel førstesjekk av nettsiden til {{companyName}} og så noen punkter som kan være verdt å se nærmere på.

{{websiteQualityMailLine}}
{{websiteComplianceMailLine}}

Dette er ikke en full gjennomgang, bare en rask teknisk indikasjon.

Hvis dere ønsker det, kan jeg sende en kort rapport med konkrete funn og forslag til enkle forbedringer.

Eksempel:
{{websiteCheckSenderWebsite}}

Mvh
{{senderName}}
{{senderPhone}}
{{senderEmail}}`;
}

function defaultRegisteredWebsiteUnavailableEmailTemplate() {
  return `Hei {{greeting}},

Jeg så at {{companyName}} har {{registeredWebsite}} registrert som nettside.

Da jeg sjekket, svarte ikke siden hos meg. Det kan selvfølgelig være midlertidig, men jeg ville bare nevne det i tilfelle dere ikke er klar over det.

Hvis dere ønsker det, kan jeg ta en kort sjekk og sende en enkel vurdering av hva som eventuelt bør rettes.

Eksempel på nettsidesjekk:
{{websiteCheckSenderWebsite}}

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
  const discovery = company.websiteDiscovery;
  return Boolean(company.website)
    && (discovery?.status === "REGISTERED" || isWebsiteCandidateContext(company))
    && discovery?.verifiedReachable !== false
    && !isRegulatedOrEstablishedWebsiteOwner(company);
}

function hasRegisteredWebsiteForManualReview(company: OutreachEmailCompany) {
  return Boolean(company.website)
    && company.websiteDiscovery?.status === "REGISTERED"
    && company.websiteDiscovery.verifiedReachable !== false;
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
  return `Hei {{greeting}},

Jeg tok en enkel førstesjekk av nettsiden til {{companyName}} og så noen punkter som kan være verdt å se nærmere på.

Dette er ikke en full gjennomgang, bare en rask teknisk indikasjon.

Hvis dere ønsker det, kan jeg sende en kort rapport med konkrete funn og forslag til enkle forbedringer.

Eksempel:
{{websiteCheckSenderWebsite}}

Mvh
{{senderName}}
{{senderPhone}}
{{senderEmail}}`;
}

function defaultOutreachEmailTemplate() {
  return `Hei {{greeting}},

Jeg kom over {{companyName}}, men fant ikke en tydelig nettside/kontaktside.

Jeg lager enkle nettsider for små og nye virksomheter - med kort presentasjon, kontaktinfo og tydelig kontaktvei.

Pris for en enkel førsteside er fra kr {{priceValue}}.

Eksempel:
{{senderWebsite}}

Hvis det er aktuelt, kan jeg sende et konkret forslag.

Mvh
{{senderName}}
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
