import type { CompanySummary } from "@/lib/company-check";

type OutreachEmailCompany = Pick<
  CompanySummary,
  | "name"
  | "organizationForm"
  | "orgNumber"
  | "registrationDate"
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

export const PERSONAL_OBSERVATION_PLACEHOLDER = "[Skriv én konkret observasjon om virksomheten her.]";

export function hasUnresolvedPersonalObservation(body: string) {
  return body.includes(PERSONAL_OBSERVATION_PLACEHOLDER);
}

export function personalObservation(company: OutreachEmailCompany) {
  const companyName = displayCompanyName(company);
  if (company.website) {
    return `Jeg kom over ${companyName} og tok en titt på nettsiden deres.`;
  }
  return `Jeg kom over ${companyName} og ville høre om dere har vurdert å få laget en nettside for ${companyEntityDefinite(company)}.`;
}

export function industryOutreachPitch(company: OutreachEmailCompany) {
  const context = normalizeContextText([
    company.name,
    company.naceDescription,
    company.salesSegment?.label,
  ].filter(Boolean).join(" "));
  const naceCode = company.naceCode?.trim() ?? "";
  const segmentCode = company.salesSegment?.code ?? "";

  return earlyIndustryOutreachPitch(context, naceCode, segmentCode)
    ?? laterIndustryOutreachPitch(context, naceCode, segmentCode, company.salesSegment?.emailPitch);
}

function earlyIndustryOutreachPitch(context: string, naceCode: string, segmentCode: string) {
  if (naceCode.startsWith("93.12") || hasAnyContext(context, "idrettslag", "sportsklubb", "idrettsklubb", "sports club")) {
    return "En ryddig nettside kan gjøre det enkelt å presentere aktivitetene deres, informere om treningstilbud og medlemskap – og vise interesserte hvordan de kan bli med eller ta kontakt.";
  }
  if (segmentCode === "FORENING_KLUBB" || naceCode.startsWith("94")) {
    return "En ryddig nettside kan samle informasjon om aktiviteter, arrangementer og medlemskap – og gjøre det enkelt for interesserte å finne kontaktpersoner eller bli med.";
  }
  if (hasAnyContext(context, "psykolog", "psykoter", "psykisk helse", "samtaleterapi")) {
    return "For psykologtjenester er tillit og trygg kommunikasjon spesielt viktig. Hvis nettsiden har kontaktskjema, bør personvern og GDPR også ivaretas fordi henvendelser kan inneholde sensitive opplysninger.";
  }
  if (hasAnyContext(context, "fotterapi", "fotterapeut", "fotpleie")) {
    return "For en fotterapeut bør nettsiden gjøre det enkelt å forstå behandlingstilbudet, finne praktisk informasjon og bestille eller spørre om en time.";
  }
  if (hasAnyContext(context, "fysioter", "kiropr", "osteopat", "naprapat", "akupunkt", "ergoter")) {
    return "For en behandlingspraksis er en tydelig presentasjon av behandlingstilbudet, praktisk informasjon og en trygg kontakt- eller bestillingsvei viktig for nye kunder.";
  }
  if (segmentCode === "HELSE_VELVAERE" || naceCode.startsWith("86") || naceCode.startsWith("88") || naceCode === "96.040") {
    return "For helse- og behandlingstjenester er tillit, tydelig informasjon og en trygg vei til kontakt viktig. Hvis nettsiden har skjemaer, bør personvern og GDPR samtidig ivaretas på en ryddig måte.";
  }
  if (hasAnyContext(context, "snackbar", "gatekjokken", "hurtigmat", "kafe", "cafe", "restaurant", "catering", "servering")) {
    return "For et serveringssted kan gode bilder, en tydelig meny og lett tilgjengelige åpningstider gjøre det enklere for nye kunder å velge stedet og finne frem.";
  }
  if (segmentCode === "MAT_SERVERING" || naceCode.startsWith("56")) {
    return "For en mat- og serveringsvirksomhet kan gode bilder, tydelig informasjon om tilbudet og lett tilgjengelige åpningstider og adresse være særlig viktig.";
  }
  if (hasAnyContext(context, "snekker", "tomrer", "byggmester", "mobelsnekker", "trearbeid")) {
    return "For et snekkerfirma er gode bilder og referanser fra tidligere oppdrag viktige for å vise kvaliteten på arbeidet og skape tillit hos nye kunder.";
  }
  if (segmentCode === "HANDVERK" || naceCode.startsWith("41") || naceCode.startsWith("42") || naceCode.startsWith("43")) {
    return "For en håndverksbedrift kan bilder og referanser fra tidligere oppdrag, en tydelig tjenesteoversikt og informasjon om området dere dekker gjøre det enklere å få relevante forespørsler.";
  }

  return null;
}

