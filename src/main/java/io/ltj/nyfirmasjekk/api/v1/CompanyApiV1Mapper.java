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
    private static final Pattern EMAIL_PATTERN = Pattern.compile("[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", Pattern.CASE_INSENSITIVE);
    private static final Pattern PHONE_PATTERN = Pattern.compile("(\\+47\\s*)?(\\d\\s*){8}");
    private static final Pattern COPYRIGHT_YEAR_PATTERN = Pattern.compile("(?i)(copyright|©|&copy;)\\s*(20\\d{2})");
    private static final Set<String> WEAK_PAGE_TITLES = Set.of("home", "hjem", "untitled", "index", "velkommen", "coming soon");
    private static final Set<String> CALL_TO_ACTION_WORDS = Set.of(
            "kontakt", "contact", "ring", "bestill", "booking", "book", "send forespørsel", "be om tilbud", "få tilbud", "ta kontakt"
    );
    private static final Set<String> GENERIC_MARKETING_WORDS = Set.of(
            "kvalitet", "service", "profesjonell", "skreddersydd", "losninger", "løsninger", "erfaring", "dyktige", "trygg", "effektiv"
    );
    private static final Set<String> GENERIC_EMAIL_DOMAINS = Set.of(
            "gmail.com", "hotmail.com", "hotmail.no", "outlook.com", "live.com", "icloud.com", "yahoo.com", "yahoo.no", "online.no"
    );
    private static final Set<String> SENSITIVE_HEALTH_CONTEXT_WORDS = Set.of(
            "helse",
            "journal",
            "pasient",
            "behandling",
            "diagnose",
            "lege",
            "psykolog",
            "terapi",
            "klinikk",
            "timebestilling",
            "konsultasjon",
            "personopplysninger",
            "sensitive opplysninger",
            "helseopplysninger"
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
                    "Nettsiden er registrert i BRREG.",
                    null,
                    List.of(new WebsiteCandidateCheck(
                            website,
                            true,
                            true,
                            null,
                            "Nettsiden er registrert i BRREG."
                    )),
                    "Nettsiden er registrert i BRREG.",
                    SOURCE_BRREG
            );
        }

        String emailDomain = extractEmailDomain(enhet.epostadresse());
        if (hasText(emailDomain) && !isGenericEmailDomain(emailDomain)) {
            String candidate = HTTPS_PREFIX + emailDomain;
            boolean reachable = websiteReachabilityService.isReachable(candidate);
            WebsiteContentMatch contentMatch = reachable
                    ? websiteContentInspectionService.inspect(candidate, companyCheck.navn(), emailDomain)
                    : new WebsiteContentMatch(false, "Domene svarte ikke ved sjekk.", null);
            List<WebsiteCandidateCheck> candidateChecks = List.of(toWebsiteCandidateCheck(candidate, reachable, contentMatch));
            return new WebsiteDiscovery(
                    "POSSIBLE_MATCH",
                    reachable && contentMatch.matched() ? "HIGH" : reachable ? CONFIDENCE_MEDIUM : "LOW",
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
            List<WebsiteCandidateCheck> candidateChecks = inspectAllCandidates
                    ? checkWebsiteCandidates(nameCandidates, companyCheck.navn(), emailDomain)
                    : List.of();
            String reachableCandidate = inspectAllCandidates
                    ? preferredWebsiteCandidate(candidateChecks)
                    : firstReachableCandidate(nameCandidates);
            WebsiteCandidateCheck preferredCheck = inspectAllCandidates
                    ? candidateChecks.stream()
                    .filter(check -> Objects.equals(check.url(), reachableCandidate))
                    .findFirst()
                    .orElse(null)
                    : null;
            boolean reachable = reachableCandidate != null;
            WebsiteContentMatch contentMatch = preferredCheck != null
                    ? new WebsiteContentMatch(
                    Boolean.TRUE.equals(preferredCheck.contentMatched()),
                    preferredCheck.reason(),
                    preferredCheck.pageTitle()
            )
                    : reachable
                    ? websiteContentInspectionService.inspect(reachableCandidate, companyCheck.navn(), emailDomain)
                    : new WebsiteContentMatch(false, "Ingen av kandidatene svarte ved sjekk.", null);
            return new WebsiteDiscovery(
                    "POSSIBLE_MATCH",
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
                    "MISSING_HTTPS",
                    "Mangler HTTPS",
                    "Nettsiden er registrert uten HTTPS. Det kan gi svakere tillit og nettleservarsler.",
                    "MEDIUM"
            ));
        }

        boolean reachable = websiteReachabilityService.isReachable(website);
        if (!reachable) {
            signals.add(new WebsiteQualitySignal(
                    "TECHNICAL_FAILURE",
                    "Teknisk feil",
                    "Nettsiden svarte ikke ved teknisk sjekk. Dette kan skyldes DNS, timeout, SSL-feil, 404/5xx eller midlertidig nedetid.",
                    "HIGH"
            ));
            return new WebsiteQualityAssessment(
                    "WEAK",
                    "Nettsiden svarer ikke",
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
            return assessmentFromSignals(signals, "Nettsiden svarer, men innholdet kunne ikke vurderes.");
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
        addActionSignal(signals, snapshot);
        addBrandDomainSignal(signals, companyCheck, website);
        addEmailDomainSignal(signals, snapshot, website);
        addFreshnessSignal(signals, snapshot);
        addResponsiveSignals(signals, snapshot);
        addAccessibilitySignals(signals, snapshot);
        addSecuritySignals(signals, website, snapshot);
        addPrivacySignals(signals, snapshot);
        addTechnologySignals(signals, snapshot);

        return assessmentFromSignals(signals, signals.isEmpty()
                ? "Nettsiden svarte og de viktigste grunnsignalene ser greie ut."
                : "Nettsiden svarte, men har noen signaler som bør vurderes manuelt.");
    }

    private WebsiteQualityAssessment assessmentFromSignals(List<WebsiteQualitySignal> signals, String summary) {
        boolean hasHigh = signals.stream().anyMatch(signal -> "HIGH".equals(signal.severity()));
        boolean hasMedium = signals.stream().anyMatch(signal -> "MEDIUM".equals(signal.severity()));
        String status = hasHigh ? "WEAK" : hasMedium ? "NEEDS_REVIEW" : "OK";
        String label = switch (status) {
            case "WEAK" -> "Svak nettsideflate";
            case "NEEDS_REVIEW" -> "Bør vurderes";
            default -> "Ser grei ut";
        };
        return new WebsiteQualityAssessment(status, label, summary, signals);
    }

    private void addContentQualitySignals(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        String title = snapshot.title() == null ? "" : snapshot.title().trim();
        if (title.isBlank() || WEAK_PAGE_TITLES.contains(title.toLowerCase(Locale.ROOT))) {
            signals.add(new WebsiteQualitySignal(
                    "WEAK_TITLE",
                    "Svak sidetittel",
                    "Sidetittelen er tom eller svært generisk. Det gjør siden svakere i søk og deling.",
                    "MEDIUM"
            ));
        }
        if (!hasText(snapshot.h1())) {
            signals.add(new WebsiteQualitySignal(
                    "WEAK_HOMEPAGE_STRUCTURE",
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
                    "MISSING_META_DESCRIPTION",
                    "Mangler beskrivelse",
                    "Siden mangler meta description. Det kan gi svakere presentasjon i søkeresultater.",
                    "INFO"
            ));
        }
        String bodyText = snapshot.bodyText() == null ? "" : snapshot.bodyText().trim();
        if (bodyText.length() < 300) {
            signals.add(new WebsiteQualitySignal(
                    "THIN_CONTENT",
                    "Svak tekstmengde",
                    "Førstesiden har lite tekstinnhold. Det kan gjøre det vanskelig for kunder og søkemotorer å forstå hva virksomheten tilbyr.",
                    "MEDIUM"
            ));
        }
    }

    private void addSharePreviewSignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        if (!snapshot.openGraphTitle() || !snapshot.openGraphDescription()) {
            signals.add(new WebsiteQualitySignal(
                    "WEAK_SHARE_PREVIEW",
                    "Svak delingsvisning",
                    "Siden mangler trolig Open Graph/Twitter-tittel eller beskrivelse. Lenken kan derfor se svakere ut når den deles i e-post, sosiale medier eller meldinger.",
                    "INFO"
            ));
        }
    }

    private void addStructuredDataSignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        if (!snapshot.structuredData()) {
            signals.add(new WebsiteQualitySignal(
                    "MISSING_STRUCTURED_DATA",
                    "Mangler strukturert data",
                    "Siden ser ikke ut til å ha strukturert data. Det kan gjøre det vanskeligere for søkemotorer å forstå virksomhet, kontaktpunkt og innhold.",
                    "INFO"
            ));
        }
    }

    private void addNavigationSignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        if (!snapshot.navigation() && snapshot.linkCount() < 2 && snapshot.headingCount() < 2) {
            signals.add(new WebsiteQualitySignal(
                    "WEAK_NAVIGATION",
                    "Svak struktur",
                    "Siden ser ut til å ha lite navigasjon eller få seksjoner. Det kan gjøre det vanskeligere å orientere seg i tjenester, kontakt og informasjon.",
                    "INFO"
            ));
        }
    }

    private void addContactQualitySignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot, EnhetResponse enhet) {
        String text = ((snapshot.bodyText() == null ? "" : snapshot.bodyText()) + " " + (snapshot.html() == null ? "" : snapshot.html())).toLowerCase(Locale.ROOT);
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
    }

    private void addLocalRelevanceSignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot, EnhetResponse enhet) {
        String location = firstNonBlank(enhet.forretningsadresse() == null ? null : enhet.forretningsadresse().kommune(), enhet.forretningsadresse() == null ? null : enhet.forretningsadresse().fylke());
        if (!hasText(location)) {
            return;
        }
        String text = normalizeForWebsiteQuality((snapshot.title() == null ? "" : snapshot.title()) + " " + (snapshot.bodyText() == null ? "" : snapshot.bodyText()));
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
        String text = normalizeForWebsiteQuality((snapshot.title() == null ? "" : snapshot.title()) + " " + (snapshot.bodyText() == null ? "" : snapshot.bodyText()));
        boolean hasIndustryToken = tokens.stream().anyMatch(text::contains);
        if (!hasIndustryToken) {
            signals.add(new WebsiteQualitySignal(
                    "WEAK_INDUSTRY_RELEVANCE",
                    "Svak tjenestebeskrivelse",
                    "BRREG-bransjen ser ikke tydelig igjen i nettsideteksten. Det kan gjøre det uklart hva kunden faktisk kan bestille.",
                    "INFO"
            ));
        }
    }

    private void addServiceDescriptionSignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot, EnhetResponse enhet) {
        String bodyText = normalizeForWebsiteQuality(snapshot.bodyText() == null ? "" : snapshot.bodyText());
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
                    "GENERIC_SERVICE_TEXT",
                    "For generell tekst",
                    "Teksten virker generell og lite knyttet til konkrete tjenester, sted eller bransje. Mer konkret innhold kan gjøre siden mer troverdig.",
                    "INFO"
            ));
        }
    }

    private void addTrustSignal(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot, CompanyCheck companyCheck, EnhetResponse enhet) {
        String text = normalizeForWebsiteQuality((snapshot.bodyText() == null ? "" : snapshot.bodyText()) + " " + (snapshot.html() == null ? "" : snapshot.html()));
        String orgNumber = companyCheck.organisasjonsnummer();
        if (hasText(orgNumber) && !text.contains(orgNumber) && !text.contains(formatOrgNumberWithSpaces(orgNumber))) {
            signals.add(new WebsiteQualitySignal(
                    "MISSING_ORG_NUMBER",
                    "Mangler org.nr. på siden",
                    "Siden ser ikke ut til å vise organisasjonsnummer. Det er et konkret tillitssignal som ofte bør være synlig for nye virksomheter.",
                    "INFO"
            ));
        }
        String legalName = normalizeForWebsiteQuality(companyCheck.navn());
        if (legalName.length() >= 5 && !text.contains(legalName)) {
            signals.add(new WebsiteQualitySignal(
                    "LEGAL_NAME_NOT_VISIBLE",
                    "Mangler juridisk firmanavn",
                    "Siden bruker ikke tydelig firmanavnet fra BRREG. For nye kunder kan juridisk navn gi mer tillit og etterprøvbarhet.",
                    "INFO"
            ));
        }
        String businessAddress = addressText(enhet.forretningsadresse());
        String postalAddress = addressText(enhet.postadresse());
        if (!hasText(businessAddress) && !hasText(postalAddress)) {
            return;
        }
        if (!text.contains("adresse") && !text.contains("kart") && !text.contains("besok") && !text.contains("besøk")) {
            signals.add(new WebsiteQualitySignal(
                    "MISSING_ADDRESS_OR_AREA",
                    "Mangler adresse eller områdeinfo",
                    "Siden viser ikke tydelig adresse, kart eller dekningsområde. Dette kan svekke lokal tillit og søkbarhet.",
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
        }
        if (snapshot.imageCount() > 0 && snapshot.imagesWithoutAlt() > 0) {
            signals.add(new WebsiteQualitySignal(
                    "IMAGE_ALT_RISK",
                    "Mulig UU-risiko på bilder",
                    snapshot.imagesWithoutAlt() + " av " + snapshot.imageCount() + " bilder mangler eller har tom alt-tekst. Det kan være riktig for dekorbilder, men bør sjekkes.",
                    "INFO"
            ));
        }
        if (snapshot.formControlCount() > 0 && snapshot.unlabeledFormControlCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    "FORM_LABEL_RISK",
                    "Mulig UU-risiko i skjema",
                    snapshot.unlabeledFormControlCount() + " av " + snapshot.formControlCount() + " skjemafelt ser ut til å mangle tydelig label eller aria-label.",
                    "MEDIUM"
            ));
        }
        if (snapshot.emptyButtonCount() > 0) {
            signals.add(new WebsiteQualitySignal(
                    "EMPTY_BUTTON_RISK",
                    "Mulig UU-risiko på knapper",
                    "Minst én knapp eller knappelenke ser ut til å mangle synlig tekst eller aria-label.",
                    "MEDIUM"
            ));
        }
    }

    private void addSecuritySignals(List<WebsiteQualitySignal> signals, String website, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        if (!website.startsWith(HTTPS_PREFIX)) {
            signals.add(new WebsiteQualitySignal(
                    "MISSING_HTTPS",
                    "Mangler HTTPS",
                    "Siden bruker ikke sikker HTTPS-forbindelse. Dette kan gi dårligere tillit og varsler i nettleseren.",
                    "HIGH"
            ));
            return;
        }
        if (snapshot.mixedContentSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "MIXED_CONTENT_RISK",
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
    }

    private void addPrivacySignals(List<WebsiteQualitySignal> signals, WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        String text = normalizeForWebsiteQuality((snapshot.bodyText() == null ? "" : snapshot.bodyText()) + " " + (snapshot.html() == null ? "" : snapshot.html()));
        boolean hasContactForm = snapshot.formControlCount() > 0 || text.contains("send melding") || text.contains("kontakt oss");
        if (hasContactForm && !snapshot.privacyLink()) {
            signals.add(new WebsiteQualitySignal(
                    "MISSING_PRIVACY_NOTICE",
                    "Mangler synlig personverninfo",
                    "Siden ser ut til å samle inn kontaktdata, men vi fant ingen tydelig personvernlenke eller personverntekst.",
                    "MEDIUM"
            ));
        }
        if (snapshot.cookieOrTrackingSignal() && !snapshot.cookieConsentSignal()) {
            signals.add(new WebsiteQualitySignal(
                    "COOKIE_CONSENT_RISK",
                    "Mulig cookie-/samtykkerisiko",
                    "HTML-en har spor av cookies, analyse eller tracking, men vi fant ikke tydelig samtykkemekanisme. Dette bør sjekkes manuelt.",
                    "MEDIUM"
            ));
        }
        if (hasSensitiveHealthContext(text)) {
            signals.add(new WebsiteQualitySignal(
                    "SENSITIVE_HEALTH_CONTEXT",
                    "Mulig sensitivt fagområde",
                    "Nettsideteksten peker mot helse, journal, pasient eller behandling. Personvern, skjema og databehandling bør vurderes ekstra nøye.",
                    "MEDIUM"
            ));
        }
    }

    private boolean hasSensitiveHealthContext(String text) {
        if (!hasText(text)) {
            return false;
        }
        return SENSITIVE_HEALTH_CONTEXT_WORDS.stream()
                .map(this::normalizeForWebsiteQuality)
                .anyMatch(text::contains);
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
                .replaceAll("[^a-z0-9 ]", " ")
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
        cleaned = cleaned.replaceAll("[^a-z0-9 ]", " ");
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
                .replaceAll("[^a-z0-9 ]", " ");

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
            return website;
        }
        if (website.startsWith("http://") || website.startsWith(HTTPS_PREFIX)) {
            return website;
        }
        return HTTPS_PREFIX + website;
    }

    private String firstReachableCandidate(List<String> candidates) {
        return candidates.stream()
                .filter(websiteReachabilityService::isReachable)
                .findFirst()
                .orElse(null);
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
            evidence.putIfAbsent("Konkurs registrert",
                    new ScoreEvidence("Konkurs registrert", "Åpne registerdata viser konkursrelatert hendelse for virksomheten.", SOURCE_BRREG_ANNOUNCEMENTS));
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
                    "Konkurs registrert",
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
                .replaceAll("^_+|_+$", "");
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
        if (normalized.contains("STYRELEDER")) {
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
