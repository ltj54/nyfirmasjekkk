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