function laterIndustryOutreachPitch(context: string, naceCode: string, segmentCode: string, emailPitch: string | null | undefined) {
  if (hasAnyContext(context, "forlag", "oversett", "translator", "publisher")) {
    return "For et forlag eller en oversettelsesvirksomhet kan nettsiden presentere språk og tjenester, bygge faglig tillit og etter hvert vise frem forfattere og utgivelser.";
  }
  if (hasAnyContext(context, "fotograf", "foto", "videograf", "filmproduksjon")) {
    return "For foto- og medietjenester er en ryddig portefølje med gode arbeidsprøver viktig for å vise stil, kvalitet og hva nye kunder kan bestille.";
  }
  if (hasAnyContext(context, "frisor", "barber", "hudpleie", "skjonnhet", "negledesign", "salong")) {
    return "For en salong eller skjønnhetsvirksomhet kan gode bilder, tydelig behandlingsoversikt, priser og enkel timebestilling gjøre det lettere for nye kunder å velge dere.";
  }
  if (segmentCode === "RENHOLD_OG_DRIFT") {
    return "For renhold og drift er det viktig å vise hvilke tjenester dere tilbyr, området dere dekker og hvordan privat- eller bedriftskunder kan be om et tilbud.";
  }
  if (segmentCode === "HAGE_OG_GRONTANLEGG") {
    return "For hage- og grøntarbeid kan bilder av tidligere oppdrag, sesongtjenester og tydelig informasjon om området dere dekker gjøre tilbudet mer konkret.";
  }
  if (segmentCode === "BUTIKK_LOKALHANDEL" || naceCode.startsWith("47")) {
    return "For en butikk eller produktvirksomhet kan gode produktbilder, tydelig vareutvalg, åpningstider og praktisk kjøpsinformasjon gjøre det enklere for kundene å handle.";
  }
  if (segmentCode === "TRANSPORT") {
    return "For transport- og budtjenester bør nettsiden raskt vise hvilke oppdrag dere tar, området dere dekker og hvordan kunder kan be om pris eller bestille.";
  }
  if (segmentCode === "KONSULENT") {
    return "For en konsulent- eller fagvirksomhet er det særlig viktig å forklare kompetansen, hvem dere hjelper og hvilke oppdrag kunder kan ta kontakt om.";
  }
  if (segmentCode === "PERSONLIG_TJENESTE") {
    return "For personlige tjenester kan en tydelig presentasjon av tilbudet, priser eller praktisk informasjon og enkel kontakt eller booking gjøre valget tryggere for nye kunder.";
  }

  if (segmentCode === "ANNET" || !emailPitch) {
    return "En ryddig nettside kan gjøre det enkelt å vise hva dere tilbyr, hvem tilbudet passer for og hvordan interesserte kan ta kontakt.";
  }
  return emailPitch;
}

function companyEntityDefinite(company: OutreachEmailCompany) {
  const context = normalizeContextText([company.name, company.naceDescription, company.salesSegment?.label].filter(Boolean).join(" "));
  const naceCode = company.naceCode?.trim() ?? "";
  if (naceCode.startsWith("93.12") || hasAnyContext(context, "idrettslag", "sportsklubb", "idrettsklubb")) return "klubben";
  if (company.salesSegment?.code === "FORENING_KLUBB" || naceCode.startsWith("94")) return "foreningen";
  return "virksomheten";
}

function hasAnyContext(context: string, ...phrases: string[]) {
  return phrases.some((phrase) => context.includes(normalizeContextText(phrase)));
}

export function buildOutreachEmailSubject(markdown: string, company: OutreachEmailCompany) {
  const config = outreachEmailTemplateConfig(company);
  const template = extractMailSubject(markdown, config.heading) ?? config.subjectFallback;
  return applyOutreachTemplate(template, company);
}

export function buildOutreachEmailBody(markdown: string, company: OutreachEmailCompany) {
  const config = outreachEmailTemplateConfig(company);
  const template = extractMarkdownSection(markdown, config.heading) ?? config.bodyFallback();
  const cleanedTemplate = removeMailSubjectLine(template);
  return applyOutreachTemplate(cleanedTemplate, company);
}

export function buildFollowUpEmailSubject(markdown: string, company: OutreachEmailCompany) {
  const template = extractMailSubject(markdown, "Oppfølging etter 4–14 arbeidsdager")
    ?? "Oppfølging: nettside for {{companyName}}";
  return applyOutreachTemplate(template, company);
}

