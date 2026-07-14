package io.ltj.nyfirmasjekk.api.v1;

import io.ltj.nyfirmasjekk.announcements.AnnouncementService;
import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import io.ltj.nyfirmasjekk.brreg.RollerResponse;
import io.ltj.nyfirmasjekk.companycheck.OrganizationFormCatalog;
import io.ltj.nyfirmasjekk.companycheck.CheckFinding;
import io.ltj.nyfirmasjekk.companycheck.CompanyCheck;
import io.ltj.nyfirmasjekk.companycheck.CompanyFacts;
import io.ltj.nyfirmasjekk.companycheck.TrafficLight;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.regex.Pattern;

@Component
public class CompanyApiV1Mapper {
    private static final String SERVICE_SUFFIX = "service";
    private static final String HTTPS_PREFIX = "https://";
    private static final String SOURCE_BRREG = "BRREG";
    private static final String SOURCE_BRREG_ANNOUNCEMENTS = "BRREG kunngjøringer";
    private static final String SOURCE_BRREG_UNIT_REGISTER = "BRREG Enhetsregisteret";
    private static final String SOURCE_BRREG_BASE_DATA = "BRREG grunndata";
    private static final String SOURCE_INTERNAL_NETWORK_SNAPSHOT = "Intern nettverkssnapshot / BRREG";
    private static final String CONFIDENCE_MEDIUM = "MEDIUM";
    private static final String DISCOVERY_POSSIBLE_MATCH = "POSSIBLE_MATCH";
    private static final String SIGNAL_TECHNICAL_FAILURE = "TECHNICAL_FAILURE";
    private static final String SIGNAL_MISSING_HTTPS = "MISSING_HTTPS";
    private static final String LABEL_WEBSITE_UNREACHABLE = "Nettsiden svarer ikke";
    private static final String LABEL_MISSING_HTTPS = "Mangler HTTPS";
    private static final String REGISTERED_WEBSITE_REASON = "Nettsiden er registrert i BRREG.";
    private static final String EVIDENCE_BANKRUPTCY_REGISTERED = "Konkurs registrert";
    private static final String WEBSITE_STATUS_WEAK = "WEAK";
    private static final String WEBSITE_STATUS_NEEDS_REVIEW = "NEEDS_REVIEW";
    private static final String WEBSITE_STATUS_OK = "OK";
    private static final String SIGNAL_FORM_AUTOCOMPLETE_MISSING = "FORM_AUTOCOMPLETE_MISSING";
    private static final String SIGNAL_ADMIN_OR_LOGIN_PATH_EXPOSED = "ADMIN_OR_LOGIN_PATH_EXPOSED";
    private static final String SIGNAL_SECURITY_TXT_MISSING = "SECURITY_TXT_MISSING";
    private static final String SIGNAL_WEAK_HSTS_HEADER = "WEAK_HSTS_HEADER";
    private static final String SIGNAL_WEAK_CSP_HEADER = "WEAK_CSP_HEADER";
    private static final String SIGNAL_API_ENDPOINTS_VISIBLE = "API_ENDPOINTS_VISIBLE";
    private static final String SIGNAL_DUPLICATE_META_DESCRIPTIONS = "DUPLICATE_META_DESCRIPTIONS";
    private static final String SIGNAL_FORM_LABEL_RISK = "FORM_LABEL_RISK";
    private static final String SIGNAL_MISSING_CSP_HEADER = "MISSING_CSP_HEADER";
    private static final String SIGNAL_WEAK_PAGE_LANDMARKS = "WEAK_PAGE_LANDMARKS";
    private static final String SIGNAL_MOTION_ACCESSIBILITY_RISK = "MOTION_ACCESSIBILITY_RISK";
    private static final String SIGNAL_WEAK_NAVIGATION = "WEAK_NAVIGATION";
    private static final String SIGNAL_GENERIC_SERVICE_TEXT = "GENERIC_SERVICE_TEXT";
    private static final String SIGNAL_MISSING_META_DESCRIPTION = "MISSING_META_DESCRIPTION";
    private static final String SIGNAL_IMAGE_ALT_RISK = "IMAGE_ALT_RISK";
    private static final String SIGNAL_COOKIE_SAMESITE_REVIEW = "COOKIE_SAMESITE_REVIEW";
    private static final String SIGNAL_LEGAL_NAME_NOT_VISIBLE = "LEGAL_NAME_NOT_VISIBLE";
    private static final String SIGNAL_MISSING_STRUCTURED_DATA = "MISSING_STRUCTURED_DATA";
    private static final String SIGNAL_INSECURE_FORM_ACTION = "INSECURE_FORM_ACTION";
    private static final String SIGNAL_MIXED_CONTENT_RISK = "MIXED_CONTENT_RISK";
    private static final String SIGNAL_WEAK_HOMEPAGE_STRUCTURE = "WEAK_HOMEPAGE_STRUCTURE";
    private static final String SIGNAL_TARGET_BLANK_NOOPENER_MISSING = "TARGET_BLANK_NOOPENER_MISSING";
    private static final String SIGNAL_COOKIE_SECURE_FLAG_MISSING = "COOKIE_SECURE_FLAG_MISSING";
    private static final String SIGNAL_DNS_CAA_MISSING = "DNS_CAA_MISSING";
    private static final String SIGNAL_MISSING_HSTS_HEADER = "MISSING_HSTS_HEADER";
    private static final String SIGNAL_MANY_THIRD_PARTY_SCRIPT_HOSTS = "MANY_THIRD_PARTY_SCRIPT_HOSTS";
    private static final String SIGNAL_INLINE_EVENT_HANDLER_REVIEW = "INLINE_EVENT_HANDLER_REVIEW";
    private static final String SIGNAL_CMS_VERSION_EXPOSED = "CMS_VERSION_EXPOSED";
    private static final String SIGNAL_JAVASCRIPT_HREF_REVIEW = "JAVASCRIPT_HREF_REVIEW";
    private static final String SIGNAL_SERVER_TECH_HEADER_EXPOSED = "SERVER_TECH_HEADER_EXPOSED";
    private static final String SIGNAL_WEAK_TITLE = "WEAK_TITLE";
    private static final String SIGNAL_MISSING_ADDRESS_OR_AREA = "MISSING_ADDRESS_OR_AREA";
    private static final String SIGNAL_COOKIE_CONSENT_RISK = "COOKIE_CONSENT_RISK";
    private static final String SIGNAL_IFRAME_TITLE_RISK = "IFRAME_TITLE_RISK";
    private static final String SIGNAL_MANY_INLINE_SCRIPTS_WITHOUT_CSP = "MANY_INLINE_SCRIPTS_WITHOUT_CSP";
    private static final String SIGNAL_MISSING_ORG_NUMBER = "MISSING_ORG_NUMBER";
    private static final String SIGNAL_ROBOTS_SENSITIVE_PATHS = "ROBOTS_SENSITIVE_PATHS";
    private static final String SIGNAL_MISSING_ABOUT_SECTION = "MISSING_ABOUT_SECTION";
    private static final String SIGNAL_WEAK_SHARE_PREVIEW = "WEAK_SHARE_PREVIEW";
    private static final String SIGNAL_SENSITIVE_HEALTH_CONTEXT = "SENSITIVE_HEALTH_CONTEXT";
    private static final String SIGNAL_WEAK_INDUSTRY_RELEVANCE = "WEAK_INDUSTRY_RELEVANCE";
    private static final String SIGNAL_MISSING_MAIN_LANDMARK = "MISSING_MAIN_LANDMARK";
    private static final String SIGNAL_SOURCE_MAP_EXPOSED = "SOURCE_MAP_EXPOSED";
    private static final String SIGNAL_EXTERNAL_FORM_ACTION = "EXTERNAL_FORM_ACTION";
    private static final String SIGNAL_PERSONAL_DATA_GET_FORM = "PERSONAL_DATA_GET_FORM";
    private static final String SIGNAL_MISSING_FRAME_PROTECTION = "MISSING_FRAME_PROTECTION";
    private static final String SIGNAL_MISSING_REFERRER_POLICY = "MISSING_REFERRER_POLICY";
    private static final String SIGNAL_OUTDATED_JS_LIBRARY_REVIEW = "OUTDATED_JS_LIBRARY_REVIEW";
    private static final String SIGNAL_DEVELOPMENT_REFERENCE_EXPOSED = "DEVELOPMENT_REFERENCE_EXPOSED";
    private static final String SIGNAL_INCOMPLETE_MARKET_OR_CHECKOUT = "INCOMPLETE_MARKET_OR_CHECKOUT";
    private static final String SIGNAL_THIRD_PARTY_SCRIPT_INTEGRITY_REVIEW = "THIRD_PARTY_SCRIPT_INTEGRITY_REVIEW";
    private static final String SIGNAL_VAGUE_LINK_TEXT = "VAGUE_LINK_TEXT";
    private static final String SIGNAL_THIN_CONTENT = "THIN_CONTENT";
    private static final String SIGNAL_COOKIE_HTTPONLY_REVIEW = "COOKIE_HTTPONLY_REVIEW";
    private static final String SIGNAL_SKIPPED_HEADING_LEVELS = "SKIPPED_HEADING_LEVELS";
    private static final String SIGNAL_LOGIN_FORM_SECURITY_REVIEW = "LOGIN_FORM_SECURITY_REVIEW";
    private static final String SIGNAL_POST_FORM_CSRF_REVIEW = "POST_FORM_CSRF_REVIEW";
    private static final String SIGNAL_MISSING_PERMISSIONS_POLICY = "MISSING_PERMISSIONS_POLICY";
    private static final String SIGNAL_EMPTY_BUTTON_RISK = "EMPTY_BUTTON_RISK";
    private static final String SIGNAL_DOM_XSS_SURFACE_REVIEW = "DOM_XSS_SURFACE_REVIEW";
    private static final String SIGNAL_DANGEROUS_JS_SINK_REVIEW = "DANGEROUS_JS_SINK_REVIEW";
    private static final String SIGNAL_GENERIC_OR_AI_IMAGE_RISK = "GENERIC_OR_AI_IMAGE_RISK";
    private static final String SIGNAL_AI_LIKE_PRESENTATION_RISK = "AI_LIKE_PRESENTATION_RISK";
    private static final String SIGNAL_GENERIC_PRESENTATION_TRUST_RISK = "GENERIC_PRESENTATION_TRUST_RISK";
    private static final String EVENT_REGISTRATION = "REGISTRATION";
    private static final String EVENT_BANKRUPTCY = "BANKRUPTCY";
    private static final String EVENT_DISSOLUTION = "DISSOLUTION";
    private static final String EVENT_WINDING_UP = "WINDING_UP";
    private static final String SIGNAL_BO = "BO_SIGNAL";
    private static final String SIGNAL_BANKRUPTCY = "BANKRUPTCY_SIGNAL";
    private static final String SIGNAL_DISSOLUTION = "DISSOLUTION_SIGNAL";
    private static final String SIGNAL_RECENT_BANKRUPTCY_RELATION = "RECENT_BANKRUPTCY_RELATION";
    private static final String SIGNAL_RECENT_DISSOLUTION_RELATION = "RECENT_DISSOLUTION_RELATION";
    private static final String SIGNAL_CLUSTERED_NEW_COMPANY_PATTERN = "CLUSTERED_NEW_COMPANY_PATTERN";
    private static final String ROLE_DAGLIG_LEDER = "DAGLIG_LEDER";
    private static final String ROLE_STYRELEDER = "STYRELEDER";
    private static final Set<String> DOMAIN_STOP_WORDS = Set.of("as", "enk", "nuf", "sa", "fli", "da", "ans");
    private static final Set<String> DOMAIN_TRAILING_QUALIFIERS = Set.of(
            "ny",
            "drift",
            "holding",
            "holdings",
            "eiendom",
            "eiendommer",
            "invest",
            "investment",
            "investments",
            "norge",
            "norway",
            "group",
            "gruppen"
    );
    private static final Set<String> DOMAIN_SEQUENCE_TOKENS = Set.of("i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x");
    private static final Map<String, String> DOMAIN_COMPOUND_SUFFIX_REPLACEMENTS = Map.of(
            "vedlikeholdsservice", SERVICE_SUFFIX,
            "renholdsservice", SERVICE_SUFFIX,
            "batservice", SERVICE_SUFFIX,
            "byggservice", SERVICE_SUFFIX,
            "vaktmesterservice", SERVICE_SUFFIX
    );
    private static final Pattern EMAIL_PATTERN = Pattern.compile("[A-Z0-9._%+-]++@(?:[A-Z0-9-]++\\.)++[A-Z]{2,63}\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern PHONE_PATTERN = Pattern.compile("(?:\\+47\\s*)?(?:\\d[\\s-]?){7}\\d");
    private static final Pattern COPYRIGHT_YEAR_PATTERN = Pattern.compile("(?i)(copyright|©|&copy;)\\s*(20\\d{2})");
    private static final Pattern WEBSITE_IMAGE_ASSET_PATTERN = Pattern.compile("https?://[^\"'\\s;]+\\.(?:avif|webp|png|jpe?g)", Pattern.CASE_INSENSITIVE);
    private static final Pattern FOREIGN_ORGANIZATION_NUMBER_PATTERN = Pattern.compile("\\b(?:\\d{6}\\s\\d{4}|se\\d{10,12})\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern NON_ALPHANUMERIC_SPACE_PATTERN = Pattern.compile("[^a-z0-9 ]");
    private static final Set<String> WEAK_PAGE_TITLES = Set.of("home", "hjem", "untitled", "index", "velkommen", "coming soon");
    private static final Set<String> CALL_TO_ACTION_WORDS = Set.of(
            "kontakt", "contact", "ring", "bestill", "booking", "book", "send forespørsel", "be om tilbud", "få tilbud", "ta kontakt"
    );
    private static final Set<String> GENERIC_MARKETING_WORDS = Set.of(
            "kvalitet", SERVICE_SUFFIX, "profesjonell", "skreddersydd", "losninger", "løsninger", "erfaring", "dyktige", "trygg", "effektiv"
    );
    private static final Set<String> GENERIC_PRESENTATION_PHRASES = Set.of(
            "skaper leads",
            "se skarpere ut",
            "sterkere forsteinntrykk",
            "sterkere førsteinntrykk",
            "tydeligere system",
            "digitalt system",
            "digital profil",
            "målbar effekt",
            "malbar effekt",
            "uten stoy",
            "uten støy",
            "strategi til publisering",
            "kunder forstar verdien",
            "kunder forstår verdien",
            "ambisiose virksomheter",
            "ambisiøse virksomheter",
            "vekst",
            "konvertering",
            "optimalisering",
            "performance",
            "posisjonering",
            "bevisst uttrykk"
    );
    private static final Set<String> AI_LIKE_PRESENTATION_PHRASES = Set.of(
            "any business",
            "any product",
            "any industry",
            "for any industry",
            "real time",
            "human approved",
            "reads your site",
            "works out exactly what you do",
            "fresh leads every morning",
            "nothing sends without your say-so",
            "ready to send",
            "personalised email",
            "personalized email",
            "the right leads",
            "seamless",
            "effortless",
            "unlock",
            "scale faster",
            "at scale"
    );
    private static final Set<String> ABOUT_TRUST_WORDS = Set.of(
            "om oss", "om meg", "about us", "about me", "team", "ansatte", "medarbeidere", "hvem vi er", "hvem jeg er"
    );
    private static final Set<String> SOCIAL_PROOF_WORDS = Set.of(
            "referanse", "referanser", "kundeuttalelse", "kundeomtale", "anmeldelser", "reviews", "testimonials", "case", "prosjekter", "tidligere arbeid"
    );
    private static final Set<String> OPENING_HOURS_WORDS = Set.of(
            "apningstider", "åpningstider", "opening hours", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lordag", "lørdag", "sondag", "søndag"
    );
    private static final Set<String> TEMPLATE_PLACEHOLDER_WORDS = Set.of(
            "lorem ipsum", "under construction", "kommer snart", "coming soon", "test test", "placeholder", "dummy text"
    );
    private static final Set<String> GENERIC_IMAGE_SOURCE_WORDS = Set.of(
            "unsplash", "pexels", "pixabay", "shutterstock", "istock", "gettyimages", "stockphoto", "stock-photo", "aivisualization", "ai visualization", "midjourney", "stable-diffusion"
    );
    private static final Set<String> SOCIAL_LINK_HOSTS = Set.of(
            "facebook.com", "instagram.com", "linkedin.com", "tiktok.com", "youtube.com", "x.com", "twitter.com"
    );
    private static final Set<String> GENERIC_EMAIL_DOMAINS = Set.of(
            "gmail.com", "hotmail.com", "hotmail.no", "outlook.com", "live.com", "icloud.com", "yahoo.com", "yahoo.no", "online.no"
    );
    private static final Set<String> PUBLIC_SECTOR_WEBSITE_WORDS = Set.of(
            "nav.no",
            "arbeids- og velferdsetaten",
            "regjeringen.no",
            "departement",
            "direktorat",
            "tilsyn",
            "kommune",
            "fylkeskommune",
            "skatteetaten",
            "politiet",
            "helsenorge",
            "udi.no",
            "vegvesen"
    );
    private static final Set<String> SENSITIVE_HEALTH_CONTEXT_WORDS = Set.of(
            "helse",
            "journal",
            "pasient",
            "diagnose",
            "lege",
            "psykolog",
            "terapi",
            "klinikk",
            "reiseklinikk",
            "timebestilling",
            "konsultasjon",
            "behandling",
            "medisin",
            "vaksine",
            "vaksinasjon",
            "pasientjournal",
            "personopplysninger",
            "sensitive opplysninger",
            "helseopplysninger"
    );
    private static final Set<String> MEDICAL_DEVICE_CONTEXT_WORDS = Set.of(
            "surgical",
            "surgery",
            "laparoscopic",
            "laparoscopy",
            "medical device",
            "surgeon",
            "robotic camera",
            "camera for laparoscopy",
            "gynecology",
            "regulatory clearance",
            "laboratory testing"
    );
    private static final Set<String> REGULATORY_LIMIT_WORDS = Set.of(
            "not yet received regulatory clearance",
            "not available for use",
            "late stage development",
            "laboratory testing",
            "regulatory clearance"
    );
    private static final Map<String, String> THIRD_PARTY_WEBSITE_HOSTS = Map.ofEntries(
            Map.entry("instagram.com", "Instagram"),
            Map.entry("facebook.com", "Facebook"),
            Map.entry("linktr.ee", "Linktree"),
            Map.entry("wordpress.com", "WordPress.com"),
            Map.entry("wixsite.com", "Wix"),
            Map.entry("wix.com", "Wix"),
            Map.entry("squarespace.com", "Squarespace"),
            Map.entry("webnode.page", "Webnode"),
            Map.entry("webnode.no", "Webnode"),
            Map.entry("myshopify.com", "Shopify"),
            Map.entry("business.site", "Google Business Profile")
    );

    private final AnnouncementService announcementService;
    private final WebsiteReachabilityService websiteReachabilityService;
    private final WebsiteContentInspectionService websiteContentInspectionService;
    private final Clock clock;
    private static final int NEW_COMPANY_WINDOW_DAYS = 120;
    private static final int RELATION_TIMELINE_WINDOW_DAYS = 365;

    @Autowired
    public CompanyApiV1Mapper(
            AnnouncementService announcementService,
            WebsiteReachabilityService websiteReachabilityService,
            WebsiteContentInspectionService websiteContentInspectionService
    ) {
        this(announcementService, websiteReachabilityService, websiteContentInspectionService, Clock.systemDefaultZone());
    }

    CompanyApiV1Mapper(
            AnnouncementService announcementService,
            WebsiteReachabilityService websiteReachabilityService,
            WebsiteContentInspectionService websiteContentInspectionService,
            Clock clock
    ) {
        this.announcementService = announcementService;
        this.websiteReachabilityService = websiteReachabilityService;
        this.websiteContentInspectionService = websiteContentInspectionService;
        this.clock = clock;
    }

    public CompanySummary toSummary(CompanyCheck companyCheck, EnhetResponse enhet) {
        CompanyFacts facts = companyCheck.fakta();
        List<CompanyEvent> events = summaryEvents(enhet);
        return new CompanySummary(
                companyCheck.organisasjonsnummer(),
                companyCheck.navn(),
                organizationFormCode(enhet, facts),
                facts.registreringsdato(),
                municipality(enhet),
                county(enhet),
                naceCode(enhet),
                naceDescription(enhet),
                salesSegment(enhet),
                enhet.hjemmeside(),
                websiteDiscovery(companyCheck, enhet, false),
                enhet.epostadresse(),
                firstNonBlank(enhet.telefon(), enhet.mobil()),
                preferredSummaryContactName(facts),
                preferredSummaryContactRole(facts),
                enhet.registrertIMvaregisteret(),
                enhet.registrertIForetaksregisteret(),
                toScoreColor(companyCheck.status()),
                scoreReasons(companyCheck),
                events,
                structureSignals(companyCheck, enhet, events, List.of()),
                flags(enhet, facts)
        );
    }

    public CompanyDetails toDetails(CompanyCheck companyCheck, EnhetResponse enhet, RollerResponse roller, List<NetworkActor> network) {
        CompanyFacts facts = companyCheck.fakta();
        Role contactPerson = preferredContactRole(roller);
        List<CompanyEvent> events = events(enhet);
        return new CompanyDetails(
                companyCheck.organisasjonsnummer(),
                companyCheck.navn(),
                organizationFormCode(enhet, facts),
                facts.registreringsdato(),
                facts.stiftelsesdato(),
                status(enhet),
                address(enhet),
                postalCode(enhet),
                postalPlace(enhet),
                municipality(enhet),
                county(enhet),
                naceCode(enhet),
                naceDescription(enhet),
                salesSegment(enhet),
                enhet.hjemmeside(),
                websiteDiscovery(companyCheck, enhet, true),
                websiteQuality(companyCheck, enhet),
                enhet.epostadresse(),
                firstNonBlank(enhet.telefon(), enhet.mobil()),
                contactPerson == null ? null : contactPerson.name(),
                contactPerson == null ? null : contactPerson.type(),
                enhet.registrertIMvaregisteret(),
                enhet.registrertIForetaksregisteret(),
                enhet.antallAnsatte(),
                enhet.harRegistrertAntallAnsatte(),
                enhet.sisteInnsendteAarsregnskap(),
                toScore(companyCheck, enhet, events),
                roles(roller),
                events,
                structureSignals(companyCheck, enhet, events, network),
                flags(enhet, facts)
        );
    }

    private CompanyScoreResponse toScore(CompanyCheck companyCheck, EnhetResponse enhet, List<CompanyEvent> events) {
        return new CompanyScoreResponse(
                companyCheck.organisasjonsnummer(),
                toScoreColor(companyCheck.status()),
                scoreLabel(companyCheck.status()),
                scoreReasons(companyCheck),
                rules(companyCheck),
                scoreEvidence(companyCheck, enhet, events)
        );
    }

    public CompanySearchResponse toSearchResponse(List<CompanySummary> companies, int page, int size, long totalElements, int totalPages) {
        return new CompanySearchResponse(
                Math.max(page, 0),
                Math.max(size, 1),
                totalElements,
                totalPages,
                companies
        );
    }

    private ScoreColor toScoreColor(TrafficLight light) {
        return ScoreColor.valueOf(light.name());
    }

    private WebsiteDiscovery websiteDiscovery(CompanyCheck companyCheck, EnhetResponse enhet, boolean inspectAllCandidates) {
        if (hasText(enhet.hjemmeside())) {
            String website = normalizeWebsiteCandidate(enhet.hjemmeside());
            if (inspectAllCandidates) {
                boolean reachable = websiteReachabilityService.isReachable(website);
                WebsiteContentMatch contentMatch = reachable
                        ? websiteContentInspectionService.inspect(website, companyCheck.navn(), extractEmailDomain(enhet.epostadresse()))
                        : new WebsiteContentMatch(false, "Registrert nettside i BRREG svarte ikke ved teknisk sjekk.", null);
                return new WebsiteDiscovery(
                        "REGISTERED",
                        reachable ? "HIGH" : "LOW",
                        List.of(website),
                        reachable ? website : null,
                        reachable,
                        reachable,
                        contentMatch.reason(),
                        contentMatch.pageTitle(),
                        List.of(toWebsiteCandidateCheck(website, reachable, contentMatch)),
                        reachable
                                ? "Nettsiden er registrert i BRREG og svarte ved teknisk sjekk."
                                : "Nettsiden er registrert i BRREG, men svarte ikke ved teknisk sjekk.",
                        SOURCE_BRREG
                );
            }
            return new WebsiteDiscovery(
                    "REGISTERED",
                    "HIGH",
                    List.of(website),
                    website,
                    true,
                    true,
                    REGISTERED_WEBSITE_REASON,
                    null,
                    List.of(new WebsiteCandidateCheck(
                            website,
                            true,
                            true,
                            null,
                            REGISTERED_WEBSITE_REASON
                    )),
                    REGISTERED_WEBSITE_REASON,
                    SOURCE_BRREG
            );
        }

        String emailDomain = extractEmailDomain(enhet.epostadresse());
        if (hasText(emailDomain) && !isGenericEmailDomain(emailDomain)) {
            String candidate = HTTPS_PREFIX + emailDomain;
            if (!inspectAllCandidates) {
                return new WebsiteDiscovery(
                        DISCOVERY_POSSIBLE_MATCH,
                        CONFIDENCE_MEDIUM,
                        List.of(candidate),
                        null,
                        null,
                        null,
                        "Domene er utledet fra registrert e-postadresse, men ikke teknisk sjekket i listevisning.",
                        null,
                        List.of(),
                        "Mulig nettside er utledet fra registrert e-postadresse. Åpne detaljsiden for teknisk sjekk.",
                        "EMAIL_DOMAIN"
                );
            }
            boolean reachable = websiteReachabilityService.isReachable(candidate);
            WebsiteContentMatch contentMatch = reachable
                    ? websiteContentInspectionService.inspect(candidate, companyCheck.navn(), emailDomain)
                    : new WebsiteContentMatch(false, "Domene svarte ikke ved sjekk.", null);
            String confidence = "LOW";
            if (reachable) {
                confidence = contentMatch.matched() ? "HIGH" : CONFIDENCE_MEDIUM;
            }
            List<WebsiteCandidateCheck> candidateChecks = List.of(toWebsiteCandidateCheck(candidate, reachable, contentMatch));
            return new WebsiteDiscovery(
                    DISCOVERY_POSSIBLE_MATCH,
                    confidence,
                    List.of(candidate),
                    reachable ? candidate : null,
                    reachable,
                    contentMatch.matched(),
                    contentMatch.reason(),
                    contentMatch.pageTitle(),
                    candidateChecks,
                    reachable
                            ? "Domene er utledet fra registrert e-postadresse og svarte ved sjekk. Må fortsatt bekreftes manuelt."
                            : "Domene er utledet fra registrert e-postadresse, men svarte ikke ved sjekk. Må bekreftes manuelt.",
                    "EMAIL_DOMAIN"
            );
        }

        List<String> nameCandidates = nameBasedWebsiteCandidates(companyCheck.navn());
        if (!nameCandidates.isEmpty()) {
            if (!inspectAllCandidates) {
                return new WebsiteDiscovery(
                        DISCOVERY_POSSIBLE_MATCH,
                        "LOW",
                        nameCandidates,
                        null,
                        null,
                        null,
                        "Navnebaserte domene-forslag er ikke teknisk sjekket i listevisning.",
                        null,
                        List.of(),
                        "Navnebaserte domene-forslag uten bekreftet kobling. Åpne detaljsiden for teknisk sjekk.",
                        "NAME_HEURISTIC"
                );
            }
            List<WebsiteCandidateCheck> candidateChecks = checkWebsiteCandidates(nameCandidates, companyCheck.navn(), emailDomain);
            String reachableCandidate = preferredWebsiteCandidate(candidateChecks);
            WebsiteCandidateCheck preferredCheck = candidateChecks.stream()
                    .filter(check -> Objects.equals(check.url(), reachableCandidate))
                    .findFirst()
                    .orElse(null);
            boolean reachable = reachableCandidate != null;
            WebsiteContentMatch contentMatch = contentMatchForPreferredCandidate(
                    preferredCheck,
                    reachableCandidate,
                    companyCheck.navn(),
                    emailDomain
            );
            return new WebsiteDiscovery(
                    DISCOVERY_POSSIBLE_MATCH,
                    reachable && contentMatch.matched() ? CONFIDENCE_MEDIUM : "LOW",
                    nameCandidates,
                    reachableCandidate,
                    reachable,
                    contentMatch.matched(),
                    contentMatch.reason(),
                    contentMatch.pageTitle(),
                    candidateChecks,
                    reachable
                            ? "Navnebasert domene-forslag svarte ved sjekk, men uten bekreftet kobling til selskapet. Må bekreftes manuelt."
                            : "Navnebasert domene-forslag uten bekreftet kobling. Må bekreftes manuelt.",
                    "NAME_HEURISTIC"
            );
        }

        return new WebsiteDiscovery(
                "NONE",
                "LOW",
                List.of(),
                null,
                null,
                null,
                null,
                null,
                List.of(),
                "Ingen registrert nettside og ingen tydelig kandidat funnet.",
                "NONE"
        );
    }

    private WebsiteContentMatch contentMatchForPreferredCandidate(
            WebsiteCandidateCheck preferredCheck,
            String reachableCandidate,
            String companyName,
            String emailDomain
    ) {
        if (preferredCheck != null) {
            return new WebsiteContentMatch(
                    Boolean.TRUE.equals(preferredCheck.contentMatched()),
                    preferredCheck.reason(),
                    preferredCheck.pageTitle()
            );
        }
        if (reachableCandidate != null) {
            return websiteContentInspectionService.inspect(reachableCandidate, companyName, emailDomain);
        }
        return new WebsiteContentMatch(false, "Ingen av kandidatene svarte ved sjekk.", null);
    }

    private WebsiteQualityAssessment websiteQuality(CompanyCheck companyCheck, EnhetResponse enhet) {
        if (!hasText(enhet.hjemmeside())) {
            return null;
        }

        String website = normalizeWebsiteCandidate(enhet.hjemmeside());
        List<WebsiteQualitySignal> signals = new ArrayList<>();
        String thirdPartyPlatform = thirdPartyPlatform(website);
        if (thirdPartyPlatform != null) {
            signals.add(new WebsiteQualitySignal(
                    "THIRD_PARTY_SURFACE",
                    "Tredjepartsflate",
                    "BRREG-nettsiden peker mot " + thirdPartyPlatform + " i stedet for en egen nettside.",
                    "MEDIUM"
            ));
        }
        if (usesNonNorwegianDomain(enhet, website)) {
            signals.add(new WebsiteQualitySignal(
                    "NON_NO_DOMAIN",
                    "Ikke .no-domene",
                    "Virksomheten er AS/ENK, men registrert nettside bruker ikke .no-domene. Det er ikke feil, men norske kunder forventer ofte .no for lokale virksomheter.",
                    "INFO"
            ));
        }
        if (!website.startsWith(HTTPS_PREFIX)) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_MISSING_HTTPS,
                    LABEL_MISSING_HTTPS,
                    "Nettsiden er registrert uten HTTPS. Det kan gi svakere tillit og nettleservarsler.",
                    "MEDIUM"
            ));
        }