export function buildFollowUpEmailBody(markdown: string, company: OutreachEmailCompany) {
  const template = extractMarkdownSection(markdown, "Oppfølging etter 4–14 arbeidsdager")
    ?? defaultFollowUpEmailTemplate();
  return applyOutreachTemplate(removeMailSubjectLine(template), company);
}

type OutreachEmailTemplateConfig = {
  heading: string;
  subjectFallback: string;
  bodyFallback: () => string;
};

function outreachEmailTemplateConfig(company: OutreachEmailCompany): OutreachEmailTemplateConfig {
  if (isRegisteredWebsiteUnavailable(company)) {
    return {
      heading: "E-postmal - registrert nettside svarer ikke",
      subjectFallback: "Nettsiden til {{companyName}} svarte ikke",
      bodyFallback: defaultRegisteredWebsiteUnavailableEmailTemplate,
    };
  }
  if (hasWebsiteQualityOpportunity(company)) {
    return {
      heading: "E-postmal - nettside kan forbedres",
      subjectFallback: "En observasjon om nettsiden til {{companyName}}",
      bodyFallback: defaultWebsiteQualityOpportunityEmailTemplate,
    };
  }
  if (hasRegisteredWebsiteForManualReview(company)) {
    return {
      heading: "E-postmal - registrert nettside bør vurderes manuelt",
      subjectFallback: "Nettsiden til {{companyName}}",
      bodyFallback: defaultRegisteredWebsiteReviewEmailTemplate,
    };
  }
  return {
    heading: "E-postmal",
    subjectFallback: "Et forslag til nettside for {{companyName}}",
    bodyFallback: defaultOutreachEmailTemplate,
  };
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
    const hasMatchingSignal = signals.some((item) => item.code === candidate.code && (candidate.include?.(item.severity) ?? true));
    if (hasMatchingSignal) {
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

    const rendered = renderEmailParagraph(lines, index);
    parts.push(rendered.html);
    index += rendered.extraLinesConsumed;
  }

  closeList();

  return `<div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.55; color: #1F2933;">${parts.join("")}</div>`;
}

function renderEmailParagraph(lines: string[], index: number) {
  const line = lines[index].trim();
  const signatureBlock = collectSignatureBlock(lines, index);
  if (signatureBlock.length > 0) {
    return {
      html: `<p style="margin: 0 0 14px;">${signatureBlock.map(renderInlineHtml).join("<br>")}</p>`,
      extraLinesConsumed: signatureBlock.length - 1,
    };
  }
  const nextLine = lines[index + 1]?.trim() ?? "";
  const exampleLabels = new Set(["Se eksempel her:", "Eksempel på enkel side:", "Eksempel:"]);
  if (exampleLabels.has(line) && isHttpUrl(nextLine)) {
    return {
      html: `<p style="margin: 0 0 14px;">${escapeHtml(line)} <a href="${escapeHtml(nextLine)}" style="color: #1F5FA9;">Se eksempel</a></p>`,
      extraLinesConsumed: 1,
    };
  }
  return { html: `<p style="margin: 0 0 14px;">${renderInlineHtml(line)}</p>`, extraLinesConsumed: 0 };
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

  const match = /Emne:\s*`?([^\n`]+)`?/.exec(section);
  return match?.[1]?.trim() ?? null;
}

function removeMailSubjectLine(template: string) {
  const subjectLine = /^Emne:.*(?:\r?\n|$)/m.exec(template);
  if (!subjectLine) {
    return template.trim();
  }
  return template.slice(subjectLine.index + subjectLine[0].length).trim();
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
    [PERSONAL_OBSERVATION_PLACEHOLDER]: personalObservation(company),
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
    "{{salesSegmentPitch}}": industryOutreachPitch(company),
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

${PERSONAL_OBSERVATION_PLACEHOLDER}

{{websiteQualityMailLine}}
{{websiteQualityImpactLine}}

Dette er ikke en full gjennomgang, men det kan være verdt å se nærmere på.

Hvis dette kan være interessant, sender jeg gjerne en kort og uforpliktende rapport med konkrete funn og forslag til forbedringer.

Her er et eksempel på hva jeg ser etter:
{{websiteCheckSenderWebsite}}

Skal jeg sende den?

Med vennlig hilsen
{{senderName}}
LTJ Production
{{senderPhone}}
{{senderEmail}}`;
}

function defaultRegisteredWebsiteUnavailableEmailTemplate() {
  return `{{greetingLine}}

${PERSONAL_OBSERVATION_PLACEHOLDER}

{{salesSegmentPitch}}

Jeg så også at {{registeredWebsite}} er registrert som nettside, men siden svarte ikke da jeg sjekket. Det kan selvfølgelig være midlertidig.

Jeg lager profesjonelle og mobiltilpassede nettsider for små virksomheter og organisasjoner.

En førsteside koster fast {{priceValue}} kr og tilpasses med deres innhold, bilder og kontaktinformasjon. Jeg hjelper også med publisering. Dersom dere senere ønsker flere sider, påmelding, booking, nettbutikk eller andre funksjoner, kan dette bygges ut etter avtale. Domene og drift avklarer vi ut fra hva dere allerede har og trenger.

Her kan dere se hvordan jeg jobber:
{{senderWebsite}}

Hvis dette kan være interessant, sender jeg gjerne et kort og uforpliktende forslag til hvordan nettsiden for {{companyName}} kan bygges opp.

Med vennlig hilsen
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

${PERSONAL_OBSERVATION_PLACEHOLDER}

Jeg tilbyr korte nettsidesjekker med vurdering av blant annet mobilbruk, kontaktinformasjon, teknisk kvalitet og personvern.

Hvis dette kan være interessant, tar jeg gjerne en nærmere titt på siden deres og sender noen konkrete og uforpliktende forslag.

Her kan dere se hva sjekken omfatter:
{{websiteCheckSenderWebsite}}

Kan det være interessant?

Med vennlig hilsen
{{senderName}}
LTJ Production
{{senderPhone}}
{{senderEmail}}`;
}

function defaultOutreachEmailTemplate() {
  return `{{greetingLine}}

${PERSONAL_OBSERVATION_PLACEHOLDER}

{{salesSegmentPitch}}

Jeg lager profesjonelle og mobiltilpassede nettsider for små virksomheter og organisasjoner.

En førsteside koster fast {{priceValue}} kr og tilpasses med deres innhold, bilder og kontaktinformasjon. Jeg hjelper også med publisering.

Dersom dere senere ønsker flere sider, påmelding, booking, nettbutikk eller andre funksjoner, kan dette bygges ut etter avtale. Domene og drift avklarer vi ut fra hva dere allerede har og trenger.

Her kan dere se et eksempel på hvordan jeg arbeider:
{{senderWebsite}}

Hvis dette kan være interessant, sender jeg gjerne et kort og uforpliktende forslag til hvordan nettsiden for {{companyName}} kan bygges opp.

Med vennlig hilsen
{{senderName}}
LTJ Production
{{senderPhone}}
{{senderEmail}}`;
}

function defaultFollowUpEmailTemplate() {
  return `{{greetingLine}}

Ville bare høre om {{recipientSubject}} fikk sett meldingen min om nettside for {{companyName}}.

Jeg tror det kan løses ryddig uten å gjøre prosjektet større enn nødvendig.

Hvis dette kan være interessant, sender jeg gjerne et kort og uforpliktende forslag til hvordan siden kan bygges opp.

Med vennlig hilsen
{{senderName}}
LTJ Production
{{senderPhone}}
{{senderEmail}}`;
}

function firstNameFromContactName(value: string) {
  const firstSpace = value.indexOf(" ");
  return firstSpace < 0 ? value : value.slice(0, firstSpace);
}

function displayCompanyName(company: Pick<OutreachEmailCompany, "name" | "organizationForm">) {
  const suffixes = ["AS", "ASA", "ENK", "NUF", "DA", "ANS", "SA", "BA", "LTD", "LIMITED", "LLC", "INC", "GMBH", "OU", "OÜ"];
  const trimmedName = company.name.trim();
  const upperName = trimmedName.toUpperCase();
  const suffix = suffixes.find((candidate) => upperName.endsWith(` ${candidate}`) || upperName.endsWith(`.${candidate}`));
  const nameWithoutSuffix = suffix ? trimmedName.slice(0, -(suffix.length + 1)).trim() : trimmedName;
  return naturalCompanyName(nameWithoutSuffix);
}