        boolean reachable = websiteReachabilityService.isReachable(website);
        if (!reachable) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_TECHNICAL_FAILURE,
                    "Teknisk feil",
                    "Nettsiden svarte ikke ved teknisk sjekk. Dette kan skyldes DNS, timeout, SSL-feil, 404/5xx eller midlertidig nedetid.",
                    "HIGH"
            ));
            return new WebsiteQualityAssessment(
                    WEBSITE_STATUS_WEAK,
                    LABEL_WEBSITE_UNREACHABLE,
                    "BRREG har registrert nettside, men den svarte ikke ved teknisk sjekk.",
                    signals
            );
        }

        WebsiteContentInspectionService.WebsiteContentSnapshot snapshot = websiteContentInspectionService.fetchSnapshot(website);
        if (snapshot == null) {
            signals.add(new WebsiteQualitySignal(
                    "CONTENT_UNREADABLE",
                    "Innhold kunne ikke leses",
                    "Nettsiden svarte, men innholdet kunne ikke leses for kvalitetssjekk.",
                    "MEDIUM"
            ));
            return contentUnreadableAssessment(signals);
        }

        addContentQualitySignals(signals, snapshot);
        addSharePreviewSignal(signals, snapshot);
        addStructuredDataSignal(signals, snapshot);
        addNavigationSignal(signals, snapshot);
        addContactQualitySignal(signals, snapshot, enhet);
        addLocalRelevanceSignal(signals, snapshot, enhet);
        addIndustryRelevanceSignal(signals, snapshot, enhet);
        addServiceDescriptionSignal(signals, snapshot, enhet);
        addTrustSignal(signals, snapshot, companyCheck, enhet);
        addCommercialTrustSignals(signals, snapshot, enhet);
        addActionSignal(signals, snapshot);
        addBrandDomainSignal(signals, companyCheck, website);
        addEmailDomainSignal(signals, snapshot, website);
        addFreshnessSignal(signals, snapshot);
        addResponsiveSignals(signals, snapshot);
        addAccessibilitySignals(signals, snapshot);
        addSecuritySignals(signals, website, snapshot);
        addPrivacySignals(signals, snapshot);
        addMedicalTrustSignals(signals, snapshot);
        addTechnologySignals(signals, snapshot);
        addPublicSectorContextSignal(signals, snapshot);

        return assessmentFromSignals(signals, signals.isEmpty()
                ? "Nettsiden svarte og de viktigste grunnsignalene ser greie ut."
                : "Nettsiden svarte, men har noen signaler som bør vurderes manuelt.", snapshot);
    }

    public WebsiteInspectionResponse inspectWebsite(String rawUrl) {
        return inspectWebsite(rawUrl, false);
    }

    public WebsiteInspectionResponse inspectWebsiteExtended(String rawUrl) {
        return inspectWebsite(rawUrl, true);
    }

    private WebsiteInspectionResponse inspectWebsite(String rawUrl, boolean extended) {
        if (!hasText(rawUrl)) {
            throw new IllegalArgumentException("URL mangler.");
        }

        String website = normalizeWebsiteCandidate(rawUrl);
        List<WebsiteQualitySignal> signals = new ArrayList<>();
        String thirdPartyPlatform = thirdPartyPlatform(website);
        if (thirdPartyPlatform != null) {
            signals.add(new WebsiteQualitySignal(
                    "THIRD_PARTY_SURFACE",
                    "Tredjepartsflate",
                    "Nettsiden peker mot " + thirdPartyPlatform + " i stedet for en egen nettside.",
                    "MEDIUM"
            ));
        }
        if (!website.startsWith(HTTPS_PREFIX)) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_MISSING_HTTPS,
                    LABEL_MISSING_HTTPS,
                    "Nettsiden bruker ikke HTTPS i oppgitt adresse. Det kan gi svakere tillit og nettleservarsler.",
                    "MEDIUM"
            ));
        }

        boolean reachable = websiteReachabilityService.isReachable(website);
        if (!reachable) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_TECHNICAL_FAILURE,
                    "Teknisk feil",
                    "Nettsiden svarte ikke ved teknisk sjekk. Dette kan skyldes DNS, timeout, SSL-feil, 404/5xx eller midlertidig nedetid.",
                    "HIGH"
            ));
            return new WebsiteInspectionResponse(
                    rawUrl,
                    website,
                    new WebsiteQualityAssessment(
                            WEBSITE_STATUS_WEAK,
                            LABEL_WEBSITE_UNREACHABLE,
                            "Nettsiden svarte ikke ved teknisk sjekk.",
                            signals
                    ),
                    List.of()
            );
        }

        WebsiteContentInspectionService.WebsiteContentSnapshot snapshot = extended
                ? websiteContentInspectionService.fetchExtendedSnapshot(website)
                : websiteContentInspectionService.fetchSnapshot(website);
        if (snapshot == null) {
            signals.add(new WebsiteQualitySignal(
                    "CONTENT_UNREADABLE",
                    "Innhold kunne ikke leses",
                    "Nettsiden svarte, men innholdet kunne ikke leses for kvalitetssjekk.",
                    "MEDIUM"
            ));
            return new WebsiteInspectionResponse(rawUrl, website, contentUnreadableAssessment(signals), List.of());
        }

        addContentQualitySignals(signals, snapshot);
        addSharePreviewSignal(signals, snapshot);
        addStructuredDataSignal(signals, snapshot);
        addNavigationSignal(signals, snapshot);
        addActionSignal(signals, snapshot);
        addFreshnessSignal(signals, snapshot);
        addResponsiveSignals(signals, snapshot);
        addAccessibilitySignals(signals, snapshot);
        addSecuritySignals(signals, website, snapshot);
        addPrivacySignals(signals, snapshot);
        addMedicalTrustSignals(signals, snapshot);
        addTechnologySignals(signals, snapshot);
        addPublicSectorContextSignal(signals, snapshot);
        addStandaloneWebsiteSignals(signals, snapshot);

        return new WebsiteInspectionResponse(
                rawUrl,
                website,
                assessmentFromSignals(signals, signals.isEmpty()
                        ? "Nettsiden svarte og de viktigste grunnsignalene ser greie ut."
                        : "Nettsiden svarte, men har noen signaler som bør vurderes manuelt.", snapshot),
                List.of()
        );
    }

    private void addStandaloneWebsiteSignals(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        if (snapshot.platformDomainSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "PLATFORM_DOMAIN_RISK",
                    "Bruker plattformdomene",
                    "Nettsiden ser ut til å ligge på et plattformdomene. Eget domene gir vanligvis et mer profesjonelt og lettere gjenkjennelig inntrykk.",
                    "MEDIUM"
            ));
        }
        if (snapshot.placeholderSocialLinkCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    "PLACEHOLDER_SOCIAL_LINKS",
                    "Mulig uferdige sosiale lenker",
                    snapshot.placeholderSocialLinkCount() + " sosial lenke ser ut til å peke til en generisk eller uferdig profil.",
                    "INFO"
            ));
        }
        if (isEffectiveEcommerceWebsite(snapshot)) {
            addCommerceSignals(signals, snapshot);
        }
    }

    private WebsiteQualityAssessment contentUnreadableAssessment(List<WebsiteQualitySignal> signals) {
        boolean hasHigh = signals.stream().anyMatch(signal -> "HIGH".equals(signal.severity()));
        String status = hasHigh ? WEBSITE_STATUS_WEAK : WEBSITE_STATUS_NEEDS_REVIEW;
        String label = hasHigh ? "Svak nettsideflate" : "Bør vurderes";
        return new WebsiteQualityAssessment(
                status,
                label,
                "Nettsiden svarer, men innholdet kunne ikke vurderes.",
                signals
        );
    }

    private WebsiteQualityAssessment assessmentFromSignals(List<WebsiteQualitySignal> signals, String summary, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        Objects.requireNonNull(snapshot, "snapshot must be present when assessing website signals");
        boolean ecommerce = isEffectiveEcommerceWebsite(snapshot);
        boolean hasCriticalWeak = signals.stream().anyMatch(signal -> "HIGH".equals(signal.severity()) && isCriticalWeakWebsiteSignal(signal.code()));
        boolean hasReviewDrivingSignal = signals.stream().anyMatch(signal -> ("HIGH".equals(signal.severity()) || "MEDIUM".equals(signal.severity()))
                && isReviewDrivingWebsiteSignal(signal.code()));
        boolean hasConfirmedMinorSignal = signals.stream().anyMatch(signal -> isConfirmedMinorWebsiteSignal(signal.code()));
        String status = websiteStatus(hasCriticalWeak, hasReviewDrivingSignal);
        String effectiveSummary = websiteQualitySummary(signals, summary, snapshot, status);
        String label = websiteStatusLabel(status, signals, ecommerce, hasConfirmedMinorSignal);
        return new WebsiteQualityAssessment(status, label, effectiveSummary, signals);
    }

    private String websiteStatus(boolean hasCriticalWeak, boolean hasReviewDrivingSignal) {
        if (hasCriticalWeak) {
            return WEBSITE_STATUS_WEAK;
        }
        if (hasReviewDrivingSignal) {
            return WEBSITE_STATUS_NEEDS_REVIEW;
        }
        return WEBSITE_STATUS_OK;
    }

    private String websiteStatusLabel(String status, List<WebsiteQualitySignal> signals, boolean ecommerce, boolean hasConfirmedMinorSignal) {
        if (WEBSITE_STATUS_WEAK.equals(status)) {
            return hasSignal(signals, SIGNAL_TECHNICAL_FAILURE) ? LABEL_WEBSITE_UNREACHABLE : "Kritisk teknisk punkt";
        }
        if (WEBSITE_STATUS_NEEDS_REVIEW.equals(status)) {
            return ecommerce ? "Nettside med forbedringspunkter" : "Bør vurderes";
        }
        return hasConfirmedMinorSignal ? "Generelt god nettside - enkelte forbedringspunkter" : "Ser grei ut";
    }

    private String websiteQualitySummary(
            List<WebsiteQualitySignal> signals,
            String fallback,
            WebsiteContentInspectionService.WebsiteContentSnapshot snapshot,
            String status
    ) {
        Objects.requireNonNull(snapshot, "snapshot must be present when summarizing website quality");
        if (WEBSITE_STATUS_OK.equals(status)) {
            if (hasConfirmedMinorWebsiteSignals(signals)) {
                return "Nettsiden fremstår i hovedsak god og gir tydelig informasjon om virksomheten. Analysen fant enkelte mulige forbedringer innen metadata og universell utforming som bør kontrolleres manuelt.";
            }
            if (hasOnlyTechnicalHardeningSignals(signals)) {
                return "Nettsiden fremstår i hovedsak grei. Analysen fant tekniske hardening- og konfigurasjonspunkter som kan vurderes ved en teknisk gjennomgang, men som ikke alene sier at siden er svak for vanlige besøkende.";
            }
            return fallback;
        }
        if (hasSignal(signals, "PUBLIC_SECTOR_CONTEXT")) {
            return "Siden fremstår som et offentlig eller stort etablert tjenestenettsted. Funnene bør brukes som teknisk/UU-revisjon, ikke som vanlig salgs- eller småbedriftsvurdering.";
        }
        boolean ecommerce = isEffectiveEcommerceWebsite(snapshot);
        if (ecommerce) {
            if (hasSignal(signals, SIGNAL_INCOMPLETE_MARKET_OR_CHECKOUT)) {
                return "Siden fremstår som en aktiv nettbutikk, men analysen fant tegn på uferdig markedstilpasning eller checkout. Det bør sjekkes før kundedialog.";
            }
            return "Siden fremstår som en aktiv nettbutikk, ikke en tom eller svak side. Muligheten ligger i tydeligere tillit, tilgjengelighet, personvern, kjøpsinformasjon og teknisk kvalitet.";
        }
        if (hasSignal(signals, SIGNAL_SENSITIVE_HEALTH_CONTEXT)
                || hasSignal(signals, "MEDICAL_REGULATORY_STATUS")
                || hasSignal(signals, "MEDICAL_REGULATORY_CONTEXT_MISSING")) {
            return "Siden berører et mer tillitsbasert eller sensitivt fagområde. Personvern, skjema, dokumentasjon og tilgjengelighet bør vurderes ekstra nøye.";
        }
        if (hasSignal(signals, SIGNAL_AI_LIKE_PRESENTATION_RISK)) {
            return "Nettsiden svarer, men førsteinntrykket kan virke AI-lignende eller mønsterpreget. Mer konkret innhold, ekte virksomhetsspesifikke detaljer og tydelige tillitssignaler bør vurderes.";
        }
        if (hasSignal(signals, SIGNAL_GENERIC_PRESENTATION_TRUST_RISK)
                || hasSignal(signals, SIGNAL_GENERIC_OR_AI_IMAGE_RISK)) {
            return "Nettsiden svarer, men førsteinntrykket kan virke generisk. Ekte bilder, konkrete tjenester og tydelige tillitssignaler bør vurderes.";
        }
        if (hasMetadataOrAccessibilityControlSignals(signals) && !hasSubstantialContentWeakness(signals)) {
            return "Nettsiden fremstår aktiv og informativ, men analysen fant mulige forbedringer innen metadata og universell utforming som bør kontrolleres manuelt.";
        }
        if (hasContentFocusedSignals(signals)) {
            return "Nettsiden svarer, men analysen fant innholds- og tillitssignaler som kan gjøre det vanskeligere å forstå hva virksomheten tilbyr.";
        }
        if (hasSecurityFocusedSignals(signals)) {
            return "Nettsiden svarer, men analysen fant tekniske sikkerhets-, personvern- eller konfigurasjonspunkter som bør vurderes manuelt.";
        }
        return fallback;
    }

    private boolean isReviewDrivingWebsiteSignal(String code) {
        return Set.of(
                SIGNAL_TECHNICAL_FAILURE,
                SIGNAL_MISSING_HTTPS,
                SIGNAL_INSECURE_FORM_ACTION,
                SIGNAL_INCOMPLETE_MARKET_OR_CHECKOUT,
                "TEMPLATE_PLACEHOLDER_CONTENT",
                SIGNAL_THIN_CONTENT,
                SIGNAL_WEAK_HOMEPAGE_STRUCTURE,
                SIGNAL_WEAK_NAVIGATION,
                SIGNAL_WEAK_INDUSTRY_RELEVANCE,
                SIGNAL_GENERIC_SERVICE_TEXT,
                SIGNAL_GENERIC_PRESENTATION_TRUST_RISK,
                SIGNAL_GENERIC_OR_AI_IMAGE_RISK,
                SIGNAL_AI_LIKE_PRESENTATION_RISK,
                SIGNAL_MISSING_ORG_NUMBER,
                SIGNAL_LEGAL_NAME_NOT_VISIBLE,
                SIGNAL_MISSING_ADDRESS_OR_AREA,
                SIGNAL_MISSING_ABOUT_SECTION,
                "MISSING_PRIVACY_NOTICE",
                SIGNAL_COOKIE_CONSENT_RISK,
                SIGNAL_FORM_LABEL_RISK,
                "TABLE_HEADERS_MISSING",
                "FORM_INPUT_TYPE_RISK",
                "FOCUS_STYLE_RISK",
                "AUTOPLAY_MEDIA_RISK",
                "ACCESSIBILITY_DECLARATION_VIOLATIONS",
                SIGNAL_MIXED_CONTENT_RISK,
                SIGNAL_PERSONAL_DATA_GET_FORM,
                SIGNAL_EXTERNAL_FORM_ACTION,
                "THIRD_PARTY_FORM_RISK",
                SIGNAL_SENSITIVE_HEALTH_CONTEXT,
                "HEALTH_TRACKING_CONTEXT"
        ).contains(code);
    }

    private boolean hasConfirmedMinorWebsiteSignals(List<WebsiteQualitySignal> signals) {
        return signals.stream().anyMatch(signal -> isConfirmedMinorWebsiteSignal(signal.code()));
    }

    private boolean isConfirmedMinorWebsiteSignal(String code) {
        return Set.of(
                SIGNAL_WEAK_TITLE,
                SIGNAL_MISSING_META_DESCRIPTION,
                SIGNAL_DUPLICATE_META_DESCRIPTIONS,
                SIGNAL_WEAK_SHARE_PREVIEW,
                SIGNAL_MISSING_STRUCTURED_DATA,
                SIGNAL_EMPTY_BUTTON_RISK,
                SIGNAL_IMAGE_ALT_RISK,
                SIGNAL_MISSING_MAIN_LANDMARK,
                SIGNAL_WEAK_PAGE_LANDMARKS,
                SIGNAL_SKIPPED_HEADING_LEVELS,
                SIGNAL_VAGUE_LINK_TEXT,
                SIGNAL_IFRAME_TITLE_RISK,
                SIGNAL_MOTION_ACCESSIBILITY_RISK,
                SIGNAL_FORM_AUTOCOMPLETE_MISSING
        ).contains(code);
    }

    private boolean hasOnlyTechnicalHardeningSignals(List<WebsiteQualitySignal> signals) {
        return !signals.isEmpty()
                && signals.stream().allMatch(signal -> isTechnicalHardeningWebsiteSignal(signal.code()) || isConfirmedMinorWebsiteSignal(signal.code()));
    }

    private boolean isTechnicalHardeningWebsiteSignal(String code) {
        return Set.of(
                SIGNAL_SECURITY_TXT_MISSING,
                SIGNAL_DNS_CAA_MISSING,
                SIGNAL_SERVER_TECH_HEADER_EXPOSED,
                "TECHNOLOGY_STACK_DETECTED",
                SIGNAL_CMS_VERSION_EXPOSED,
                SIGNAL_ROBOTS_SENSITIVE_PATHS,
                SIGNAL_ADMIN_OR_LOGIN_PATH_EXPOSED,
                SIGNAL_LOGIN_FORM_SECURITY_REVIEW,
                SIGNAL_API_ENDPOINTS_VISIBLE,
                SIGNAL_SOURCE_MAP_EXPOSED,
                SIGNAL_DEVELOPMENT_REFERENCE_EXPOSED,
                SIGNAL_TARGET_BLANK_NOOPENER_MISSING,
                SIGNAL_DOM_XSS_SURFACE_REVIEW,
                SIGNAL_DANGEROUS_JS_SINK_REVIEW,
                SIGNAL_INLINE_EVENT_HANDLER_REVIEW,
                SIGNAL_JAVASCRIPT_HREF_REVIEW,
                SIGNAL_THIRD_PARTY_SCRIPT_INTEGRITY_REVIEW,
                SIGNAL_MANY_THIRD_PARTY_SCRIPT_HOSTS,
                SIGNAL_MANY_INLINE_SCRIPTS_WITHOUT_CSP,
                SIGNAL_POST_FORM_CSRF_REVIEW,
                SIGNAL_OUTDATED_JS_LIBRARY_REVIEW,
                SIGNAL_MISSING_PERMISSIONS_POLICY,
                "MISSING_CONTENT_TYPE_OPTIONS",
                SIGNAL_MISSING_FRAME_PROTECTION,
                SIGNAL_MISSING_REFERRER_POLICY,
                SIGNAL_MISSING_HSTS_HEADER,
                SIGNAL_WEAK_HSTS_HEADER,
                SIGNAL_MISSING_CSP_HEADER,
                SIGNAL_WEAK_CSP_HEADER,
                SIGNAL_COOKIE_SECURE_FLAG_MISSING,
                SIGNAL_COOKIE_HTTPONLY_REVIEW,
                SIGNAL_COOKIE_SAMESITE_REVIEW
        ).contains(code);
    }

    private boolean hasContentFocusedSignals(List<WebsiteQualitySignal> signals) {
        return signals.stream().map(WebsiteQualitySignal::code).anyMatch(code -> Set.of(
                SIGNAL_THIN_CONTENT,
                SIGNAL_WEAK_HOMEPAGE_STRUCTURE,
                SIGNAL_WEAK_NAVIGATION,
                SIGNAL_WEAK_INDUSTRY_RELEVANCE,
                SIGNAL_GENERIC_SERVICE_TEXT,
                "MISSING_LOCAL_RELEVANCE",
                SIGNAL_MISSING_STRUCTURED_DATA,
                SIGNAL_MISSING_ORG_NUMBER,
                SIGNAL_LEGAL_NAME_NOT_VISIBLE,
                SIGNAL_MISSING_ADDRESS_OR_AREA,
                SIGNAL_MISSING_ABOUT_SECTION,
                SIGNAL_AI_LIKE_PRESENTATION_RISK,
                "DOMAIN_NAME_MISMATCH",
                "EMAIL_DOMAIN_MISMATCH"
        ).contains(code));
    }

    private boolean hasSubstantialContentWeakness(List<WebsiteQualitySignal> signals) {
        return signals.stream().map(WebsiteQualitySignal::code).anyMatch(code -> Set.of(
                SIGNAL_THIN_CONTENT,
                SIGNAL_WEAK_HOMEPAGE_STRUCTURE,
                SIGNAL_WEAK_NAVIGATION,
                SIGNAL_WEAK_INDUSTRY_RELEVANCE,
                SIGNAL_GENERIC_SERVICE_TEXT,
                SIGNAL_GENERIC_PRESENTATION_TRUST_RISK,
                SIGNAL_GENERIC_OR_AI_IMAGE_RISK,
                SIGNAL_AI_LIKE_PRESENTATION_RISK
        ).contains(code));
    }

    private boolean hasMetadataOrAccessibilityControlSignals(List<WebsiteQualitySignal> signals) {
        return signals.stream().map(WebsiteQualitySignal::code).anyMatch(code -> Set.of(
                SIGNAL_WEAK_TITLE,
                SIGNAL_MISSING_META_DESCRIPTION,
                SIGNAL_DUPLICATE_META_DESCRIPTIONS,
                SIGNAL_WEAK_SHARE_PREVIEW,
                SIGNAL_MISSING_STRUCTURED_DATA,
                SIGNAL_FORM_LABEL_RISK,
                SIGNAL_EMPTY_BUTTON_RISK,
                SIGNAL_IMAGE_ALT_RISK,
                SIGNAL_MISSING_MAIN_LANDMARK,
                SIGNAL_WEAK_PAGE_LANDMARKS,
                SIGNAL_SKIPPED_HEADING_LEVELS,
                SIGNAL_VAGUE_LINK_TEXT,
                SIGNAL_IFRAME_TITLE_RISK,
                SIGNAL_MOTION_ACCESSIBILITY_RISK,
                SIGNAL_FORM_AUTOCOMPLETE_MISSING
        ).contains(code));
    }

    private boolean hasSecurityFocusedSignals(List<WebsiteQualitySignal> signals) {
        return signals.stream().map(WebsiteQualitySignal::code).anyMatch(code -> Set.of(
                SIGNAL_MISSING_HTTPS,
                "TLS_CERTIFICATE_REVIEW",
                "TLS_CERTIFICATE_EXPIRING",
                "HTTP_TO_HTTPS_REDIRECT_REVIEW",
                SIGNAL_MIXED_CONTENT_RISK,
                SIGNAL_MISSING_HSTS_HEADER,
                SIGNAL_WEAK_HSTS_HEADER,
                SIGNAL_MISSING_CSP_HEADER,
                SIGNAL_WEAK_CSP_HEADER,
                SIGNAL_MISSING_REFERRER_POLICY,
                SIGNAL_MISSING_PERMISSIONS_POLICY,
                SIGNAL_MISSING_FRAME_PROTECTION,
                SIGNAL_SERVER_TECH_HEADER_EXPOSED,
                SIGNAL_SECURITY_TXT_MISSING,
                SIGNAL_ROBOTS_SENSITIVE_PATHS,
                SIGNAL_ADMIN_OR_LOGIN_PATH_EXPOSED,
                SIGNAL_LOGIN_FORM_SECURITY_REVIEW,
                "FILE_UPLOAD_REVIEW",
                SIGNAL_API_ENDPOINTS_VISIBLE,
                SIGNAL_CMS_VERSION_EXPOSED,
                "EMAIL_SECURITY_DNS_REVIEW",
                "EMAIL_MX_MISSING",
                SIGNAL_DNS_CAA_MISSING,
                "SPF_LOOKUP_RISK",
                "DUPLICATE_SPF_RECORDS",
                "DMARC_RUA_MISSING",
                SIGNAL_SOURCE_MAP_EXPOSED,
                SIGNAL_DEVELOPMENT_REFERENCE_EXPOSED,
                SIGNAL_TARGET_BLANK_NOOPENER_MISSING,
                SIGNAL_PERSONAL_DATA_GET_FORM,
                SIGNAL_EXTERNAL_FORM_ACTION,
                SIGNAL_DOM_XSS_SURFACE_REVIEW,
                SIGNAL_DANGEROUS_JS_SINK_REVIEW,
                SIGNAL_INLINE_EVENT_HANDLER_REVIEW,
                SIGNAL_JAVASCRIPT_HREF_REVIEW,
                SIGNAL_THIRD_PARTY_SCRIPT_INTEGRITY_REVIEW,
                SIGNAL_MANY_THIRD_PARTY_SCRIPT_HOSTS,
                SIGNAL_MANY_INLINE_SCRIPTS_WITHOUT_CSP,
                SIGNAL_POST_FORM_CSRF_REVIEW,
                SIGNAL_OUTDATED_JS_LIBRARY_REVIEW,
                SIGNAL_COOKIE_SECURE_FLAG_MISSING,
                SIGNAL_COOKIE_HTTPONLY_REVIEW,
                SIGNAL_COOKIE_SAMESITE_REVIEW,
                "CRAWL_PRIVACY_PAGE_NOT_FOUND",
                "CRAWL_FORM_PRIVACY_REVIEW",
                SIGNAL_COOKIE_CONSENT_RISK
        ).contains(code));
    }

    private boolean hasSignal(List<WebsiteQualitySignal> signals, String code) {
        return signals.stream().anyMatch(signal -> code.equals(signal.code()));
    }

    private boolean isEffectiveEcommerceWebsite(WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        return snapshot != null && snapshot.ecommerceSignal() && !isInsuranceOrFinanceWebsite(snapshot);
    }

    private void addPublicSectorContextSignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        if (!isPublicSectorWebsite(snapshot)) {
            return;
        }
        signals.add(new WebsiteQualitySignal(
                "PUBLIC_SECTOR_CONTEXT",
                "Offentlig/etablert tjenestenettsted",
                "Siden ser ut til å tilhøre offentlig sektor eller en stor etablert tjenesteplattform. Automatiske funn bør vurderes som revisjonspunkter, ikke som vanlige småbedriftssignaler.",
                "INFO"
        ));
    }

    private boolean isPublicSectorWebsite(WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        if (snapshot == null) {
            return false;
        }
        String text = normalizeForWebsiteQuality(
                (snapshot.title() == null ? "" : snapshot.title()) + " "
                        + (snapshot.bodyText() == null ? "" : snapshot.bodyText()) + " "
                        + (snapshot.finalUrl() == null ? "" : snapshot.finalUrl())
        );
        return containsAny(text, PUBLIC_SECTOR_WEBSITE_WORDS);
    }

    private boolean isInsuranceOrFinanceWebsite(WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        if (snapshot == null) {
            return false;
        }
        String text = normalizeForWebsiteQuality(
                (snapshot.title() == null ? "" : snapshot.title()) + " "
                        + (snapshot.bodyText() == null ? "" : snapshot.bodyText()) + " "
                        + (snapshot.finalUrl() == null ? "" : snapshot.finalUrl())
        );
        return containsAny(text, Set.of(
                "forsikring",
                "forsikringsselskap",
                "skadeforsikring",
                "livsforsikring",
                "helseforsikring",
                "insurance",
                "bank",
                "finans",
                "pensjon"
        ));
    }

    private boolean isCriticalWeakWebsiteSignal(String code) {
        return Set.of(
                SIGNAL_TECHNICAL_FAILURE,
                SIGNAL_MISSING_HTTPS,
                SIGNAL_INSECURE_FORM_ACTION
        ).contains(code);
    }

    private void addContentQualitySignals(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        String title = snapshot.title() == null ? "" : snapshot.title().trim();
        if (title.isBlank() || WEAK_PAGE_TITLES.contains(title.toLowerCase(Locale.ROOT))) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_WEAK_TITLE,
                    "Svak sidetittel",
                    "Sidetittelen er tom eller svært generisk. Det gjør siden svakere i søk og deling.",
                    "MEDIUM"
            ));
        }
        if (!hasText(snapshot.h1())) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_WEAK_HOMEPAGE_STRUCTURE,
                    "Mangler tydelig hovedoverskrift",
                    "Siden ser ut til å mangle tydelig hovedoverskrift. Det kan gjøre det mindre klart hva virksomheten tilbyr.",
                    "MEDIUM"
            ));
        }
        if (snapshot.h1Count() > 1) {
            signals.add(new WebsiteQualitySignal(
                    "MULTIPLE_H1",
                    "Flere hovedoverskrifter",
                    "Siden har flere hovedoverskrifter. Det er ikke alltid feil, men kan gi svakere struktur for brukere og søkemotorer.",
                    "INFO"
            ));
        }
        if (!hasText(snapshot.metaDescription())) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_MISSING_META_DESCRIPTION,
                    "Mangler beskrivelse",
                    "Siden mangler meta description. Det kan gi svakere presentasjon i søkeresultater.",
                    "INFO"
            ));
        }
        if (snapshot.repeatedMetaDescriptionCount() >= 2) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_DUPLICATE_META_DESCRIPTIONS,
                    "Like meta-beskrivelser på flere sider",
                    snapshot.repeatedMetaDescriptionCount() + " undersider ser ut til å bruke samme meta description som forsiden. Det kan gi svakere og mindre presis visning i søk og deling.",
                    "INFO"
            ));
        }
        String bodyText = snapshot.bodyText() == null ? "" : snapshot.bodyText().trim();
        if (bodyText.length() < 300) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_THIN_CONTENT,
                    "Svak tekstmengde",
                    "Førstesiden har lite tekstinnhold. Det kan gjøre det vanskelig for kunder og søkemotorer å forstå hva virksomheten tilbyr.",
                    "MEDIUM"
            ));
        }
    }

    private void addSharePreviewSignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        if (!snapshot.openGraphTitle() || !snapshot.openGraphDescription()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_WEAK_SHARE_PREVIEW,
                    "Svak delingsvisning",
                    "Siden mangler trolig Open Graph/Twitter-tittel eller beskrivelse. Lenken kan derfor se svakere ut når den deles i e-post, sosiale medier eller meldinger.",
                    "INFO"
            ));
        }
    }

    private void addStructuredDataSignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        if (!snapshot.structuredData()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_MISSING_STRUCTURED_DATA,
                    "Mangler strukturert data",
                    "Siden ser ikke ut til å ha strukturert data. Det kan gjøre det vanskeligere for søkemotorer å forstå virksomhet, kontaktpunkt og innhold.",
                    "INFO"
            ));
        }
        if (snapshot.healthPlatformSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "HEALTH_PLATFORM",
                    "Bruker profesjonell helseplattform",
                    "Siden ser ut til å bruke en etablert tredjepartsløsning (som PatientSky eller Helseboka) for booking eller pasientkontakt. Dette er et positivt tillitssignal for sikker håndtering av helseopplysninger.",
                    "INFO"
            ));
        }
        if (snapshot.noIndexSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "NOINDEX_SIGNAL",
                    "Siden ber søkemotorer ikke indeksere",
                    "HTML-en har noindex-signal. Det kan være bevisst, men hvis siden skal finnes i Google bør dette sjekkes.",
                    "MEDIUM"
            ));
        }
        if (!snapshot.sitemapSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "SITEMAP_MISSING",
                    "Sitemap ikke funnet",
                    "Vi fant ikke sitemap.xml eller sitemap_index.xml. Det er ikke kritisk for små sider, men kan hjelpe søkemotorer å finne viktig innhold.",
                    "INFO"
            ));
        }
    }

    private void addNavigationSignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        if (!snapshot.navigation() && snapshot.linkCount() < 2 && snapshot.headingCount() < 2) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_WEAK_NAVIGATION,
                    "Svak struktur",
                    "Siden ser ut til å ha lite navigasjon eller få seksjoner. Det kan gjøre det vanskeligere å orientere seg i tjenester, kontakt og informasjon.",
                    "INFO"
            ));
        }
    }

    private String visibleWebsiteText(WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        return (snapshot.bodyText() == null ? "" : snapshot.bodyText())
                + " "
                + (snapshot.crawledBodyText() == null ? "" : snapshot.crawledBodyText());
    }

    private void addContactQualitySignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot, EnhetResponse enhet) {
        String text = (visibleWebsiteText(snapshot) + " " + (snapshot.html() == null ? "" : snapshot.html())).toLowerCase(Locale.ROOT);
        boolean hasEmail = EMAIL_PATTERN.matcher(text).find();
        boolean hasPhone = PHONE_PATTERN.matcher(text).find();
        boolean hasContactWords = text.contains("kontakt") || text.contains("contact") || text.contains("ring oss") || text.contains("send e-post");
        if (!hasEmail && !hasPhone && !hasContactWords && (hasText(enhet.epostadresse()) || hasText(enhet.telefon()) || hasText(enhet.mobil()))) {
            signals.add(new WebsiteQualitySignal(
                    "WEAK_CONTACT_POINT",
                    "Kontaktinfo vanskelig å finne",
                    "BRREG har kontaktdata, men nettsiden ser ikke ut til å vise telefon, e-post eller tydelig kontaktpunkt.",
                    "MEDIUM"
            ));
        }
        if (hasContactWords && !hasEmail && !hasPhone && (hasText(enhet.epostadresse()) || hasText(enhet.telefon()) || hasText(enhet.mobil()))) {
            signals.add(new WebsiteQualitySignal(
                    "CONTACT_DETAILS_NOT_VISIBLE",
                    "Kontaktinfo lite synlig",
                    "Siden nevner kontakt, men vi fant ikke tydelig telefon eller e-post på siden. For lokale tjenester bør kontaktinfo være lett tilgjengelig.",
                    "MEDIUM"
            ));
        }
        if (snapshot.crawledPageCount() > 0 && !snapshot.crawlContactPageFound() && (hasText(enhet.epostadresse()) || hasText(enhet.telefon()) || hasText(enhet.mobil()))) {
            signals.add(new WebsiteQualitySignal(
                    "CONTACT_PAGE_NOT_FOUND",
                    "Fant ikke tydelig kontaktside",
                    "Den begrensede undersidesjekken fant ikke en tydelig kontaktside. For nye kunder bør kontaktvei være enkel å finne fra navigasjon og footer.",
                    "INFO"
            ));
        }
    }

    private void addLocalRelevanceSignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot, EnhetResponse enhet) {
        if (isEffectiveEcommerceWebsite(snapshot)) {
            return;
        }
        String location = firstNonBlank(enhet.forretningsadresse() == null ? null : enhet.forretningsadresse().kommune(), enhet.forretningsadresse() == null ? null : enhet.forretningsadresse().fylke());
        if (!hasText(location)) {
            return;
        }
        String text = normalizeForWebsiteQuality((snapshot.title() == null ? "" : snapshot.title()) + " " + visibleWebsiteText(snapshot));
        if (!text.contains(normalizeForWebsiteQuality(location))) {
            signals.add(new WebsiteQualitySignal(
                    "MISSING_LOCAL_RELEVANCE",
                    "Mangler lokal relevans",
                    "BRREG har registrert geografisk tilknytning, men nettsiden ser ikke ut til å nevne området tydelig.",
                    "INFO"
            ));
        }
    }

    private void addIndustryRelevanceSignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot, EnhetResponse enhet) {
        String description = enhet.naeringskode1() == null ? null : enhet.naeringskode1().beskrivelse();
        List<String> tokens = industryTokens(description);
        if (tokens.isEmpty()) {
            return;
        }
        String text = normalizeForWebsiteQuality((snapshot.title() == null ? "" : snapshot.title()) + " " + visibleWebsiteText(snapshot));
        boolean hasIndustryToken = tokens.stream().anyMatch(text::contains);
        if (!hasIndustryToken) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_WEAK_INDUSTRY_RELEVANCE,
                    "Svak tjenestebeskrivelse",
                    "BRREG-bransjen ser ikke tydelig igjen i nettsideteksten. Det kan gjøre det uklart hva kunden faktisk kan bestille.",
                    "INFO"
            ));
        }
    }

    private void addServiceDescriptionSignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot, EnhetResponse enhet) {
        String bodyText = normalizeForWebsiteQuality(visibleWebsiteText(snapshot));
        if (!hasText(bodyText)) {
            return;
        }
        long genericWords = GENERIC_MARKETING_WORDS.stream()
                .map(this::normalizeForWebsiteQuality)
                .filter(bodyText::contains)
                .count();
        List<String> industryTokens = industryTokens(enhet.naeringskode1() == null ? null : enhet.naeringskode1().beskrivelse());
        boolean hasConcreteIndustryText = industryTokens.stream().anyMatch(bodyText::contains);
        if (genericWords >= 3 && !hasConcreteIndustryText) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_GENERIC_SERVICE_TEXT,
                    "For generell tekst",
                    "Teksten virker generell og lite knyttet til konkrete tjenester, sted eller bransje. Mer konkret innhold kan gjøre siden mer troverdig.",
                    "INFO"
            ));
        }
    }

    private void addTrustSignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot, CompanyCheck companyCheck, EnhetResponse enhet) {
        String text = normalizeForWebsiteQuality(visibleWebsiteText(snapshot) + " " + (snapshot.html() == null ? "" : snapshot.html()));
        String orgNumber = companyCheck.organisasjonsnummer();
        if (hasText(orgNumber) && !hasVisibleOrganizationIdentifier(text, orgNumber, companyCheck, enhet)) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_MISSING_ORG_NUMBER,
                    "Mangler org.nr. på siden",
                    "Siden ser ikke ut til å vise organisasjonsnummer. Det er et konkret tillitssignal som ofte bør være synlig for nye virksomheter.",
                    "INFO"
            ));
        }
        String legalName = normalizeForWebsiteQuality(companyCheck.navn());
        if (legalName.length() >= 5 && !text.contains(legalName)) {
            boolean ecommerce = isEffectiveEcommerceWebsite(snapshot);
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_LEGAL_NAME_NOT_VISIBLE,
                    ecommerce ? "Mangler tydelig juridisk avsender" : "Mangler juridisk firmanavn",
                    ecommerce
                            ? "Siden viser merkevaren, men juridisk selskap/organisasjonsnummer fremstår ikke tydelig i innholdet vi sjekket. For nettbutikk bør selger og kontaktinformasjon være lett å verifisere."
                            : "Siden bruker ikke tydelig firmanavnet fra BRREG. For nye kunder kan juridisk navn gi mer tillit og etterprøvbarhet.",
                    "INFO"
            ));
        }
        String businessAddress = addressText(enhet.forretningsadresse());
        String postalAddress = addressText(enhet.postadresse());
        if (!hasText(businessAddress) && !hasText(postalAddress)) {
            return;
        }
        if (!hasAddressOrAreaEvidence(text, enhet)) {
            boolean ecommerce = isEffectiveEcommerceWebsite(snapshot);
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_MISSING_ADDRESS_OR_AREA,
                    ecommerce ? "Kontakt-/selskapsinfo bør verifiseres" : "Mangler adresse eller områdeinfo",
                    ecommerce
                            ? "Vi fant ikke tydelig adresse eller selskapsinfo i innholdet vi sjekket. For nettbutikk bør kunde lett finne juridisk selger, kontaktinformasjon, vilkår og returinfo."
                            : "Siden viser ikke tydelig adresse, kart eller dekningsområde. Dette kan svekke lokal tillit og søkbarhet.",
                    "INFO"
            ));
        }
    }

    private boolean hasAddressOrAreaEvidence(String normalizedText, EnhetResponse enhet) {
        if (normalizedText.contains("adresse") || normalizedText.contains("kart") || normalizedText.contains("besok")) {
            return true;
        }
        return addressTokens(enhet.forretningsadresse()).stream().anyMatch(normalizedText::contains)
                || addressTokens(enhet.postadresse()).stream().anyMatch(normalizedText::contains);
    }

    private void addCommercialTrustSignals(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot, EnhetResponse enhet) {
        String rawHtml = snapshot.html() == null ? "" : snapshot.html();
        String rawBody = visibleWebsiteText(snapshot);
        String text = normalizeForWebsiteQuality(rawBody + " " + rawHtml);
        boolean localOrConsumer = isLocalOrConsumerSegment(enhet);
        boolean trustDecisionContext = hasTrustDecisionContext(text);

        boolean incompleteMarketSignal = containsAny(text,
                Set.of("checkout er dessverre ikke tilgjengelig", "vi apner snart", "vi åpner snart", "opens soon", "opening soon"));
        if (incompleteMarketSignal) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_INCOMPLETE_MARKET_OR_CHECKOUT,
                    "Spor av uferdig markedstilpasning",
                    "Siden inneholder tekst om at marked eller checkout ikke er tilgjengelig ennå. Det kan gi inntrykk av at deler av nettbutikken eller enkelte markeder ikke er ferdig lansert.",
                    "HIGH"
            ));
        } else if (containsAny(text, TEMPLATE_PLACEHOLDER_WORDS)) {
            signals.add(new WebsiteQualitySignal(
                    "TEMPLATE_PLACEHOLDER_CONTENT",
                    "Uferdig maltekst",
                    "Siden har spor av placeholder-, test- eller kommer-snart-tekst. Det kan gi inntrykk av at nettsiden ikke er ferdigstilt.",
                    "HIGH"
            ));
        }

        if (!containsAny(text, ABOUT_TRUST_WORDS) && !snapshot.crawlAboutPageFound()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_MISSING_ABOUT_SECTION,
                    "Mangler tydelig om-oss",
                    "Vi fant ikke tydelig om-oss-, team- eller personpresentasjon. For små virksomheter kan en kort presentasjon av hvem kunden møter gi mer tillit.",
                    localOrConsumer ? "MEDIUM" : "INFO"
            ));
        }

        if ((localOrConsumer || trustDecisionContext) && !containsAny(text, SOCIAL_PROOF_WORDS)) {
            signals.add(new WebsiteQualitySignal(
                    "MISSING_SOCIAL_PROOF",
                    "Mangler referanser eller eksempler",
                    trustDecisionContext
                            ? "Siden retter seg mot beslutningstakere eller tillitsbaserte tjenester, men vi fant ikke tydelige caser, kundeuttalelser, tall eller resultater som underbygger løftene."
                            : "Siden ser ikke ut til å vise referanser, kundeomtaler, tidligere arbeid eller konkrete eksempler. Det kan gjøre førsteinntrykket mindre etterprøvbart.",
                    trustDecisionContext ? "MEDIUM" : "INFO"
            ));
        }

        if (trustDecisionContext && !snapshot.crawlFaqPageFound() && !containsAny(text, Set.of("faq", "ofte stilte", "sporsmal", "spørsmål"))) {
            signals.add(new WebsiteQualitySignal(
                    "MISSING_FAQ",
                    "Mangler FAQ eller praktiske svar",
                    "Siden beskriver et tillitsbasert tilbud, men vi fant ikke tydelig FAQ eller praktiske svar på vanlige spørsmål. Det kan gjøre vurderingen tyngre for nye kunder.",
                    "INFO"
            ));
        }

        if (trustDecisionContext && !snapshot.crawlPricingSignal() && !containsAny(text, Set.of("pris", "priser", "abonnement", "demo", "gratis prove", "gratis prøve", "pilot"))) {
            signals.add(new WebsiteQualitySignal(
                    "MISSING_PRICE_OR_MODEL",
                    "Uklart prisnivå eller modell",
                    "Vi fant ikke tydelig pris, demo, pilot, abonnement eller forklaring av forretningsmodell. For beslutningstakere kan det gjøre neste steg uklart.",
                    "INFO"
            ));
        }

        if (trustDecisionContext && !snapshot.crawlDataHandlingPageFound() && containsAny(text, Set.of("arbeidshelse", "arbeidsmiljo", "arbeidsmiljø", "team", "sykefravar", "sykefravær"))) {
            signals.add(new WebsiteQualitySignal(
                    "DATA_HANDLING_INFO_REVIEW",
                    "Datahåndtering bør forklares tydeligere",
                    "Siden berører arbeidshelse, team eller arbeidsmiljødata. Da bør det være lett å finne hvordan data samles inn, brukes og sikres, utover en generell personvernerklæring.",
                    "MEDIUM"
            ));
        }

        if (snapshot.ctaMismatchSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "CTA_DESTINATION_MISMATCH",
                    "CTA kan lede feil",
                    "En handlingsknapp ser ut til å love én handling, men peker til en annen produkt- eller temaside. Det kan gjøre brukerflyten forvirrende.",
                    "MEDIUM"
            ));
        }

        if (openingHoursUsuallyRelevant(enhet) && !containsAny(text, OPENING_HOURS_WORDS)) {
            signals.add(new WebsiteQualitySignal(
                    "MISSING_OPENING_HOURS",
                    "Mangler åpningstider",
                    "Bransjen gjør åpningstider eller tilgjengelighet relevant, men siden ser ikke ut til å vise dette tydelig.",
                    "INFO"
            ));
        }

        if (localOrConsumer && !containsAny(rawHtml.toLowerCase(Locale.ROOT), SOCIAL_LINK_HOSTS)) {
            signals.add(new WebsiteQualitySignal(
                    "MISSING_SOCIAL_LINKS",
                    "Mangler sosiale lenker",
                    "Vi fant ikke tydelige lenker til sosiale medier. Det er ikke alltid nødvendig, men kan være et tillitssignal for lokale og forbrukerrettede virksomheter.",
                    "INFO"
            ));
        }

        if (snapshot.cloudflareEmailProtectionSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "CLOUDFLARE_EMAIL_PROTECTION",
                    "Skjult e-postadresse",
                    "E-post ser ut til å være skjult via Cloudflare email protection. Det kan redusere spam, men gjør også e-post mindre tilgjengelig for brukere uten JavaScript, skjermleser/noscript og enkel kopiering.",
                    "INFO"
            ));
        } else if (hasText(enhet.epostadresse()) && EMAIL_PATTERN.matcher(rawBody + " " + rawHtml).find() && !rawHtml.toLowerCase(Locale.ROOT).contains("mailto:")) {
            signals.add(new WebsiteQualitySignal(
                    "EMAIL_NOT_CLICKABLE",
                    "E-post er ikke klikkbar",
                    "Siden ser ut til å vise e-postadresse, men ikke som mailto-lenke. Det kan gjøre kontakt litt tyngre for brukeren.",
                    "INFO"
            ));
        }

        if ((hasText(enhet.telefon()) || hasText(enhet.mobil())) && PHONE_PATTERN.matcher(rawBody + " " + rawHtml).find() && !rawHtml.toLowerCase(Locale.ROOT).contains("tel:")) {
            signals.add(new WebsiteQualitySignal(
                    "PHONE_NOT_CLICKABLE",
                    "Telefon er ikke klikkbar",
                    "Siden ser ut til å vise telefonnummer, men ikke som tel-lenke. På mobil bør telefonnummer normalt være lett å trykke på.",
                    "INFO"
            ));
        }

        if (containsAny(rawHtml.toLowerCase(Locale.ROOT), GENERIC_IMAGE_SOURCE_WORDS)) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_GENERIC_OR_AI_IMAGE_RISK,
                    "Mulig generisk bildebruk",
                    "Bildespor peker mot stock-, AI- eller generiske visualiseringer. Det er ikke nødvendigvis feil, men kan svekke tillit hvis bildene ikke tydelig viser virksomheten, produktet eller arbeidet.",
                    isHealthOrMedicalSegment(enhet) ? "MEDIUM" : "INFO"
            ));
        }
        if (snapshot.placeholderImageCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    "PLACEHOLDER_IMAGE_RISK",
                    "Placeholder-bilder synlige",
                    snapshot.placeholderImageCount() + " bilde(r) ser ut til å bruke placeholder- eller dummy-spor. På sider som bygger tillit rundt mennesker eller team kan det virke uferdig.",
                    "MEDIUM"
            ));
        }
        addGenericPresentationTrustSignal(signals, snapshot, isHealthOrMedicalSegment(enhet));

        if (snapshot.platformDomainSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "PLATFORM_DOMAIN_RISK",
                    "Bruker plattformdomene",
                    "Nettsiden ser ut til å ligge på et plattformdomene. Eget domene gir vanligvis et mer profesjonelt og lettere gjenkjennelig inntrykk.",
                    "MEDIUM"
            ));
        }

        if (snapshot.placeholderSocialLinkCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    "PLACEHOLDER_SOCIAL_LINKS",
                    "Mulig uferdige sosiale lenker",
                    snapshot.placeholderSocialLinkCount() + " sosial lenke ser ut til å peke til en generisk eller uferdig profil.",
                    "INFO"
            ));
        }

        if (snapshot.loadingOverlaySignal()) {
            signals.add(new WebsiteQualitySignal(
                    "CLIENT_LOADING_OVERLAY",
                    "Tung klientlasting",
                    "Siden har spor av lasteoverlay eller ventetekst. Det kan tyde på tung klient-side rendering og bør sjekkes for mobilopplevelse, LCP og førsteinntrykk.",
                    "INFO"
            ));
        }

        if (snapshot.visibleDiscountCodeSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "VISIBLE_DISCOUNT_CODE",
                    "Kampanje-/affiliate-spor synlig",
                    "Siden inneholder spor av kampanje, rabatt eller affiliate-funksjonalitet. Dette er normalt for nettbutikk, men kan vurderes hvis kampanjer skal være begrenset.",
                    "INFO"
            ));
        }

        if (snapshot.newsletterFormSignal() && snapshot.unlabeledFormControlCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    "NEWSLETTER_FORM_LABEL_RISK",
                    "Nyhetsbrevskjema bør sjekkes",
                    "Siden har spor av nyhetsbrevskjema og skjemafelt uten tydelig label/aria-label. Dette bør sjekkes for tilgjengelighet og brukervennlighet.",
                    "INFO"
            ));
        }

        if (isEffectiveEcommerceWebsite(snapshot)) {
            addCommerceSignals(signals, snapshot);
        }
        addGenericPresentationTrustSignal(signals, snapshot, false);
    }

    private boolean hasTrustDecisionContext(String normalizedText) {
        return containsAny(normalizedText, Set.of(
                "leder",
                "ledere",
                "team",
                "arbeidshelse",
                "arbeidsmiljo",
                "arbeidsmiljø",
                "sykefravar",
                "sykefravær",
                "fravaer",
                "fravær",
                "kartlegging",
                "radar",
                "radaren",
                "tidlige varsler",
                "konkrete tiltak"
        ));
    }

    private void addGenericPresentationTrustSignal(
            List<WebsiteQualitySignal> signals,
            WebsiteContentInspectionService.WebsiteContentSnapshot snapshot,
            boolean stricterContext
    ) {
        if (signals.stream().anyMatch(signal -> SIGNAL_GENERIC_PRESENTATION_TRUST_RISK.equals(signal.code())
                || SIGNAL_AI_LIKE_PRESENTATION_RISK.equals(signal.code()))) {
            return;
        }

        String rawHtml = snapshot.html() == null ? "" : snapshot.html();
        String combinedText = visibleWebsiteText(snapshot);
        String bodyText = normalizeForWebsiteQuality(combinedText);
        String combined = normalizeForWebsiteQuality(combinedText + " " + rawHtml);
        long genericWords = GENERIC_MARKETING_WORDS.stream()
                .map(this::normalizeForWebsiteQuality)
                .filter(bodyText::contains)
                .count();
        long genericPhrases = GENERIC_PRESENTATION_PHRASES.stream()
                .map(this::normalizeForWebsiteQuality)
                .filter(combined::contains)
                .count();
        long aiLikePhrases = AI_LIKE_PRESENTATION_PHRASES.stream()
                .map(this::normalizeForWebsiteQuality)
                .filter(combined::contains)
                .count();
        boolean hasAbout = containsAny(combined, ABOUT_TRUST_WORDS);
        boolean hasSocialProof = containsAny(combined, SOCIAL_PROOF_WORDS);
        boolean hasGenericImageSource = containsAny(rawHtml.toLowerCase(Locale.ROOT), GENERIC_IMAGE_SOURCE_WORDS);
        int imageAssetCount = imageAssetCount(rawHtml);

        boolean textLooksGeneric = (genericWords >= 4 || genericPhrases >= 4) && (!hasAbout || !hasSocialProof);
        boolean visualLooksGeneric = (hasGenericImageSource || imageAssetCount >= 18) && !hasSocialProof;
        boolean textLooksAiLike = aiLikePhrases >= 4 && (genericWords >= 4 || genericPhrases >= 3) && (!hasAbout || !hasSocialProof);
        if (!textLooksGeneric && !visualLooksGeneric && !textLooksAiLike) {
            return;
        }

        if (textLooksAiLike) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_AI_LIKE_PRESENTATION_RISK,
                    "Mulig AI-lignende eller mønsterpreget tekst",
                    "Teksten har mange brede, mønsterpregede formuleringer og lite konkret virksomhetsspesifikt innhold. Det er ikke et bevis på AI-bruk, men et signal om at teksten bør vurderes manuelt.",
                    stricterContext ? "MEDIUM" : "INFO"
            ));
        } else if (textLooksGeneric) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_GENERIC_PRESENTATION_TRUST_RISK,
                    "Mulig generisk uttrykk",
                    "Teksten virker lite konkret for virksomheten. Det er ikke nødvendigvis feil, men kan svekke tillit hvis siden mangler ekte bilder, referanser, personer, prosjekter eller tydelig faglig dokumentasjon.",
                    stricterContext ? "MEDIUM" : "INFO"
            ));
        }
        if (visualLooksGeneric) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_GENERIC_OR_AI_IMAGE_RISK,
                    "Mulig generisk bildebruk",
                    "Bildespor peker mot stock-, AI- eller generiske visualiseringer. Det er ikke nødvendigvis feil, men kan svekke tillit hvis bildene ikke tydelig viser virksomheten, produktet eller arbeidet.",
                    stricterContext ? "MEDIUM" : "INFO"
            ));
        }
    }

    private void addCommerceSignals(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        if (!snapshot.termsLink()) {
            signals.add(new WebsiteQualitySignal(
                    "COMMERCE_TERMS_MISSING",
                    "Mangler tydelige vilkår",
                    "Siden har tegn på salg eller bestilling, men vi fant ikke tydelige kjøpsvilkår eller salgsbetingelser.",
                    "MEDIUM"
            ));
        }
        if (!snapshot.returnInfo()) {
            signals.add(new WebsiteQualitySignal(
                    "COMMERCE_RETURN_INFO_MISSING",
                    "Mangler retur-/angrerettinfo",
                    "Siden har tegn på salg eller bestilling, men vi fant ikke tydelig informasjon om retur, angrerett eller reklamasjon.",
                    "MEDIUM"
            ));
        }
        if (!snapshot.deliveryInfo() && snapshot.cartOrCheckoutSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "COMMERCE_DELIVERY_INFO_MISSING",
                    "Mangler leveringsinfo",
                    "Siden har tegn på handlekurv eller checkout, men vi fant ikke tydelig leverings- eller fraktinformasjon.",
                    "INFO"
            ));
        }
        if (snapshot.paymentLogoSignal() && !snapshot.paymentTrustInfoSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "PAYMENT_TRUST_INFO_MISSING",
                    "Betalingstillit bør sjekkes",
                    "Siden viser betalingsmerker eller betalingsspor, men vi fant ikke tydelig tekst om sikker betaling. Det er ikke nødvendigvis feil, men bør vurderes for nettbutikk-tillit.",
                    "INFO"
            ));
        }
    }

    private void addActionSignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        String text = normalizeForWebsiteQuality((snapshot.bodyText() == null ? "" : snapshot.bodyText()) + " " + (snapshot.html() == null ? "" : snapshot.html()));
        boolean hasCallToAction = CALL_TO_ACTION_WORDS.stream().anyMatch(word -> text.contains(normalizeForWebsiteQuality(word)));
        if (!hasCallToAction) {
            signals.add(new WebsiteQualitySignal(
                    "WEAK_CALL_TO_ACTION",
                    "Mangler tydelig kontaktknapp",
                    "Siden mangler en tydelig kontaktknapp eller handlingsknapp på førstesiden. Det kan gjøre det vanskeligere for kunder å ta kontakt raskt.",
                    "MEDIUM"
            ));
        }
    }

    private boolean containsAny(String text, Set<String> needles) {
        if (!hasText(text)) {
            return false;
        }
        return needles.stream()
                .map(this::normalizeForWebsiteQuality)
                .anyMatch(text::contains);
    }

    private boolean isLocalOrConsumerSegment(EnhetResponse enhet) {
        String code = normalizedNaceCode(enhet);
        return startsWithAny(code, "43", "47", "49", "52", "53", "56", "81", "86", "88", "96");
    }

    private boolean openingHoursUsuallyRelevant(EnhetResponse enhet) {
        String code = normalizedNaceCode(enhet);
        return startsWithAny(code, "47", "56", "86", "88", "96")
                || code.startsWith("81.3");
    }

    private boolean isHealthOrMedicalSegment(EnhetResponse enhet) {
        String code = normalizedNaceCode(enhet);
        return startsWithAny(code, "86", "88") || code.startsWith("96.04");
    }

    private boolean hasLikelySwedishContent(WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        String rawText = ((snapshot.title() == null ? "" : snapshot.title()) + " "
                + (snapshot.bodyText() == null ? "" : snapshot.bodyText()) + " "
                + (snapshot.html() == null ? "" : snapshot.html())).toLowerCase(Locale.ROOT);
        return rawText.contains("villkor")
                || rawText.contains("köp")
                || rawText.contains("prenumerera")
                || rawText.contains("leverans")
                || rawText.contains("moms")
                || rawText.contains("organisationsnummer")
                || rawText.contains("ett ögonblick");
    }

    private String normalizedNaceCode(EnhetResponse enhet) {
        if (enhet == null || enhet.naeringskode1() == null || enhet.naeringskode1().kode() == null) {
            return "";
        }
        return enhet.naeringskode1().kode().trim();
    }

    private boolean startsWithAny(String value, String... prefixes) {
        if (!hasText(value)) {
            return false;
        }
        for (String prefix : prefixes) {
            if (value.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }

    private void addBrandDomainSignal(List<WebsiteQualitySignal> signals, CompanyCheck companyCheck, String website) {
        String host = host(website);
        if (host == null) {
            return;
        }
        String domain = host.replaceFirst("\\.[a-z.]+$", "").replace("-", "");
        String companyName = normalizeDomainToken(companyCheck.navn());
        if (companyName.length() >= 5 && !companyName.contains(domain) && !domain.contains(companyName.substring(0, Math.min(companyName.length(), 8)))) {
            signals.add(new WebsiteQualitySignal(
                    "DOMAIN_NAME_MISMATCH",
                    "Domene matcher svakt",
                    "Nettadressen ser ikke ut til å ligge tett på firmanavnet. Det kan gjøre siden vanskeligere å kjenne igjen.",
                    "INFO"
            ));
        }
    }

    private void addEmailDomainSignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot, String website) {
        String host = host(website);
        if (!hasText(host) || thirdPartyPlatform(website) != null) {
            return;
        }
        Set<String> emailDomains = emailDomains((snapshot.bodyText() == null ? "" : snapshot.bodyText()) + " " + (snapshot.html() == null ? "" : snapshot.html()));
        if (emailDomains.isEmpty()) {
            return;
        }
        String normalizedHost = host.replaceFirst("^www\\.", "");
        boolean hasMatchingDomain = emailDomains.stream().anyMatch(domain -> normalizedHost.equals(domain) || normalizedHost.endsWith("." + domain) || domain.endsWith("." + normalizedHost));
        boolean hasGenericDomain = emailDomains.stream().anyMatch(GENERIC_EMAIL_DOMAINS::contains);
        if (!hasMatchingDomain || hasGenericDomain) {
            signals.add(new WebsiteQualitySignal(
                    "EMAIL_DOMAIN_MISMATCH",
                    "E-post matcher ikke domene",
                    "E-postadressen på siden ser ikke ut til å bruke samme domene som nettsiden. En domenebasert e-post kan gi et mer profesjonelt inntrykk.",
                    "INFO"
            ));
        }
    }

    private void addFreshnessSignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        String html = snapshot.html() == null ? "" : snapshot.html();
        var matcher = COPYRIGHT_YEAR_PATTERN.matcher(html);
        int currentYear = LocalDate.now(clock).getYear();
        while (matcher.find()) {
            int year = Integer.parseInt(matcher.group(2));
            if (year <= currentYear - 3) {
                signals.add(new WebsiteQualitySignal(
                        "OUTDATED_COPYRIGHT",
                        "Utdatert årstall",
                        "Siden ser ut til å ha utdatert årstall i bunnteksten. Det kan gi inntrykk av at siden ikke vedlikeholdes.",
                        "INFO"
                ));
                return;
            }
        }
    }

    private void addResponsiveSignals(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        if (snapshot.fixedWidthLayoutSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "FIXED_WIDTH_LAYOUT",
                    "Mulig svak responsivitet",
                    "HTML/CSS inneholder tegn til fast bredde. Det kan gi svak visning på mobil og små skjermer, og bør sjekkes manuelt.",
                    "MEDIUM"
            ));
        }
    }

    private void addAccessibilitySignals(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        if (snapshot.accessibilityViolationCount() != null && snapshot.accessibilityRequirementCount() != null) {
            signals.add(new WebsiteQualitySignal(
                    "ACCESSIBILITY_DECLARATION_VIOLATIONS",
                    "Tilgjengelighetserklæring med WCAG-brudd",
                    "Publisert tilgjengelighetserklæring oppgir brudd på " + snapshot.accessibilityViolationCount() + " av " + snapshot.accessibilityRequirementCount() + " krav i regelverket.",
                    snapshot.accessibilityViolationCount() > 0 ? "MEDIUM" : "INFO"
            ));
        }
        if (!hasText(snapshot.viewport())) {
            signals.add(new WebsiteQualitySignal(
                    "MISSING_VIEWPORT",
                    "Mulig svak mobiltilpasning",
                    "Siden mangler viewport-meta. Det er et vanlig tegn på svak mobiltilpasning.",
                    "MEDIUM"
            ));
        }
        if (!hasText(snapshot.language())) {
            signals.add(new WebsiteQualitySignal(
                    "MISSING_LANGUAGE",
                    "UU-risiko",
                    "HTML-språk er ikke satt. Dette er et UU-signal som bør sjekkes manuelt.",
                    "INFO"
            ));
        } else if (hasLikelySwedishContent(snapshot) && !snapshot.language().toLowerCase(Locale.ROOT).startsWith("sv")) {
            signals.add(new WebsiteQualitySignal(
                    "LANGUAGE_MISMATCH_RISK",
                    "Mulig feil språkmerking",
                    "Siden ser ut til å ha svensk innhold, men HTML-språket ser ikke ut til å være satt til svensk. Feil lang-attributt kan gi dårligere skjermleseropplevelse.",
                    "INFO"
            ));
        }
        if (snapshot.imageCount() > 0 && snapshot.imagesWithoutAlt() > 0) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_IMAGE_ALT_RISK,
                    "Mulig UU-risiko på bilder",
                    snapshot.imagesWithoutAlt() + " av " + snapshot.imageCount() + " bilder mangler eller har tom alt-tekst. Det kan være riktig for dekorbilder, men bør sjekkes.",
                    "INFO"
            ));
        }
        if (snapshot.formControlCount() > 0 && snapshot.unlabeledFormControlCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_FORM_LABEL_RISK,
                    "Mulig UU-risiko i skjema",
                    snapshot.unlabeledFormControlCount() + " av " + snapshot.formControlCount() + " skjemafelt ser ut til å mangle tydelig label eller aria-label.",
                    "MEDIUM"
            ));
        }
        if (snapshot.emptyButtonCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_EMPTY_BUTTON_RISK,
                    "Mulig UU-risiko på knapper",
                    "Minst én knapp eller knappelenke ser ut til å mangle synlig tekst eller aria-label.",
                    "MEDIUM"
            ));
        }
        if (!snapshot.mainLandmark()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_MISSING_MAIN_LANDMARK,
                    "Mangler main-landemerke",
                    "Siden ser ikke ut til å ha tydelig main-landemerke. Det kan gjøre navigasjon vanskeligere for skjermleser og tastaturbrukere.",
                    "INFO"
            ));
        }
        if (!snapshot.headerLandmark() || !snapshot.footerLandmark()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_WEAK_PAGE_LANDMARKS,
                    "Mangler semantiske landemerker",
                    "Siden kan ha visuell header eller footer, men HTML-en ser ut til å mangle tydelige semantiske header-/footer-landemerker. Slike landemerker gjør siden enklere å orientere seg i for skjermleser og tastaturbrukere.",
                    "INFO"
            ));
        }
        if (snapshot.skippedHeadingLevelCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_SKIPPED_HEADING_LEVELS,
                    "Uryddig overskriftsstruktur",
                    "Overskriftsnivå hopper over nivå " + snapshot.skippedHeadingLevelCount() + " gang(er). Det kan gjøre innholdet vanskeligere å forstå med hjelpeteknologi.",
                    snapshot.skippedHeadingLevelCount() > 2 ? "MEDIUM" : "INFO"
            ));
        }
        if (snapshot.vagueLinkTextCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_VAGUE_LINK_TEXT,
                    "Utydelige lenketekster",
                    snapshot.vagueLinkTextCount() + " lenke(r) har generisk tekst som \"les mer\" eller \"her\". Lenketekster bør beskrive hvor de leder.",
                    "INFO"
            ));
        }
        if (snapshot.tableCount() > 0 && snapshot.dataTablesWithoutHeadersCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    "TABLE_HEADERS_MISSING",
                    "Tabell uten tydelige overskrifter",
                    snapshot.dataTablesWithoutHeadersCount() + " av " + snapshot.tableCount() + " tabeller ser ut til å mangle tabelloverskrifter.",
                    "MEDIUM"
            ));
        }
        if (snapshot.inputsWithoutAutocompleteCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_FORM_AUTOCOMPLETE_MISSING,
                    "Skjema mangler autocomplete",
                    snapshot.inputsWithoutAutocompleteCount() + " felt for kontakt- eller personopplysninger ser ut til å mangle autocomplete. Det kan gjøre skjema tyngre å bruke.",
                    "INFO"
            ));
        }
        if (snapshot.wrongEmailInputTypeCount() > 0 || snapshot.wrongPhoneInputTypeCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    "FORM_INPUT_TYPE_RISK",
                    "Feil inputtype i skjema",
                    "E-post- eller telefonfelt ser ut til å bruke vanlig tekstfelt. Riktig inputtype gir bedre mobilopplevelse og færre feil.",
                    "MEDIUM"
            ));
        }
        if (snapshot.outlineNoneSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "FOCUS_STYLE_RISK",
                    "Mulig svak fokusmarkering",
                    "CSS-en inneholder tegn til at fokusmarkering kan være fjernet. Tastaturbrukere må kunne se hvor fokus er.",
                    "MEDIUM"
            ));
        }
        if (snapshot.autoplayMediaSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "AUTOPLAY_MEDIA_RISK",
                    "Autoplay-media",
                    "Siden har video, lyd eller innebygd innhold med autoplay. Bevegelig innhold bør kunne stoppes eller kontrolleres av brukeren.",
                    "MEDIUM"
            ));
        }
        if (snapshot.motionWithoutReducedMotionSignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_MOTION_ACCESSIBILITY_RISK,
                    "Bevegelse uten redusert-motion signal",
                    "HTML/CSS har spor av animasjon eller scroll-effekter, men vi fant ikke tydelig støtte for prefers-reduced-motion.",
                    "INFO"
            ));
        }
        if (snapshot.iframeWithoutTitleCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_IFRAME_TITLE_RISK,
                    "Iframe mangler tittel",
                    snapshot.iframeWithoutTitleCount() + " iframe-element(er) ser ut til å mangle tittel. Innebygd innhold bør beskrives for skjermleser.",
                    "INFO"
            ));
        }
    }

    private void addSecuritySignals(List<WebsiteQualitySignal> signals, String website, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        if (!website.startsWith(HTTPS_PREFIX) && (snapshot.finalUrl() == null || !snapshot.finalUrl().startsWith(HTTPS_PREFIX))) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_MISSING_HTTPS,
                    LABEL_MISSING_HTTPS,
                    "Siden bruker ikke sikker HTTPS-forbindelse. Dette kan gi dårligere tillit og varsler i nettleseren.",
                    "HIGH"
            ));
            return;
        }
        if (!snapshot.tlsCertificateValid()) {
            signals.add(new WebsiteQualitySignal(
                    "TLS_CERTIFICATE_REVIEW",
                    "TLS-/sertifikatoppsett bør sjekkes",
                    "Siden bruker HTTPS, men sertifikatstatus kunne ikke verifiseres i den enkle sjekken. Dette bør kontrolleres hvis siden brukes kommersielt.",
                    "MEDIUM"
            ));
        } else if (snapshot.tlsCertificateDaysRemaining() != null && snapshot.tlsCertificateDaysRemaining() < 30) {
            signals.add(new WebsiteQualitySignal(
                    "TLS_CERTIFICATE_EXPIRING",
                    "TLS-sertifikat utløper snart",
                    "Sertifikatet ser ut til å utløpe om " + snapshot.tlsCertificateDaysRemaining() + " dager. Dette bør følges opp før nettlesere begynner å varsle.",
                    "MEDIUM"
            ));
        }
        if (!snapshot.httpRedirectsToHttps()) {
            signals.add(new WebsiteQualitySignal(
                    "HTTP_TO_HTTPS_REDIRECT_REVIEW",
                    "HTTP til HTTPS bør sjekkes",
                    "Vi fant ikke en tydelig redirect fra HTTP til HTTPS. Det kan gi svakere sikkerhetsopplevelse hvis brukere åpner domenet uten https.",
                    "INFO"
            ));
        }
        if (snapshot.weakHstsHeaderSignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_WEAK_HSTS_HEADER,
                    "Svak HSTS-header",
                    "Siden har HSTS-header, men verdien ser kort eller ufullstendig ut. Dette bør vurderes hvis domenet skal fremstå teknisk robust.",
                    "INFO"
            ));
        }
        if (snapshot.weakContentSecurityPolicySignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_WEAK_CSP_HEADER,
                    "Svak Content Security Policy",
                    "Siden har CSP, men den ser ut til å tillate svake mønstre som unsafe-inline/unsafe-eval, wildcard eller manglende frame-ancestors.",
                    "INFO"
            ));
        }
        if (snapshot.serverTechnologyHeaderSignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_SERVER_TECH_HEADER_EXPOSED,
                    "Serverteknologi eksponeres",
                    "HTTP-headerne ser ut til å eksponere server- eller applikasjonsteknologi. Det er ikke nødvendigvis feil, men kan reduseres for mindre teknisk støy.",
                    "INFO"
            ));
        }
        if (!snapshot.securityTxtSignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_SECURITY_TXT_MISSING,
                    "Mangler security.txt",
                    "Vi fant ikke security.txt. Det er ikke påkrevd for små nettsteder, men gir en ryddig kanal for sikkerhetshenvendelser.",
                    "INFO"
            ));
        }
        if (snapshot.robotsSensitivePathSignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_ROBOTS_SENSITIVE_PATHS,
                    "Robots.txt nevner sensitive stier",
                    "Robots.txt peker mot admin-, API-, backup- eller private stier. Dette er ikke en sårbarhet alene, men kan gi unødvendig informasjon.",
                    "INFO"
            ));
        }
        if (snapshot.mixedContentSignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_MIXED_CONTENT_RISK,
                    "Mulig mixed content",
                    "Siden bruker HTTPS, men HTML-en peker også til ressurser over HTTP. Det kan gi sikkerhetsvarsler eller blokkert innhold i nettleseren.",
                    "MEDIUM"
            ));
        }
        if (snapshot.externalScriptCount() >= 8) {
            signals.add(new WebsiteQualitySignal(
                    "MANY_EXTERNAL_SCRIPTS",
                    "Mange eksterne scripts",
                    "Siden laster mange eksterne scripts. Det er ikke nødvendigvis feil, men øker avhengigheter, personvernrisiko og feilkilder.",
                    "INFO"
            ));
        }
        if (snapshot.externalIframeCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    "EXTERNAL_IFRAME_RISK",
                    "Eksternt innebygd innhold",
                    "Siden har iframe fra ekstern kilde. Dette bør vurderes med tanke på personvern, ytelse og samtykke.",
                    "INFO"
            ));
        }
        if (snapshot.checkedInternalLinkCount() > 0 && snapshot.brokenInternalLinkCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    "BROKEN_INTERNAL_LINKS",
                    "Mulige døde interne lenker",
                    snapshot.brokenInternalLinkCount() + " av " + snapshot.checkedInternalLinkCount() + " sjekkede interne lenker svarte med feilstatus.",
                    "MEDIUM"
            ));
        }
        if (snapshot.adminOrLoginPathSignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_ADMIN_OR_LOGIN_PATH_EXPOSED,
                    "Admin-/innloggingsspor synlig",
                    "HTML eller lenker peker mot admin-, login- eller dashboard-stier. Det er ikke nødvendigvis en feil, men slike innganger bør sikres med sterke passord, 2FA og rate limiting.",
                    "INFO"
            ));
        }
        if (snapshot.loginFormSignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_LOGIN_FORM_SECURITY_REVIEW,
                    "Innlogging bør sikkerhetssjekkes",
                    "Siden ser ut til å ha innlogging eller passordfelt. Passord-reset, session cookies, rate limiting og 2FA bør vurderes manuelt.",
                    "MEDIUM"
            ));
        }
        if (snapshot.fileUploadSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "FILE_UPLOAD_REVIEW",
                    "Filopplasting bør sikkerhetssjekkes",
                    "Siden har spor av filopplasting. Filtyper, størrelsesgrenser, viruskontroll og lagring bør vurderes manuelt.",
                    "MEDIUM"
            ));
        }
        if (snapshot.apiEndpointReferenceCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_API_ENDPOINTS_VISIBLE,
                    "API-endepunkter synlige",
                    "Vi fant " + snapshot.apiEndpointReferenceCount() + " synlige API-/REST-/GraphQL-spor i HTML-en. Tilgangsstyring, CORS og rate limiting bør vurderes manuelt.",
                    "INFO"
            ));
        }
        if (snapshot.exposedCmsVersionSignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_CMS_VERSION_EXPOSED,
                    "CMS-versjon eksponert",
                    "HTML-en ser ut til å eksponere CMS- eller pluginversjoner. Det kan gjøre kjente sårbarheter lettere å kartlegge.",
                    "INFO"
            ));
        }
        if (!snapshot.spfRecord() || !snapshot.dkimRecord() || !snapshot.dmarcRecord()) {
            signals.add(new WebsiteQualitySignal(
                    "EMAIL_SECURITY_DNS_REVIEW",
                    "E-postsikkerhet i DNS bør sjekkes",
                    (!snapshot.spfRecord() && !snapshot.dkimRecord() && !snapshot.dmarcRecord()
                            ? "Vi fant ikke tydelige SPF-, DKIM- eller DMARC-spor"
                            : !snapshot.spfRecord()
                            ? "Vi fant ikke tydelig SPF-spor"
                            : !snapshot.dkimRecord()
                            ? "Vi fant ikke tydelig DKIM-spor med vanlige selector-navn"
                            : "Vi fant ikke tydelig DMARC-spor")
                            + " for domenet. Dette bør vurderes for å redusere risiko for spoofing og spamproblemer.",
                    "INFO"
            ));
        }
        if (!snapshot.mxRecord()) {
            signals.add(new WebsiteQualitySignal(
                    "EMAIL_MX_MISSING",
                    "MX-oppsett bør sjekkes",
                    "Vi fant ikke tydelig MX-oppsett for domenet. Det kan være riktig hvis domenet ikke brukes til e-post, men bør sjekkes hvis virksomheten sender eller mottar e-post på domenet.",
                    "INFO"
            ));
        }
        if (!snapshot.caaRecord()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_DNS_CAA_MISSING,
                    "CAA-record mangler",
                    "Vi fant ikke CAA-record i DNS. Det er ikke påkrevd, men kan begrense hvilke sertifikatutstedere som får utstede TLS-sertifikat for domenet.",
                    "INFO"
            ));
        }
        if (snapshot.spfSoftfailSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "SPF_POLICY_SOFT",
                    "SPF-policy er myk",
                    "SPF ser ut til å bruke ~all eller ?all. Det er ikke nødvendigvis feil, men en strengere policy kan være bedre når e-postoppsettet er ryddig.",
                    "INFO"
            ));
        }
        if (snapshot.spfTooManyLookupsSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "SPF_LOOKUP_RISK",
                    "SPF kan være for kompleks",
                    "SPF-oppsettet ser ut til å ha mange DNS-oppslag. SPF har en grense på 10 oppslag, og for komplekst oppsett kan gi leveringsproblemer.",
                    "INFO"
            ));
        }
        if (snapshot.duplicateSpfRecordSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "DUPLICATE_SPF_RECORDS",
                    "Flere SPF-records",
                    "Domenet ser ut til å ha flere SPF-records. Det kan gjøre SPF ugyldig og bør ryddes til én samlet record.",
                    "MEDIUM"
            ));
        }
        if (snapshot.dmarcPolicyNoneSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "DMARC_POLICY_NONE",
                    "DMARC står til overvåking",
                    "DMARC-policy ser ut til å være p=none. Det er nyttig for overvåking, men beskytter svakere mot spoofing enn quarantine/reject.",
                    "INFO"
            ));
        }
        if (snapshot.dmarcRuaMissingSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "DMARC_RUA_MISSING",
                    "DMARC mangler rapportadresse",
                    "DMARC-recorden ser ut til å mangle rua-rapportering. Rapportering gjør det enklere å følge med før policy strammes inn.",
                    "INFO"
            ));
        }
        if (snapshot.sourceMapReferenceSignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_SOURCE_MAP_EXPOSED,
                    "Kildekart eksponert",
                    "HTML-en peker mot JavaScript- eller CSS-sourcemaps. Det er ikke nødvendigvis kritisk, men kan gjøre kildekode og interne filstier lettere å kartlegge.",
                    "INFO"
            ));
        }
        if (snapshot.developmentReferenceSignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_DEVELOPMENT_REFERENCE_EXPOSED,
                    "Utviklingsspor synlig",
                    "HTML eller lenker inneholder spor av staging, debug, backup, .env eller lokale adresser. Dette bør ryddes før siden brukes aktivt.",
                    "MEDIUM"
            ));
        }
        if (snapshot.targetBlankWithoutNoopenerCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_TARGET_BLANK_NOOPENER_MISSING,
                    "Eksterne lenker mangler noopener",
                    snapshot.targetBlankWithoutNoopenerCount() + " ekstern lenke åpnes i ny fane uten tydelig rel=\"noopener\" eller rel=\"noreferrer\". Dette er en enkel nettlesersikkerhetsforbedring.",
                    "INFO"
            ));
        }
        if (snapshot.personalDataGetFormSignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_PERSONAL_DATA_GET_FORM,
                    "Skjema kan sende persondata i URL",
                    "Minst ett skjema med persondatafelt ser ut til å bruke GET eller mangler method. Det kan legge navn, e-post eller telefon i URL/logg.",
                    "MEDIUM"
            ));
        }
        if (snapshot.sensitiveDataFormSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "SENSITIVE_DATA_FORM",
                    "Sensitive opplysninger i skjema",
                    "Siden ser ut til å ha skjemafelt for personnummer eller andre sensitive opplysninger. Personvern og sikkerhet rundt innsending bør vurderes manuelt.",
                    "HIGH"
            ));
        }
        if (snapshot.externalFormActionSignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_EXTERNAL_FORM_ACTION,
                    "Skjema sender til ekstern tjeneste",
                    "Minst ett skjema ser ut til å sende data til et annet domene. Databehandler, personvern og formål bør verifiseres manuelt.",
                    "MEDIUM"
            ));
        }
        if (snapshot.domXssSinkSignal() && snapshot.clientUrlInputSignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_DOM_XSS_SURFACE_REVIEW,
                    "Mulig DOM-XSS-angrepsflate",
                    "JavaScript ser ut til å lese fra URL/hash og bruke mønstre som kan skrive HTML eller kjøre dynamisk kode. Dette beviser ikke XSS, men bør vurderes manuelt.",
                    "MEDIUM"
            ));
        } else if (snapshot.domXssSinkSignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_DANGEROUS_JS_SINK_REVIEW,
                    "JavaScript-mønstre bør sjekkes",
                    "HTML/JavaScript inneholder mønstre som innerHTML, document.write, eval eller lignende. Det er ikke nødvendigvis feil, men bør vurderes hvis brukerinput kan nå koden.",
                    "INFO"
            ));
        }
        if (snapshot.inlineEventHandlerCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_INLINE_EVENT_HANDLER_REVIEW,
                    "Inline JavaScript-hendelser",
                    snapshot.inlineEventHandlerCount() + " element(er) ser ut til å bruke inline event handlers som onclick/onload. Det kan gjøre CSP vanskeligere og bør vurderes ved sikkerhetsherding.",
                    "INFO"
            ));
        }
        if (snapshot.javascriptHrefCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_JAVASCRIPT_HREF_REVIEW,
                    "javascript:-lenker funnet",
                    snapshot.javascriptHrefCount() + " lenke(r) bruker javascript: i href. Dette kan være legitimt, men bør ryddes eller erstattes med vanlig knappelogikk.",
                    "INFO"
            ));
        }
        if (snapshot.externalScriptsWithoutIntegrityCount() > 0 && snapshot.thirdPartyScriptHostCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_THIRD_PARTY_SCRIPT_INTEGRITY_REVIEW,
                    "Tredjeparts-script uten integritetssjekk",
                    snapshot.externalScriptsWithoutIntegrityCount() + " eksterne script ser ut til å mangle Subresource Integrity. Dette er ikke alltid praktisk mulig, men bør vurderes for statiske tredjepartsressurser.",
                    "INFO"
            ));
        }
        if (snapshot.thirdPartyScriptHostCount() >= 4) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_MANY_THIRD_PARTY_SCRIPT_HOSTS,
                    "Mange script-leverandører",
                    "Siden laster scripts fra " + snapshot.thirdPartyScriptHostCount() + " eksterne domener. Det øker avhengigheter, personvernflate og feilkilder.",
                    "INFO"
            ));
        }
        if (snapshot.inlineScriptCount() >= 8 && !snapshot.contentSecurityPolicyHeader()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_MANY_INLINE_SCRIPTS_WITHOUT_CSP,
                    "Mange inline scripts uten CSP",
                    "Siden har mange inline scripts og mangler Content Security Policy. Det gjør det vanskeligere å begrense skade ved script-injeksjon.",
                    "INFO"
            ));
        }
        if (snapshot.postFormsWithoutCsrfTokenCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_POST_FORM_CSRF_REVIEW,
                    "POST-skjema bør sjekkes for CSRF",
                    snapshot.postFormsWithoutCsrfTokenCount() + " POST-skjema ser ikke ut til å ha tydelig CSRF-token i HTML-en. Dette bør vurderes manuelt for skjema som endrer data eller sender sensitive opplysninger.",
                    "INFO"
            ));
        }
        if (snapshot.outdatedJavascriptLibrarySignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_OUTDATED_JS_LIBRARY_REVIEW,
                    "Mulig gammel JavaScript-avhengighet",
                    "HTML-en peker mot en kjent eldre JavaScript-bibliotekversjon. Gamle frontend-avhengigheter kan ha kjente svakheter og bør verifiseres.",
                    "INFO"
            ));
        }
        addSecurityHeaderSignals(signals, snapshot);
    }

    private void addSecurityHeaderSignals(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        if (!snapshot.hstsHeader()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_MISSING_HSTS_HEADER,
                    "Mangler HSTS-header",
                    "Siden bruker HTTPS, men vi fant ikke Strict-Transport-Security-header. Det er et teknisk trygghetssignal som bør vurderes.",
                    "INFO"
            ));
        }
        if (!snapshot.contentSecurityPolicyHeader()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_MISSING_CSP_HEADER,
                    "Mangler Content Security Policy",
                    "Vi fant ikke Content-Security-Policy-header. En ryddig CSP kan redusere risiko fra uønskede scripts og tredjepartsinnhold.",
                    "INFO"
            ));
        }
        if (!snapshot.contentTypeOptionsHeader()) {
            signals.add(new WebsiteQualitySignal(
                    "MISSING_CONTENT_TYPE_OPTIONS",
                    "Mangler X-Content-Type-Options",
                    "Vi fant ikke X-Content-Type-Options-header. Dette er en enkel sikkerhetsheader som ofte bør være på plass.",
                    "INFO"
            ));
        }
        if (!snapshot.referrerPolicyHeader() && (snapshot.googleAnalyticsSignal() || snapshot.metaPixelSignal() || snapshot.externalScriptCount() > 0)) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_MISSING_REFERRER_POLICY,
                    "Mangler Referrer-Policy",
                    "Siden bruker eksterne ressurser eller måling, men vi fant ikke Referrer-Policy-header. Dette bør vurderes av personvern- og sikkerhetshensyn.",
                    "INFO"
            ));
        }
        if (!snapshot.permissionsPolicyHeader() && (snapshot.youtubeEmbedSignal() || snapshot.mapsEmbedSignal() || snapshot.externalIframeCount() > 0)) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_MISSING_PERMISSIONS_POLICY,
                    "Mangler Permissions-Policy",
                    "Siden har innebygd eller ekstern funksjonalitet, men vi fant ikke Permissions-Policy-header. Det kan være nyttig for å begrense nettleserfunksjoner.",
                    "INFO"
            ));
        }
        if (!snapshot.frameOptionsHeader() && !snapshot.contentSecurityPolicyHeader()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_MISSING_FRAME_PROTECTION,
                    "Mangler enkel frame-beskyttelse",
                    "Vi fant verken X-Frame-Options eller Content-Security-Policy. Det kan gjøre siden svakere beskyttet mot innbygging på andre sider.",
                    "INFO"
            ));
        }
    }

    private void addPrivacySignals(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        String text = normalizeForWebsiteQuality((snapshot.bodyText() == null ? "" : snapshot.bodyText()) + " " + (snapshot.html() == null ? "" : snapshot.html()));
        boolean hasContactForm = snapshot.formControlCount() > 0 || text.contains("send melding") || text.contains("kontakt oss");
        if (hasContactForm && !snapshot.privacyLink() && snapshot.termsLink()) {
            signals.add(new WebsiteQualitySignal(
                    "PRIVACY_LINK_REVIEW",
                    "Personvernlenke bør verifiseres",
                    "Siden ser ut til å samle inn kontaktdata, og vi fant en generell vilkår-/policylenke. Innholdet bak lenken bør verifiseres manuelt for personvern, skjema og cookies.",
                    "INFO"
            ));
        } else if (hasContactForm && !snapshot.privacyLink()) {
            signals.add(new WebsiteQualitySignal(
                    "MISSING_PRIVACY_NOTICE",
                    "Mangler synlig personverninfo",
                    "Siden ser ut til å samle inn kontaktdata, men vi fant ingen tydelig personvernlenke eller personverntekst.",
                    "MEDIUM"
            ));
        }
        if (snapshot.cookieOrTrackingSignal() && !snapshot.cookieConsentSignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_COOKIE_CONSENT_RISK,
                    "Mulig cookie-/samtykkerisiko",
                    "HTML-en har spor av cookies, analyse eller tracking, men vi fant ikke tydelig samtykkemekanisme. Dette bør sjekkes manuelt.",
                    "MEDIUM"
            ));
        }
        if (hasSensitiveHealthContext(text)) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_SENSITIVE_HEALTH_CONTEXT,
                    "Mulig sensitivt fagområde",
                    "Nettsideteksten peker mot helse, journal, pasient eller behandling. Personvern, skjema og databehandling bør vurderes ekstra nøye.",
                    "MEDIUM"
            ));
        }
        if (snapshot.googleAnalyticsSignal() && !snapshot.cookieConsentSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "GOOGLE_ANALYTICS_WITHOUT_CONSENT",
                    "Google-måling uten tydelig samtykke",
                    "Siden har spor av Google Analytics/Tag Manager, men vi fant ikke tydelig samtykkemekanisme i HTML-en.",
                    "MEDIUM"
            ));
        }
        if (snapshot.metaPixelSignal() && !snapshot.cookieConsentSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "META_PIXEL_WITHOUT_CONSENT",
                    "Meta Pixel uten tydelig samtykke",
                    "Siden har spor av Meta/Facebook Pixel, men vi fant ikke tydelig samtykkemekanisme i HTML-en.",
                    "MEDIUM"
            ));
        }
        if ((snapshot.hotjarSignal() || snapshot.claritySignal()) && !snapshot.cookieConsentSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "SESSION_TRACKING_WITHOUT_CONSENT",
                    "Sesjonsmåling uten tydelig samtykke",
                    "Siden har spor av Hotjar eller Microsoft Clarity, men vi fant ikke tydelig samtykkemekanisme i HTML-en.",
                    "MEDIUM"
            ));
        }
        if ((snapshot.mapsEmbedSignal() || snapshot.youtubeEmbedSignal()) && !snapshot.cookieConsentSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "THIRD_PARTY_EMBED_CONSENT_RISK",
                    "Innebygd tredjepartsinnhold",
                    "Siden har kart/video fra tredjepart. Slike elementer bør vurderes opp mot cookies, samtykke og personvern.",
                    "INFO"
            ));
        }
        if (snapshot.thirdPartyFormSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "THIRD_PARTY_FORM_RISK",
                    "Skjema via tredjepart",
                    "Siden ser ut til å bruke ekstern skjema-, booking- eller markedsføringstjeneste. Databehandling og personvern bør være tydelig.",
                    "MEDIUM"
            ));
        }
        if (snapshot.insecureFormActionSignal()) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_INSECURE_FORM_ACTION,
                    "Skjema sender til usikker adresse",
                    "Minst ett skjema ser ut til å sende data til HTTP-adresse. Skjemadata bør normalt sendes over HTTPS.",
                    "HIGH"
            ));
        }
        if (snapshot.passwordFieldsWithoutAutocompleteCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    "PASSWORD_AUTOCOMPLETE_RISK",
                    "Passordfelt mangler autocomplete",
                    snapshot.passwordFieldsWithoutAutocompleteCount() + " passordfelt mangler autocomplete. Dette kan svekke brukervennlighet og passordhåndtering.",
                    "INFO"
            ));
        }
        if (snapshot.insecureCookieCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_COOKIE_SECURE_FLAG_MISSING,
                    "Cookie mangler Secure",
                    snapshot.insecureCookieCount() + " cookie(r) ser ut til å mangle Secure-flagget. Cookies på HTTPS-sider bør normalt begrenses til sikker transport.",
                    "MEDIUM"
            ));
        }
        if (snapshot.cookieWithoutHttpOnlyCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_COOKIE_HTTPONLY_REVIEW,
                    "Cookie mangler HttpOnly",
                    snapshot.cookieWithoutHttpOnlyCount() + " cookie(r) ser ut til å mangle HttpOnly. Det bør vurderes hvis cookien brukes til innlogging eller sesjon.",
                    "INFO"
            ));
        }
        if (snapshot.cookieWithoutSameSiteCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    SIGNAL_COOKIE_SAMESITE_REVIEW,
                    "Cookie mangler SameSite",
                    snapshot.cookieWithoutSameSiteCount() + " cookie(r) ser ut til å mangle SameSite. Det bør vurderes for å redusere risiko ved kryssnettstedsforespørsler.",
                    "INFO"
            ));
        }
        if (snapshot.crawledPageCount() > 0 && !hasContactForm && (snapshot.cookieOrTrackingSignal() || isEffectiveEcommerceWebsite(snapshot)) && !snapshot.crawlPrivacyPageFound() && !snapshot.privacyLink() && !snapshot.termsLink()) {
            signals.add(new WebsiteQualitySignal(
                    "CRAWL_PRIVACY_PAGE_NOT_FOUND",
                    "Fant ikke personvernside",
                    "Den begrensede undersidesjekken fant ikke en tydelig personvernside, selv om siden har signaler om cookies, måling eller nettbutikkfunksjon.",
                    "INFO"
            ));
        }
        if (snapshot.crawledFormPageCount() > 0 && snapshot.crawledPrivacyTextPageCount() == 0 && !snapshot.privacyLink()) {
            signals.add(new WebsiteQualitySignal(
                    "CRAWL_FORM_PRIVACY_REVIEW",
                    "Skjema uten tydelig personvernkontekst",
                    "Den begrensede undersidesjekken fant skjema på interne sider, men ikke tydelig personverntekst i de sidene som ble kontrollert.",
                    "MEDIUM"
            ));
        }
        if (isEffectiveEcommerceWebsite(snapshot) && snapshot.crawledPageCount() > 0 && !snapshot.crawlTermsPageFound() && !snapshot.termsLink()) {
            signals.add(new WebsiteQualitySignal(
                    "CRAWL_TERMS_PAGE_NOT_FOUND",
                    "Vilkår bør verifiseres",
                    "Den begrensede undersidesjekken fant ikke tydelige vilkår, retur- eller policy-sider. For nettbutikk bør dette verifiseres manuelt.",
                    "INFO"
            ));
        }
    }

    private boolean hasSensitiveHealthContext(String text) {
        if (!hasText(text)) {
            return false;
        }
        boolean insuranceOrFinanceContext = containsAny(text, Set.of(
                "forsikring",
                "forsikringsselskap",
                "skadeforsikring",
                "livsforsikring",
                "helseforsikring",
                "insurance",
                "bank",
                "finans",
                "pensjon"
        ));
        if (insuranceOrFinanceContext) {
            return false;
        }
        return SENSITIVE_HEALTH_CONTEXT_WORDS.stream()
                .map(this::normalizeForWebsiteQuality)
                .anyMatch(needle -> containsNormalizedTerm(text, needle));
    }

    private void addMedicalTrustSignals(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        String combined = normalizeForWebsiteQuality(
                (snapshot.title() == null ? "" : snapshot.title()) + " "
                        + (snapshot.bodyText() == null ? "" : snapshot.bodyText()) + " "
                        + (snapshot.html() == null ? "" : snapshot.html())
        );
        if (!hasMedicalDeviceContext(combined)) {
            return;
        }

        if (hasRegulatoryLimitContext(combined)) {
            signals.add(new WebsiteQualitySignal(
                    "MEDICAL_REGULATORY_STATUS",
                    "Regulatorisk status bør fremheves",
                    "Siden beskriver kirurgisk/medisinsk produkt og nevner at løsningen ikke er regulatorisk godkjent eller tilgjengelig for bruk ennå. Slike forbehold bør være svært tydelige for å unngå feil forventning.",
                    "MEDIUM"
            ));
        } else {
            signals.add(new WebsiteQualitySignal(
                    "MEDICAL_REGULATORY_CONTEXT_MISSING",
                    "Medisinsk dokumentasjon bør sjekkes",
                    "Siden beskriver kirurgisk/medisinsk produkt. For slike virksomheter bør regulatorisk status, dokumentasjon og ansvarsforhold være ekstra tydelig.",
                    "MEDIUM"
            ));
        }

        if (hasPrototypeOrAiVisualSignal(combined)) {
            signals.add(new WebsiteQualitySignal(
                    "MEDICAL_VISUAL_TRUST_RISK",
                    "Prototype-/AI-preg i visuelt uttrykk",
                    "Bildespor eller animasjon peker mot visualisering/prototypepreg. For medisinsk/kirurgisk teknologi bør bilder og produktpresentasjon virke etterprøvbare og tydelig skilt fra illustrasjoner.",
                    "MEDIUM"
            ));
        }

        int imageAssetCount = imageAssetCount(snapshot.html());
        if (imageAssetCount >= 20) {
            signals.add(new WebsiteQualitySignal(
                    "HEAVY_PRODUCT_ANIMATION",
                    "Tung produktanimasjon",
                    "Siden bruker mange bilde-/animasjonsressurser (" + imageAssetCount + " registrerte bildeassets). Det kan gi visuelt sterkt uttrykk, men også virke tungt eller mer demonstrasjonspreget enn informativt.",
                    "INFO"
            ));
        }

        if (snapshot.cookieOrTrackingSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "HEALTH_TRACKING_CONTEXT",
                    "Tracking på medisinsk side",
                    "Siden har spor av analyse/tracking samtidig som innholdet er medisinsk/kirurgisk. Det er ikke nødvendigvis feil, men personvern og samtykke bør vurderes ekstra nøye.",
                    "MEDIUM"
            ));
        }
    }

    private boolean hasMedicalDeviceContext(String text) {
        return MEDICAL_DEVICE_CONTEXT_WORDS.stream()
                .map(this::normalizeForWebsiteQuality)
                .anyMatch(needle -> containsNormalizedTerm(text, needle));
    }

    private boolean hasRegulatoryLimitContext(String text) {
        return REGULATORY_LIMIT_WORDS.stream()
                .map(this::normalizeForWebsiteQuality)
                .anyMatch(needle -> containsNormalizedTerm(text, needle));
    }

    private boolean containsNormalizedTerm(String text, String needle) {
        if (!hasText(text) || !hasText(needle)) {
            return false;
        }
        if (needle.contains(" ")) {
            return text.contains(needle);
        }
        return java.util.regex.Pattern.compile("\\b" + java.util.regex.Pattern.quote(needle) + "\\b").matcher(text).find();
    }

    private boolean hasPrototypeOrAiVisualSignal(String text) {
        return text.contains("ai visualization")
                || text.contains("aivisualization")
                || text.contains("prototype")
                || text.contains("visualization")
                || text.contains("visualisation")
                || text.contains("image scrubbing")
                || text.contains("animated");
    }

    private int imageAssetCount(String html) {
        if (!hasText(html)) {
            return 0;
        }
        Set<String> imageUrls = new LinkedHashSet<>();
        var matcher = WEBSITE_IMAGE_ASSET_PATTERN.matcher(html);
        while (matcher.find()) {
            imageUrls.add(matcher.group());
        }
        return imageUrls.size();
    }

    private void addTechnologySignals(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        if (hasText(snapshot.detectedBuilder())) {
            String builder = snapshot.detectedBuilder();
            signals.add(new WebsiteQualitySignal(
                    "SITE_BUILDER_DETECTED",
                    "Teknologispor funnet",
                    "HTML-spor peker mot " + builder + ". Dette sier noe om verktøy/plattform, men ikke sikkert hvem som har laget siden. " + builderCostHint(builder),
                    "INFO"
            ));
        }
    }

    private String builderCostHint(String builder) {
        String normalizedBuilder = builder == null ? "" : builder.toLowerCase(Locale.ROOT);
        if (normalizedBuilder.contains("shopify")) {
            return "Shopify er normalt en abonnementsplattform for nettbutikk, ofte med løpende plattformkostnad og eventuelle tillegg for apper, betaling og tema.";
        }
        if (normalizedBuilder.contains("wix") || normalizedBuilder.contains("squarespace") || normalizedBuilder.contains("webflow") || normalizedBuilder.contains("framer")) {
            return builder + " er normalt en hostet plattform med løpende måneds-/årsabonnement. Det kan være relevant å vurdere kostnad, eierskap og hvor lett siden er å videreutvikle.";
        }
        if (normalizedBuilder.contains("emergent")) {
            return "Emergent-spor betyr at siden trolig er bygget eller publisert via en AI-/appbyggerplattform. Eierskap, videreutvikling, hosting og vedlikehold bør vurderes manuelt.";
        }
        if (normalizedBuilder.contains("wordpress")) {
            return "WordPress kan være rimelig å drifte, men totalkostnaden avhenger ofte av hosting, tema, plugins, sikkerhet og vedlikehold.";
        }
        if (normalizedBuilder.contains("next") || normalizedBuilder.contains("vite")) {
            return "Dette peker mot en mer spesialbygget frontend. Pris og vedlikehold avhenger da ofte av hvem som har laget løsningen og hvordan den er hostet.";
        }
        return "Pris og vedlikeholdskostnad må vurderes manuelt ut fra hosting, avtale og hvem som faktisk vedlikeholder løsningen.";
    }

    private String thirdPartyPlatform(String website) {
        String host = host(website);
        if (host == null) {
            return null;
        }
        for (var entry : THIRD_PARTY_WEBSITE_HOSTS.entrySet()) {
            if (host.equals(entry.getKey()) || host.endsWith("." + entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }

    private boolean usesNonNorwegianDomain(EnhetResponse enhet, String website) {
        String host = host(website);
        if (host == null || host.endsWith(".no")) {
            return false;
        }
        String organizationForm = enhet.organisasjonsform() == null ? null : OrganizationFormCatalog.normalizeCode(enhet.organisasjonsform().kode());
        return "AS".equals(organizationForm) || "ENK".equals(organizationForm);
    }

    private String host(String website) {
        if (!hasText(website)) {
            return null;
        }
        try {
            String host = URI.create(website).getHost();
            if (host == null) {
                return null;
            }
            return host.toLowerCase(Locale.ROOT).replaceFirst("^www\\.", "");
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private List<String> industryTokens(String description) {
        if (!hasText(description)) {
            return List.of();
        }
        return Arrays.stream(normalizeForWebsiteQuality(description).split("\\s+"))
                .filter(token -> token.length() >= 5)
                .filter(token -> !Set.of("annen", "andre", "virksomhet", "tjenester", "arbeid", "egen", "leid").contains(token))
                .limit(4)
                .toList();
    }

    private boolean hasVisibleOrganizationIdentifier(String text, String orgNumber, CompanyCheck companyCheck, EnhetResponse enhet) {
        if (text.contains(orgNumber) || text.contains(formatOrgNumberWithSpaces(orgNumber))) {
            return true;
        }
        if (!isForeignRegisteredUnit(companyCheck, enhet)) {
            return false;
        }
        return FOREIGN_ORGANIZATION_NUMBER_PATTERN.matcher(text).find()
                || text.contains("organisationsnummer")
                || text.contains("organisasjonsnummer")
                || text.contains("mva")
                || text.contains("vat");
    }

    private boolean isForeignRegisteredUnit(CompanyCheck companyCheck, EnhetResponse enhet) {
        String organizationForm = enhet != null && enhet.organisasjonsform() != null
                ? enhet.organisasjonsform().kode()
                : "";
        String companyName = companyCheck == null || companyCheck.navn() == null ? "" : companyCheck.navn().toUpperCase(Locale.ROOT);
        return "NUF".equalsIgnoreCase(organizationForm)
                || companyName.contains(" AB")
                || companyName.endsWith(" AB")
                || companyName.contains(" A/S");
    }

    private String formatOrgNumberWithSpaces(String orgNumber) {
        String digits = orgNumber.replaceAll("\\D", "");
        if (digits.length() != 9) {
            return orgNumber;
        }
        return digits.substring(0, 3) + " " + digits.substring(3, 6) + " " + digits.substring(6);
    }

    private String normalizeForWebsiteQuality(String value) {
        if (value == null) {
            return "";
        }
        return value.toLowerCase(Locale.ROOT)
                .replace('æ', 'a')
                .replace('ø', 'o')
                .replace('å', 'a')
                .transform(normalized -> NON_ALPHANUMERIC_SPACE_PATTERN.matcher(normalized).replaceAll(" "))
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String normalizeDomainToken(String value) {
        return normalizeForWebsiteQuality(value).replaceAll("\\b(as|enk|nuf|sa|fli|da|ans)\\b", "").replace(" ", "");
    }

    private Set<String> emailDomains(String text) {
        if (!hasText(text)) {
            return Set.of();
        }
        Set<String> domains = new LinkedHashSet<>();
        var matcher = EMAIL_PATTERN.matcher(text);
        while (matcher.find()) {
            String email = matcher.group().toLowerCase(Locale.ROOT);
            int atIndex = email.indexOf('@');
            if (atIndex > 0 && atIndex + 1 < email.length()) {
                domains.add(email.substring(atIndex + 1));
            }
        }
        return domains;
    }

    private String addressText(EnhetResponse.Adresse adresse) {
        if (adresse == null || adresse.adresse() == null || adresse.adresse().isEmpty()) {
            return null;
        }
        return String.join(" ", adresse.adresse());
    }

    private List<String> addressTokens(EnhetResponse.Adresse adresse) {
        if (adresse == null) {
            return List.of();
        }
        List<String> tokens = new ArrayList<>();
        if (adresse.adresse() != null) {
            adresse.adresse().stream()
                    .map(this::normalizeForWebsiteQuality)
                    .filter(token -> token.length() >= 5)
                    .forEach(tokens::add);
        }
        Stream.of(adresse.poststed(), adresse.kommune(), adresse.fylke())
                .map(this::normalizeForWebsiteQuality)
                .filter(token -> token.length() >= 4)
                .forEach(tokens::add);
        if (adresse.postnummer() != null && adresse.postnummer().matches("\\d{4}")) {
            tokens.add(adresse.postnummer());
        }
        return tokens;
    }

    private List<WebsiteCandidateCheck> checkWebsiteCandidates(List<String> candidates, String companyName, String emailDomain) {
        return candidates.stream()
                .map(candidate -> {
                    boolean reachable = websiteReachabilityService.isReachable(candidate);
                    WebsiteContentMatch contentMatch = reachable
                            ? websiteContentInspectionService.inspect(candidate, companyName, emailDomain)
                            : new WebsiteContentMatch(false, "Kandidaten svarte ikke ved sjekk.", null);
                    return toWebsiteCandidateCheck(candidate, reachable, contentMatch);
                })
                .toList();
    }

    private WebsiteCandidateCheck toWebsiteCandidateCheck(String candidate, boolean reachable, WebsiteContentMatch contentMatch) {
        return new WebsiteCandidateCheck(
                candidate,
                reachable,
                contentMatch.matched(),
                contentMatch.pageTitle(),
                contentMatch.reason()
        );
    }

    private String preferredWebsiteCandidate(List<WebsiteCandidateCheck> candidateChecks) {
        return candidateChecks.stream()
                .filter(check -> Boolean.TRUE.equals(check.contentMatched()))
                .map(WebsiteCandidateCheck::url)
                .findFirst()
                .or(() -> candidateChecks.stream()
                        .filter(check -> Boolean.TRUE.equals(check.reachable()))
                        .map(WebsiteCandidateCheck::url)
                        .findFirst())
                .orElse(null);
    }

    private String scoreLabel(TrafficLight light) {
        return switch (light) {
            case GREEN -> "Ser grei ut";
            case YELLOW -> "Vær obs";
            case RED -> "Høy risiko";
        };
    }

    private List<String> scoreReasons(CompanyCheck companyCheck) {
        List<String> reasons = companyCheck.funn().stream()
                .filter(Objects::nonNull)
                .map(CheckFinding::detail)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        return reasons.isEmpty() ? List.of(companyCheck.sammendrag()) : reasons;
    }

    private List<String> rules(CompanyCheck companyCheck) {
        return companyCheck.funn().stream()
                .filter(Objects::nonNull)
                .map(CheckFinding::label)
                .filter(Objects::nonNull)
                .map(this::toRuleName)
                .distinct()
                .toList();
    }

    private List<String> nameBasedWebsiteCandidates(String companyName) {
        List<String> normalizedVariants = normalizeCompanyNameVariantsForDomain(companyName);
        if (normalizedVariants.isEmpty()) {
            return List.of();
        }

        var candidates = new LinkedHashSet<String>();
        for (String normalized : normalizedVariants) {
            String compact = normalized.replace("-", "");
            if (!hasText(compact) || compact.length() < 4) {
                continue;
            }
            candidates.add(HTTPS_PREFIX + normalized + ".no");
            if (!normalized.contains("-")) {
                String dashed = dashedDomainVariant(normalized, companyName);
                if (hasText(dashed) && !dashed.equals(normalized)) {
                    candidates.add(HTTPS_PREFIX + dashed + ".no");
                }
            }
            if (shouldSuggestPluralVariant(compact)) {
                candidates.add(HTTPS_PREFIX + compact + "er.no");
            }
            if (compact.endsWith("er")) {
                candidates.add(HTTPS_PREFIX + compact.substring(0, compact.length() - 2) + ".no");
            }
        }

        return candidates.stream().limit(5).toList();
    }

    private boolean shouldSuggestPluralVariant(String normalized) {
        return !normalized.endsWith("er")
                && !normalized.endsWith("ene")
                && !normalized.endsWith("e")
                && !normalized.endsWith("i")
                && !normalized.endsWith("og")
                && Character.isLetter(normalized.charAt(normalized.length() - 1));
    }

    private List<String> normalizeCompanyNameVariantsForDomain(String companyName) {
        if (!hasText(companyName)) {
            return List.of();
        }

        String cleaned = companyName
                .toLowerCase(Locale.ROOT)
                .replace('æ', 'a')
                .replace('ø', 'o')
                .replace('å', 'a');

        cleaned = cleaned.replace("&", " og ").replace("+", " og ");
        cleaned = NON_ALPHANUMERIC_SPACE_PATTERN.matcher(cleaned).replaceAll(" ");
        List<String> tokens = Arrays.stream(cleaned.trim().split("\\s+"))
                .filter(part -> !part.isBlank())
                .filter(part -> !DOMAIN_STOP_WORDS.contains(part))
                .toList();

        if (tokens.isEmpty()) {
            return List.of();
        }

        var variants = new LinkedHashSet<String>();
        List<String> withoutTrailingNoise = stripTrailingNoiseTokens(tokens);
        if (!withoutTrailingNoise.equals(tokens)) {
            addDomainVariant(variants, withoutTrailingNoise);
            addDomainVariant(variants, removeGlueWords(withoutTrailingNoise));
        }
        if (tokens.size() == 3 && "og".equals(tokens.get(1))) {
            addDomainVariant(variants, tokens);
            addDomainVariant(variants, removeGlueWords(tokens));
        }
        if (tokens.size() > 2) {
            addDomainVariant(variants, tokens.subList(0, 2));
            addDomainVariant(variants, removeGlueWords(tokens.subList(0, 2)));
            addFirstTwoAndLastBusinessWordVariant(variants, tokens);
        }
        addDomainVariant(variants, removeGlueWords(tokens));
        addDomainVariant(variants, tokens);
        addFirstAndLastBusinessWordVariant(variants, tokens);

        return variants.stream().toList();
    }

    private void addDomainVariant(LinkedHashSet<String> variants, List<String> tokens) {
        String normalized = tokens.stream()
                .filter(part -> !part.isBlank())
                .limit(3)
                .collect(Collectors.joining());
        if (hasText(normalized)) {
            variants.add(normalized);
        }
    }

    private List<String> removeGlueWords(List<String> tokens) {
        return tokens.stream()
                .filter(token -> !"og".equals(token))
                .toList();
    }

    private void addFirstAndLastBusinessWordVariant(LinkedHashSet<String> variants, List<String> tokens) {
        List<String> withoutGlueWords = removeGlueWords(stripTrailingNoiseTokens(tokens));
        if (withoutGlueWords.size() < 3) {
            return;
        }

        String first = withoutGlueWords.getFirst();
        String last = DOMAIN_COMPOUND_SUFFIX_REPLACEMENTS.getOrDefault(withoutGlueWords.getLast(), withoutGlueWords.getLast());
        if (hasText(first) && hasText(last) && !first.equals(last)) {
            addDomainVariant(variants, List.of(first, last));
        }
    }

    private void addFirstTwoAndLastBusinessWordVariant(LinkedHashSet<String> variants, List<String> tokens) {
        List<String> withoutGlueWords = removeGlueWords(stripTrailingNoiseTokens(tokens));
        if (withoutGlueWords.size() < 3) {
            return;
        }

        String first = withoutGlueWords.get(0);
        String second = withoutGlueWords.get(1);
        String last = DOMAIN_COMPOUND_SUFFIX_REPLACEMENTS.getOrDefault(withoutGlueWords.getLast(), withoutGlueWords.getLast());
        if (hasText(first) && hasText(second) && hasText(last) && !second.equals(last)) {
            addDomainVariant(variants, List.of(first, second, last));
        }
    }

    private List<String> stripTrailingNoiseTokens(List<String> tokens) {
        List<String> stripped = new ArrayList<>(tokens);
        while (stripped.size() > 1 && isDroppableTrailingToken(stripped.getLast())) {
            stripped.removeLast();
        }
        return stripped;
    }

    private boolean isDroppableTrailingToken(String token) {
        return isSequenceToken(token) || DOMAIN_TRAILING_QUALIFIERS.contains(token.trim().toLowerCase(Locale.ROOT));
    }

    private boolean isSequenceToken(String token) {
        if (!hasText(token)) {
            return false;
        }
        String normalized = token.trim().toLowerCase(Locale.ROOT);
        return normalized.matches("\\d+")
                || DOMAIN_SEQUENCE_TOKENS.contains(normalized);
    }

    private String dashedDomainVariant(String normalized, String companyName) {
        List<String> tokens = normalizeCompanyNameTokensForDomain(companyName);
        List<String> withoutTrailingNoise = stripTrailingNoiseTokens(tokens);
        List<String> selectedTokens = withoutTrailingNoise.isEmpty() ? tokens : withoutTrailingNoise;
        String compact = selectedTokens.stream().limit(3).collect(Collectors.joining());
        if (!compact.equals(normalized) || selectedTokens.size() < 2) {
            return null;
        }
        return selectedTokens.stream()
                .limit(3)
                .collect(Collectors.joining("-"));
    }

    private List<String> normalizeCompanyNameTokensForDomain(String companyName) {
        if (!hasText(companyName)) {
            return List.of();
        }
        String cleaned = companyName
                .toLowerCase(Locale.ROOT)
                .replace('æ', 'a')
                .replace('ø', 'o')
                .replace('å', 'a')
                .replace("&", " og ")
                .replace("+", " og ")
                .transform(normalized -> NON_ALPHANUMERIC_SPACE_PATTERN.matcher(normalized).replaceAll(" "));

        return Arrays.stream(cleaned.trim().split("\\s+"))
                .filter(part -> !part.isBlank())
                .filter(part -> !DOMAIN_STOP_WORDS.contains(part))
                .toList();
    }

    private String extractEmailDomain(String email) {
        if (!hasText(email) || !email.contains("@")) {
            return null;
        }
        return email.substring(email.indexOf('@') + 1).trim().toLowerCase(Locale.ROOT);
    }

    private boolean isGenericEmailDomain(String emailDomain) {
        return Set.of(
                "gmail.com",
                "gmail.no",
                "outlook.com",
                "outlook.no",
                "hotmail.com",
                "hotmail.no",
                "live.com",
                "live.no",
                "icloud.com",
                "me.com",
                "online.no",
                "yahoo.com",
                "yahoo.no",
                "proton.me",
                "protonmail.com"
        ).contains(emailDomain);
    }

    private String normalizeWebsiteCandidate(String website) {
        if (!hasText(website)) {
            throw new IllegalArgumentException("URL mangler.");
        }
        String normalized = website.trim();
        if (normalized.startsWith("http://") || normalized.startsWith(HTTPS_PREFIX)) {
            return normalized;
        }
        return HTTPS_PREFIX + normalized;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private List<ScoreEvidence> scoreEvidence(CompanyCheck companyCheck, EnhetResponse enhet, List<CompanyEvent> events) {
        Map<String, ScoreEvidence> evidence = new LinkedHashMap<>();

        companyCheck.funn().stream()
                .filter(Objects::nonNull)
                .forEach(finding -> {
                    String label = finding.label();
                    String detail = finding.detail();
                    if (label == null || detail == null || detail.isBlank()) {
                        return;
                    }
                    evidence.putIfAbsent(label, new ScoreEvidence(label, normalizeFindingDetail(label, detail), sourceForFinding(label)));
                });

        if (events.stream().anyMatch(event -> EVENT_BANKRUPTCY.equals(event.type()))) {
            evidence.putIfAbsent(EVIDENCE_BANKRUPTCY_REGISTERED,
                    new ScoreEvidence(EVIDENCE_BANKRUPTCY_REGISTERED, "Åpne registerdata viser konkursrelatert hendelse for virksomheten.", SOURCE_BRREG_ANNOUNCEMENTS));
        }
        if (events.stream().anyMatch(event -> EVENT_DISSOLUTION.equals(event.type()))) {
            evidence.putIfAbsent("Tvangsoppløsning registrert",
                    new ScoreEvidence("Tvangsoppløsning registrert", "Åpne registerdata viser tvangsoppløsning eller tvangsavvikling.", SOURCE_BRREG_ANNOUNCEMENTS));
        }
        if (events.stream().anyMatch(event -> EVENT_WINDING_UP.equals(event.type()))) {
            evidence.putIfAbsent("Avvikling registrert",
                    new ScoreEvidence("Avvikling registrert", "Virksomheten står som under avvikling i åpne registerspor.", "BRREG / kunngjøringer"));
        }
        if (enhet != null && enhet.registreringsdatoEnhetsregisteret() != null) {
            evidence.putIfAbsent("Nyregistrert selskap",
                    new ScoreEvidence("Nyregistrert selskap",
                            "Virksomheten ble registrert %s.".formatted(enhet.registreringsdatoEnhetsregisteret()),
                            SOURCE_BRREG_UNIT_REGISTER));
        }
        if (enhet != null && isBlank(enhet.hjemmeside())) {
            evidence.putIfAbsent("Ingen registrert nettside",
                    new ScoreEvidence("Ingen registrert nettside", "Det finnes ingen registrert nettside i åpne BRREG-data.", SOURCE_BRREG_BASE_DATA));
        }
        if (enhet != null && isBlank(enhet.epostadresse())) {
            evidence.putIfAbsent("Ingen registrert e-post",
                    new ScoreEvidence("Ingen registrert e-post", "Det finnes ingen registrert e-postadresse i åpne BRREG-data.", SOURCE_BRREG_BASE_DATA));
        }
        if (enhet != null && isBlank(firstNonBlank(enhet.telefon(), enhet.mobil()))) {
            evidence.putIfAbsent("Ingen registrert telefon",
                    new ScoreEvidence("Ingen registrert telefon", "Det finnes ingen registrert telefon i åpne BRREG-data.", SOURCE_BRREG_BASE_DATA));
        }
        if (enhet != null && Boolean.FALSE.equals(enhet.registrertIForetaksregisteret())) {
            evidence.putIfAbsent("Ikke i Foretaksregisteret",
                    new ScoreEvidence("Ikke i Foretaksregisteret", "Virksomheten er ikke registrert i Foretaksregisteret.", "BRREG registerstatus"));
        }
        if (enhet != null && Boolean.FALSE.equals(enhet.registrertIMvaregisteret())) {
            evidence.putIfAbsent("Ikke MVA-registrert",
                    new ScoreEvidence("Ikke MVA-registrert", "Virksomheten er ikke registrert i Merverdiavgiftsregisteret.", "BRREG registerstatus"));
        }
        if (enhet != null && enhet.naeringskode1() == null) {
            evidence.putIfAbsent("Manglende næringskode",
                    new ScoreEvidence("Manglende næringskode", "Åpne data viser ikke en tydelig næringskode for virksomheten.", SOURCE_BRREG_BASE_DATA));
        }

        return evidence.values().stream().limit(6).toList();
    }

    private List<StructureSignal> structureSignals(
            CompanyCheck companyCheck,
            EnhetResponse enhet,
            List<CompanyEvent> events,
            List<NetworkActor> network
    ) {
        Map<String, StructureSignal> signals = new LinkedHashMap<>();
        List<NetworkActor> actors = network == null ? List.of() : network;
        LocalDate selectedRegistrationDate = registrationDate(enhet, events);
        boolean newlyRegistered = isNewlyRegistered(selectedRegistrationDate);

        if (newlyRegistered) {
            signals.put("NEW_COMPANY_WINDOW", new StructureSignal(
                    "NEW_COMPANY_WINDOW",
                    "Nytt selskap i fersk fase",
                    "Selskapet er nylig registrert og bør leses sammen med mønstre rundt aktører og relaterte virksomheter.",
                    "INFO",
                    SOURCE_BRREG_UNIT_REGISTER
            ));
        }

        CompanyFacts facts = companyCheck.fakta();
        if (isBoSignal(companyCheck, enhet)) {
            signals.put(SIGNAL_BO, new StructureSignal(
                    SIGNAL_BO,
                    "Bo-signal i registergrunnlaget",
                    "Navn, organisasjonsform eller registerspor peker mot bo-signal som konkursbo eller lignende avviklingsspor.",
                    "HIGH",
                    SOURCE_BRREG_BASE_DATA
            ));
        }
        if (events.stream().anyMatch(event -> EVENT_BANKRUPTCY.equals(event.type()))) {
            signals.put(SIGNAL_BANKRUPTCY, new StructureSignal(
                    SIGNAL_BANKRUPTCY,
                    EVIDENCE_BANKRUPTCY_REGISTERED,
                    "Åpne registerspor viser konkursrelatert hendelse for selskapet.",
                    "HIGH",
                    SOURCE_BRREG_ANNOUNCEMENTS
            ));
        }
        if (events.stream().anyMatch(event -> EVENT_DISSOLUTION.equals(event.type()) || EVENT_WINDING_UP.equals(event.type()))) {
            signals.put(SIGNAL_DISSOLUTION, new StructureSignal(
                    SIGNAL_DISSOLUTION,
                    "Avvikling eller oppløsning registrert",
                    "Åpne registerspor viser avvikling, tvangsoppløsning eller lignende oppløsningssignal for selskapet.",
                    "HIGH",
                    SOURCE_BRREG_ANNOUNCEMENTS
            ));
        }
        if (facts != null && (!facts.harKontaktdata() || !facts.harRoller())) {
            signals.put("LIMITED_DATA_PATTERN", new StructureSignal(
                    "LIMITED_DATA_PATTERN",
                    "Tynt datagrunnlag i åpne spor",
                    "Selskapet har begrenset kontakt- eller rollegrunnlag i åpne registerdata, noe som gjør manuell kontroll viktigere.",
                    "INFO",
                    "BRREG grunndata / roller"
            ));
        }

        List<NetworkActor> bankruptcyActors = actors.stream()
                .filter(actor -> actor.bankruptcyCompanyCount() > 0)
                .toList();
        if (!bankruptcyActors.isEmpty()) {
            int bankruptcyCompanies = bankruptcyActors.stream().mapToInt(NetworkActor::bankruptcyCompanyCount).sum();
            signals.put("BANKRUPTCY_RELATION", new StructureSignal(
                    "BANKRUPTCY_RELATION",
                    "Rolleholder med konkurshistorikk",
                    "%s rolleholder%s er knyttet til %s selskap%s med konkursmarkering: %s."
                            .formatted(
                                    bankruptcyActors.size(),
                                    bankruptcyActors.size() == 1 ? "" : "e",
                                    bankruptcyCompanies,
                                    bankruptcyCompanies == 1 ? "" : "er",
                                    joinActorNames(bankruptcyActors)
                            ),
                    "HIGH",
                    "Internt nettverkssnapshot / BRREG"
            ));
        }

        List<NetworkCompanyLink> recentBankruptcyRelations = relatedCompaniesWithinWindow(actors, companyCheck.organisasjonsnummer(), selectedRegistrationDate,
                link -> link.bankruptcySignal() && !link.dissolvedSignal());
        if (newlyRegistered && !recentBankruptcyRelations.isEmpty()) {
            signals.put(SIGNAL_RECENT_BANKRUPTCY_RELATION, new StructureSignal(
                    SIGNAL_RECENT_BANKRUPTCY_RELATION,
                    "Nylig konkursspor rundt samme aktører",
                    "Dette nye selskapet deler aktører med %s nylig registrert eller tidsnært selskap%s med konkursspor: %s."
                            .formatted(
                                    recentBankruptcyRelations.size(),
                                    recentBankruptcyRelations.size() == 1 ? "" : "er",
                                    joinCompanyNames(recentBankruptcyRelations)
                            ),
                    "HIGH",
                    SOURCE_INTERNAL_NETWORK_SNAPSHOT
            ));
        }

        List<NetworkActor> dissolvedActors = actors.stream()
                .filter(actor -> actor.dissolvedCompanyCount() > 0)
                .toList();
        if (!dissolvedActors.isEmpty()) {
            int dissolvedCompanies = dissolvedActors.stream().mapToInt(NetworkActor::dissolvedCompanyCount).sum();
            signals.put("DISSOLUTION_RELATION", new StructureSignal(
                    "DISSOLUTION_RELATION",
                    "Rolleholder med avviklingshistorikk",
                    "%s rolleholder%s er knyttet til %s selskap%s under avvikling eller oppløsning: %s."
                            .formatted(
                                    dissolvedActors.size(),
                                    dissolvedActors.size() == 1 ? "" : "e",
                                    dissolvedCompanies,
                                    dissolvedCompanies == 1 ? "" : "er",
                                    joinActorNames(dissolvedActors)
                            ),
                    "HIGH",
                    "Internt nettverkssnapshot / BRREG"
            ));
        }

        List<NetworkCompanyLink> recentDissolutionRelations = relatedCompaniesWithinWindow(actors, companyCheck.organisasjonsnummer(), selectedRegistrationDate,
                NetworkCompanyLink::dissolvedSignal);
        if (newlyRegistered && !recentDissolutionRelations.isEmpty()) {
            signals.put(SIGNAL_RECENT_DISSOLUTION_RELATION, new StructureSignal(
                    SIGNAL_RECENT_DISSOLUTION_RELATION,
                    "Nylig avviklingsspor rundt samme aktører",
                    "Dette nye selskapet deler aktører med %s nylig registrert eller tidsnært selskap%s med avviklings- eller oppløsningsspor: %s."
                            .formatted(
                                    recentDissolutionRelations.size(),
                                    recentDissolutionRelations.size() == 1 ? "" : "er",
                                    joinCompanyNames(recentDissolutionRelations)
                            ),
                    "HIGH",
                    SOURCE_INTERNAL_NETWORK_SNAPSHOT
            ));
        }

        List<NetworkActor> sharedActors = actors.stream()
                .filter(actor -> actor.totalCompanyCount() > 1)
                .toList();
        if (!sharedActors.isEmpty()) {
            int relatedCompanies = sharedActors.stream()
                    .mapToInt(actor -> Math.max(actor.totalCompanyCount() - 1, 0))
                    .sum();
            signals.put("SHARED_ACTOR_PATTERN", new StructureSignal(
                    "SHARED_ACTOR_PATTERN",
                    "Samme aktører går igjen på tvers av selskaper",
                    "%s rolleholder%s i dette selskapet går igjen på tvers av minst %s andre selskap%s: %s."
                            .formatted(
                                    sharedActors.size(),
                                    sharedActors.size() == 1 ? "" : "e",
                                    relatedCompanies,
                                    relatedCompanies == 1 ? "" : "er",
                                    joinActorNames(sharedActors)
                            ),
                    newlyRegistered ? CONFIDENCE_MEDIUM : "INFO",
                    "Internt nettverkssnapshot"
            ));
        }

        List<NetworkCompanyLink> clusteredNewCompanies = relatedCompaniesWithinWindow(actors, companyCheck.organisasjonsnummer(), selectedRegistrationDate,
                link -> link.registrationDate() != null && withinDays(selectedRegistrationDate, link.registrationDate(), NEW_COMPANY_WINDOW_DAYS));
        if (newlyRegistered && !clusteredNewCompanies.isEmpty()) {
            signals.put(SIGNAL_CLUSTERED_NEW_COMPANY_PATTERN, new StructureSignal(
                    SIGNAL_CLUSTERED_NEW_COMPANY_PATTERN,
                    "Flere nye selskaper med samme aktører",
                    "Dette nye selskapet ligger tett i tid med %s annet selskap%s med samme aktører: %s."
                            .formatted(
                                    clusteredNewCompanies.size(),
                                    clusteredNewCompanies.size() == 1 ? "" : "er",
                                    joinCompanyNames(clusteredNewCompanies)
                            ),
                    CONFIDENCE_MEDIUM,
                    SOURCE_INTERNAL_NETWORK_SNAPSHOT
            ));
        }

        if (newlyRegistered && (signals.containsKey(SIGNAL_RECENT_BANKRUPTCY_RELATION)
                || signals.containsKey(SIGNAL_RECENT_DISSOLUTION_RELATION)
                || signals.containsKey(SIGNAL_CLUSTERED_NEW_COMPANY_PATTERN)
                || signals.containsKey(SIGNAL_BO)
                || hasActorRiskPattern(companyCheck)
                || signals.containsKey(SIGNAL_BANKRUPTCY)
                || signals.containsKey(SIGNAL_DISSOLUTION))) {
            signals.put("POSSIBLE_REORGANIZATION", new StructureSignal(
                    "POSSIBLE_REORGANIZATION",
                    "Mulig omregistrering eller ny struktur",
                    "Kombinasjonen av nytt selskap, tidsnære relasjoner og strukturelle eller aktørbaserte spor bør vurderes manuelt som mulig omregistrering eller ny struktur rundt eksisterende aktivitet.",
                    "HIGH",
                    "Avledet fra registerspor, tidsnærhet og nettverk"
            ));
        }

        List<NetworkActor> elevatedActorContext = actors.stream()
                .filter(this::shouldElevateActorContext)
                .toList();
        if (!elevatedActorContext.isEmpty()) {
            boolean highSeverity = elevatedActorContext.stream().anyMatch(this::isHighSeverityActorContext);
            signals.put("ACTOR_CONTEXT_ELEVATED", new StructureSignal(
                    "ACTOR_CONTEXT_ELEVATED",
                    "Aktørkontekst bør løftes frem",
                    "%s rolleholder%s passerer terskelen for relevant aktørkontekst i denne vurderingen: %s."
                            .formatted(
                                    elevatedActorContext.size(),
                                    elevatedActorContext.size() == 1 ? "" : "e",
                                    joinActorNames(elevatedActorContext)
                            ),
                    highSeverity ? "HIGH" : CONFIDENCE_MEDIUM,
                    "Internt nettverkssnapshot"
            ));
        }

        if (hasActorRiskPattern(companyCheck)) {
            signals.put("ACTOR_RISK_PATTERN", new StructureSignal(
                    "ACTOR_RISK_PATTERN",
                    "Aktørbasert risikomønster",
                    "Tilknyttede rolleholdere har historikk som påvirker vurderingen og kan peke på mønstre på tvers av selskaper.",
                    CONFIDENCE_MEDIUM,
                    "Aktørrisiko / rolledata"
            ));
        }

        int signalLimit = actors.isEmpty() ? 4 : 10;
        return signals.values().stream().limit(signalLimit).toList();
    }

    private String sourceForFinding(String label) {
        String normalized = label == null ? "" : label.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "ALVORLIGE SIGNALER", "AVVIKLING" -> "BRREG / kunngjøringer";
            case "ROLLER" -> "BRREG roller";
            case "AKTØRRISIKO", "AKTORRISIKO" -> "Intern nettverksvurdering";
            case "ALDER" -> SOURCE_BRREG_UNIT_REGISTER;
            case "STRUKTUR", "ORGANISASJONSNUMMER" -> SOURCE_BRREG_BASE_DATA;
            default -> "Scoremodell";
        };
    }

    private String normalizeFindingDetail(String label, String detail) {
        if ("OK".equalsIgnoreCase(detail)) {
            String normalizedLabel = label == null ? "" : label.trim().toUpperCase(Locale.ROOT);
            if ("ORGANISASJONSNUMMER".equals(normalizedLabel)) {
                return "Virksomheten finnes i Enhetsregisteret.";
            }
            return "Registersporet ser ryddig ut.";
        }
        if ("Registrert.".equalsIgnoreCase(detail)) {
            return "Sentrale roller er registrert i åpne rolledata.";
        }
        if ("Mangler ledelse.".equalsIgnoreCase(detail)) {
            return "Sentrale roller eller ledelse er ikke synlige i åpne rolledata.";
        }
        if ("Historikk hos tilknyttede personer.".equalsIgnoreCase(detail)) {
            return "Tilknyttede rolleholdere har historikk som påvirker vurderingen.";
        }
        if ("Nytt selskap.".equalsIgnoreCase(detail)) {
            return "Virksomheten er nylig registrert og har begrenset historikk.";
        }
        if ("Konkurs eller tvangsoppløsning.".equalsIgnoreCase(detail)) {
            return "Åpne registerdata viser alvorlige strukturelle signaler som konkurs eller tvangsoppløsning.";
        }
        if ("Selskapet er under oppløsning.".equalsIgnoreCase(detail)) {
            return "Virksomheten er registrert som under avvikling eller oppløsning.";
        }
        if ("Fisjon/Fusjon.".equalsIgnoreCase(detail)) {
            return "Det finnes signaler om fisjon eller fusjon i registergrunnlaget.";
        }
        return detail;
    }

    private boolean isNewlyRegistered(LocalDate registeredAt) {
        return registeredAt != null && !registeredAt.isBefore(LocalDate.now(clock).minusDays(NEW_COMPANY_WINDOW_DAYS));
    }

    private boolean isBoSignal(CompanyCheck companyCheck, EnhetResponse enhet) {
        String name = companyCheck.navn() == null ? "" : companyCheck.navn().toUpperCase(Locale.ROOT);
        String orgForm = enhet != null && enhet.organisasjonsform() != null && enhet.organisasjonsform().kode() != null
                ? enhet.organisasjonsform().kode().toUpperCase(Locale.ROOT)
                : "";
        return "KBO".equals(orgForm)
                || name.contains("KONKURSBO")
                || name.contains("TVANGSAVVIKLINGSBO")
                || name.contains("TVANGSOPPLOSNINGSBO")
                || name.contains("AVVIKLINGSBO");
    }

    private boolean hasActorRiskPattern(CompanyCheck companyCheck) {
        return companyCheck.funn().stream()
                .filter(Objects::nonNull)
                .anyMatch(finding -> "Aktørrisiko".equalsIgnoreCase(finding.label()));
    }

    private String joinActorNames(List<NetworkActor> actors) {
        return actors.stream()
                .map(NetworkActor::actorName)
                .filter(Objects::nonNull)
                .distinct()
                .limit(3)
                .reduce((left, right) -> left + ", " + right)
                .orElse("ukjente aktører");
    }

    private boolean shouldElevateActorContext(NetworkActor actor) {
        if (actor == null) {
            return false;
        }
        if (isHighSeverityActorContext(actor)) {
            return true;
        }
        return actor.redCompanyCount() >= 1
                || actor.dissolvedCompanyCount() >= 1
                || (actor.totalCompanyCount() >= 4 && (actor.yellowCompanyCount() + actor.redCompanyCount()) >= 2);
    }

    private boolean isHighSeverityActorContext(NetworkActor actor) {
        return actor.bankruptcyCompanyCount() > 0
                || actor.redCompanyCount() >= 2
                || (actor.dissolvedCompanyCount() >= 2 && actor.totalCompanyCount() >= 3);
    }

    private LocalDate registrationDate(EnhetResponse enhet, List<CompanyEvent> events) {
        LocalDate registeredAt = enhet != null ? enhet.registreringsdatoEnhetsregisteret() : null;
        if (registeredAt != null) {
            return registeredAt;
        }
        return events.stream()
                .filter(event -> EVENT_REGISTRATION.equals(event.type()))
                .map(this::parseEventDate)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    private List<NetworkCompanyLink> relatedCompaniesWithinWindow(
            List<NetworkActor> actors,
            String selectedOrgNumber,
            LocalDate selectedRegistrationDate,
            java.util.function.Predicate<NetworkCompanyLink> filter
    ) {
        if (selectedRegistrationDate == null) {
            return List.of();
        }
        return actors.stream()
                .flatMap(actor -> actor.relatedCompanies().stream())
                .filter(link -> !selectedOrgNumber.equals(link.orgNumber()))
                .filter(filter)
                .filter(link -> withinDays(selectedRegistrationDate, referenceDate(link), RELATION_TIMELINE_WINDOW_DAYS))
                .distinct()
                .limit(3)
                .toList();
    }

    private LocalDate referenceDate(NetworkCompanyLink link) {
        if (link.registrationDate() != null) {
            return link.registrationDate();
        }
        return link.lastSeenAt() == null ? null : link.lastSeenAt().toLocalDate();
    }

    private boolean withinDays(LocalDate left, LocalDate right, int maxDays) {
        if (left == null || right == null) {
            return false;
        }
        return Math.abs(ChronoUnit.DAYS.between(left, right)) <= maxDays;
    }

    private String joinCompanyNames(List<NetworkCompanyLink> links) {
        return links.stream()
                .map(NetworkCompanyLink::companyName)
                .filter(Objects::nonNull)
                .distinct()
                .limit(3)
                .reduce((left, right) -> left + ", " + right)
                .orElse("ukjente selskaper");
    }

    private String toRuleName(String label) {
        return label.trim()
                .toUpperCase(Locale.ROOT)
                .replace('Æ', 'E')
                .replace('Ø', 'O')
                .replace('Å', 'A')
                .replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("^_++", "")
                .replaceAll("_++$", "");
    }

    private List<String> flags(EnhetResponse enhet, CompanyFacts facts) {
        List<String> flags = new ArrayList<>();
        if ("Nytt selskap".equals(facts.modenhet())) {
            flags.add("NEW_COMPANY");
        }
        if (!facts.harKontaktdata()) {
            flags.add("LIMITED_PUBLIC_INFO");
        }
        if (Boolean.FALSE.equals(facts.registrertIMvaregisteret())) {
            flags.add("NOT_VAT_REGISTERED");
        }
        if (Boolean.FALSE.equals(facts.registrertIForetaksregisteret()) && shouldExpectBusinessRegistry(facts.organisasjonsform())) {
            flags.add("NOT_REGISTERED_IN_FORETAKSREGISTERET");
        }
        if (!facts.harRoller()) {
            flags.add("LIMITED_ROLE_INFO");
        }
        if (Boolean.TRUE.equals(enhet.konkurs())) {
            flags.add("BANKRUPTCY_ANNOUNCEMENT");
        }
        if (Boolean.TRUE.equals(enhet.underTvangsavviklingEllerTvangsopplosning())) {
            flags.add("DISSOLUTION_ANNOUNCEMENT");
        }
        if (Boolean.TRUE.equals(enhet.underAvvikling())) {
            flags.add(EVENT_WINDING_UP);
        }
        return List.copyOf(flags);
    }

    private boolean shouldExpectBusinessRegistry(String organizationForm) {
        String normalized = OrganizationFormCatalog.normalizeCode(organizationForm);
        if (normalized == null) {
            return false;
        }
        return switch (normalized.toUpperCase(Locale.ROOT)) {
            case "AS", "ASA", "ANS", "DA", "NUF", "SA", "SE", "KS" -> true;
            default -> false;
        };
    }

    private List<Role> roles(RollerResponse roller) {
        if (roller == null || roller.rollegrupper() == null) {
            return List.of();
        }

        return roller.rollegrupper().stream()
                .filter(Objects::nonNull)
                .flatMap(group -> group.roller() == null ? Stream.empty() : group.roller().stream())
                .filter(this::isActiveRole)
                .map(this::toRole)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    private Role preferredContactRole(RollerResponse roller) {
        List<Role> activeRoles = roles(roller);
        return activeRoles.stream()
                .filter(role -> ROLE_DAGLIG_LEDER.equals(role.type()))
                .findFirst()
                .or(() -> activeRoles.stream().filter(role -> ROLE_STYRELEDER.equals(role.type())).findFirst())
                .or(() -> activeRoles.stream().findFirst())
                .orElse(null);
    }

    private String preferredSummaryContactName(CompanyFacts facts) {
        if (facts == null) {
            return null;
        }
        if (facts.dagligLeder() != null && !facts.dagligLeder().isBlank()) {
            return facts.dagligLeder();
        }
        if (facts.styre() != null) {
            return facts.styre().stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(value -> !value.isBlank())
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }

    private String preferredSummaryContactRole(CompanyFacts facts) {
        if (facts == null) {
            return null;
        }
        if (facts.dagligLeder() != null && !facts.dagligLeder().isBlank()) {
            return ROLE_DAGLIG_LEDER;
        }
        if (facts.styre() != null && facts.styre().stream().anyMatch(Objects::nonNull)) {
            return "STYREMEDLEM";
        }
        return null;
    }

    private Role toRole(RollerResponse.Rolle rolle) {
        String name = roleName(rolle);
        if (name == null || name.isBlank() || rolle.type() == null || rolle.type().beskrivelse() == null) {
            return null;
        }
        return new Role(normalizeRoleType(rolle.type().beskrivelse()), name, null);
    }

    private boolean isActiveRole(RollerResponse.Rolle rolle) {
        return !Boolean.TRUE.equals(rolle.fratraadt()) && !Boolean.TRUE.equals(rolle.avregistrert());
    }

    private String roleName(RollerResponse.Rolle rolle) {
        if (rolle.person() != null && rolle.person().navn() != null) {
            return Stream.of(
                            rolle.person().navn().fornavn(),
                            rolle.person().navn().mellomnavn(),
                            rolle.person().navn().etternavn()
                    )
                    .filter(Objects::nonNull)
                    .filter(value -> !value.isBlank())
                    .reduce((left, right) -> left + " " + right)
                    .orElse(null);
        }
        if (rolle.enhet() != null && rolle.enhet().navn() != null && !rolle.enhet().navn().isEmpty()) {
            return rolle.enhet().navn().getFirst();
        }
        return null;
    }

    private String normalizeRoleType(String description) {
        String normalized = description.toUpperCase(Locale.ROOT);
        if (normalized.contains("DAGLIG")) {
            return ROLE_DAGLIG_LEDER;
        }
        if (normalized.contains(ROLE_STYRELEDER)) {
            return ROLE_STYRELEDER;
        }
        if (normalized.contains("STYRE")) {
            return "STYREMEDLEM";
        }
        if (normalized.contains("SIGNATUR")) {
            return "SIGNATUR";
        }
        if (normalized.contains("PROKURA")) {
            return "PROKURA";
        }
        return description.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "_");
    }

    private String firstNonBlank(String... values) {
        return Stream.of(values)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .findFirst()
                .orElse(null);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private List<Announcement> announcements(EnhetResponse enhet) {
        return announcementService.announcementsFor(enhet);
    }

    public List<CompanyEvent> toEvents(EnhetResponse enhet) {
        return events(enhet);
    }

    private List<CompanyEvent> events(EnhetResponse enhet) {
        if (enhet == null) {
            return List.of();
        }

        Map<String, CompanyEvent> events = new LinkedHashMap<>();
        addRegistrationEvent(events, enhet);
        announcements(enhet).stream()
                .map(this::toEvent)
                .filter(Objects::nonNull)
                .forEach(event -> events.putIfAbsent(eventKey(event), event));

        return events.values().stream()
                .sorted(Comparator
                        .comparing(this::parseEventDate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(this::severityRank)
                .thenComparing(CompanyEvent::title, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private List<CompanyEvent> summaryEvents(EnhetResponse enhet) {
        if (enhet == null) {
            return List.of();
        }

        List<CompanyEvent> events = new ArrayList<>();
        if (enhet.registreringsdatoEnhetsregisteret() != null) {
            events.add(new CompanyEvent(
                    EVENT_REGISTRATION,
                    "Nyregistrert",
                    enhet.registreringsdatoEnhetsregisteret().toString(),
                    SOURCE_BRREG_UNIT_REGISTER,
                    "INFO"
            ));
        }
        if (Boolean.TRUE.equals(enhet.konkurs())) {
            events.add(new CompanyEvent(
                    EVENT_BANKRUPTCY,
                    "Konkurs",
                    null,
                    SOURCE_BRREG,
                    "HIGH"
            ));
        }
        if (Boolean.TRUE.equals(enhet.underTvangsavviklingEllerTvangsopplosning())) {
            events.add(new CompanyEvent(
                    EVENT_DISSOLUTION,
                    "Tvangsoppløsning",
                    null,
                    SOURCE_BRREG,
                    "HIGH"
            ));
        }
        if (Boolean.TRUE.equals(enhet.underAvvikling())) {
            events.add(new CompanyEvent(
                    EVENT_WINDING_UP,
                    "Avvikling",
                    null,
                    SOURCE_BRREG,
                    CONFIDENCE_MEDIUM
            ));
        }

        return events.stream()
                .sorted(Comparator
                        .comparing(this::severityRank)
                        .thenComparing(this::parseEventDate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(CompanyEvent::title, String.CASE_INSENSITIVE_ORDER))
                .limit(3)
                .toList();
    }

    private void addRegistrationEvent(Map<String, CompanyEvent> events, EnhetResponse enhet) {
        if (enhet.registreringsdatoEnhetsregisteret() == null) {
            return;
        }
        CompanyEvent event = new CompanyEvent(
                EVENT_REGISTRATION,
                "Nyregistrering i Enhetsregisteret",
                enhet.registreringsdatoEnhetsregisteret().toString(),
                SOURCE_BRREG_UNIT_REGISTER,
                "INFO"
        );
        events.putIfAbsent(eventKey(event), event);
    }

    private CompanyEvent toEvent(Announcement announcement) {
        return switch (announcement.type()) {
            case EVENT_BANKRUPTCY -> new CompanyEvent(EVENT_BANKRUPTCY, announcement.title(), announcement.date(), announcement.source(), "HIGH");
            case EVENT_DISSOLUTION -> new CompanyEvent(EVENT_DISSOLUTION, announcement.title(), announcement.date(), announcement.source(), "HIGH");
            case EVENT_WINDING_UP -> new CompanyEvent(EVENT_WINDING_UP, announcement.title(), announcement.date(), announcement.source(), CONFIDENCE_MEDIUM);
            case "ADDRESS_CHANGE" -> new CompanyEvent("ADDRESS_CHANGE", announcement.title(), announcement.date(), announcement.source(), "INFO");
            case "ARTICLES_OF_ASSOCIATION" -> new CompanyEvent("ARTICLES_OF_ASSOCIATION", announcement.title(), announcement.date(), announcement.source(), "INFO");
            case EVENT_REGISTRATION -> new CompanyEvent(EVENT_REGISTRATION, announcement.title(), announcement.date(), announcement.source(), "INFO");
            default -> null;
        };
    }

    private String eventKey(CompanyEvent event) {
        return "%s|%s|%s".formatted(event.type(), Objects.toString(event.date(), ""), event.title());
    }

    private LocalDate parseEventDate(CompanyEvent event) {
        if (event.date() == null || event.date().isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(event.date());
        } catch (DateTimeParseException ignored) {
            try {
                return LocalDate.parse(event.date(), DateTimeFormatter.ofPattern("dd.MM.yyyy"));
            } catch (DateTimeParseException ignoredAgain) {
                return null;
            }
        }
    }

    private int severityRank(CompanyEvent event) {
        return switch (event.severity()) {
            case "HIGH" -> 0;
            case CONFIDENCE_MEDIUM -> 1;
            default -> 2;
        };
    }

    private String organizationFormCode(EnhetResponse enhet, CompanyFacts facts) {
        if (enhet.organisasjonsform() != null && enhet.organisasjonsform().kode() != null) {
            return enhet.organisasjonsform().kode();
        }
        return facts.organisasjonsform();
    }

    private String naceCode(EnhetResponse enhet) {
        return enhet.naeringskode1() == null ? null : enhet.naeringskode1().kode();
    }

    private String naceDescription(EnhetResponse enhet) {
        return enhet.naeringskode1() == null ? null : enhet.naeringskode1().beskrivelse();
    }

    private SalesSegment salesSegment(EnhetResponse enhet) {
        return SalesSegmentCatalog.fromNaceCode(naceCode(enhet));
    }

    private String municipality(EnhetResponse enhet) {
        EnhetResponse.Adresse address = preferredAddress(enhet);
        return address == null ? null : address.kommune();
    }

    private String county(EnhetResponse enhet) {
        EnhetResponse.Adresse address = preferredAddress(enhet);
        return address == null ? null : address.fylke();
    }

    private String address(EnhetResponse enhet) {
        EnhetResponse.Adresse address = preferredAddress(enhet);
        if (address == null || address.adresse() == null || address.adresse().isEmpty()) {
            return null;
        }
        return String.join(", ", address.adresse());
    }

    private String postalCode(EnhetResponse enhet) {
        EnhetResponse.Adresse address = preferredAddress(enhet);
        return address == null ? null : address.postnummer();
    }

    private String postalPlace(EnhetResponse enhet) {
        EnhetResponse.Adresse address = preferredAddress(enhet);
        return address == null ? null : address.poststed();
    }

    private String status(EnhetResponse enhet) {
        if (Boolean.TRUE.equals(enhet.konkurs())) {
            return EVENT_BANKRUPTCY;
        }
        if (Boolean.TRUE.equals(enhet.underTvangsavviklingEllerTvangsopplosning())) {
            return "FORCED_DISSOLUTION";
        }
        if (Boolean.TRUE.equals(enhet.underAvvikling())) {
            return EVENT_WINDING_UP;
        }
        return "ACTIVE";
    }

    private EnhetResponse.Adresse preferredAddress(EnhetResponse enhet) {
        return enhet.forretningsadresse() != null ? enhet.forretningsadresse() : enhet.postadresse();
    }
}