function naturalCompanyName(value: string) {
  const letters = value.match(/\p{L}/gu) ?? [];
  if (letters.length === 0 || letters.some((letter) => letter !== letter.toLocaleUpperCase("nb-NO"))) {
    return value;
  }
  return value
    .toLocaleLowerCase("nb-NO")
    .replace(/(^|[\s/\-–(])\p{L}/gu, (letter) => letter.toLocaleUpperCase("nb-NO"));
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

  const suggestions = new Set<string>();
  const normalizedWords = coreNameWords.length > 0 ? coreNameWords : words.slice(0, 4);
  const normalized = normalizedWords
    .join("-")
    .replace(/-+/g, "-")
    .replace(/^-/, "")
    .replace(/-$/, "");
  if (normalized) {
    suggestions.add(`${normalized}.no`);
  }
  const compactName = coreNameWords.length > 0 ? coreNameWords.join("") : words.slice(0, 2).join("");
  if (compactName && compactName !== normalized.replaceAll("-", "") && compactName.length >= 5 && compactName.length <= 24) {
    suggestions.add(`${compactName}.no`);
  }
  addLocationDomainSuggestions(suggestions, compactName, words, coreNameWords, locationWord);
  addEmailDomainSuggestions(suggestions, emailWords, coreNameWords);
  addEmailDomainSuggestions(suggestions, emailDomainWords, coreNameWords);
  return (suggestions.size > 0 ? [...suggestions] : ["firmanavn.no"]).slice(0, 4);
}

function addLocationDomainSuggestions(
  suggestions: Set<string>, compactName: string, words: string[], coreNameWords: string[], locationWord: string | null,
) {
  if (!locationWord || words.length === 0) return;
  if (compactName.length >= 5 && compactName.length + locationWord.length <= 26) {
    suggestions.add(withOptionalLocation(compactName, locationWord));
  }
  if (coreNameWords.length === 0 && words[0].length + locationWord.length <= 24) {
    suggestions.add(withOptionalLocation(words[0], locationWord));
  }
}

function addEmailDomainSuggestions(suggestions: Set<string>, emailWords: string[], coreNameWords: string[]) {
  if (!shouldUseEmailDomainHint(emailWords, coreNameWords)) return;
  suggestions.add(`${emailWords.join("")}.no`);
  if (emailWords.length >= 2) suggestions.add(`${emailWords.join("-")}.no`);
}

function normalizedCompanyNameWords(companyName: string, excludedWords: string[]) {
  const separatorIndex = companyName.indexOf(" - ");
  let namePart = companyName;
  if (separatorIndex >= 0) namePart = companyName.slice(0, separatorIndex);
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
  let cleanedLocalPart = localPart.replace(/\bog\b/gi, " og ");
  const companySuffix = ["asa", "enk", "nuf", "ans", "as", "da", "sa", "ba"]
    .find((suffix) => cleanedLocalPart.toLowerCase().endsWith(suffix));
  if (companySuffix) {
    cleanedLocalPart = `${cleanedLocalPart.slice(0, -companySuffix.length)} ${companySuffix}`;
  }
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

  const suggestions = new Set<string>();
  addFoodEmailSuggestions(suggestions, emailWords);
  addFoodBrandSuggestions(suggestions, words, locationWord);

  const firstWord = words[0];
  if (firstWord && firstWord.length <= 16) {
    if (locationWord && firstWord.length + locationWord.length <= 24) {
      suggestions.add(withOptionalLocation(firstWord, locationWord));
      suggestions.add(withOptionalLocation(`${firstWord}-catering`, locationWord));
    }
    suggestions.add(`${firstWord}catering.no`);
  }

  if (locationWord) {
    suggestions.add(`catering-${locationWord}.no`);
  }

  return [...suggestions].slice(0, 4);
}

function addFoodEmailSuggestions(suggestions: Set<string>, emailWords: string[]) {
  if (emailWords.length === 0) return;
  const emailBrand = emailWords.join("");
  if (emailBrand.length >= 5 && emailBrand.length <= 24) suggestions.add(`${emailBrand}.no`);
  const hyphenatedEmailBrand = emailWords.join("-");
  if (emailWords.length >= 2 && hyphenatedEmailBrand.length >= 5 && hyphenatedEmailBrand.length <= 28) {
    suggestions.add(`${hyphenatedEmailBrand}.no`);
  }
}

function addFoodBrandSuggestions(suggestions: Set<string>, words: string[], locationWord: string | null) {
  if (words.length < 2) return;
  const compactBrand = words.slice(0, 2).join("");
  if (compactBrand.length < 5 || compactBrand.length > 20) return;
  if (locationWord && compactBrand.length + locationWord.length <= 26) {
    suggestions.add(withOptionalLocation(compactBrand, locationWord));
  }
  suggestions.add(`${compactBrand}.no`);
  suggestions.add(`${compactBrand}-catering.no`);
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
  const atIndex = value.indexOf("@");
  const dotIndex = value.lastIndexOf(".");
  return atIndex > 0
    && atIndex === value.lastIndexOf("@")
    && dotIndex > atIndex + 1
    && dotIndex < value.length - 1
    && !Array.from(value).some((character) => character.trim().length === 0);
}
