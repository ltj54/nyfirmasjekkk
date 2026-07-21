package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.api.v1.CompanyApiV1Mapper;
import io.ltj.nyfirmasjekk.api.v1.CompanyDetails;
import io.ltj.nyfirmasjekk.api.v1.CompanyEvent;
import io.ltj.nyfirmasjekk.api.v1.MetadataFiltersResponse;
import io.ltj.nyfirmasjekk.api.v1.MetadataService;
import io.ltj.nyfirmasjekk.api.v1.CompanySearchResponse;
import io.ltj.nyfirmasjekk.api.v1.CompanySummary;
import io.ltj.nyfirmasjekk.api.v1.BrregWebsiteMatch;
import io.ltj.nyfirmasjekk.api.v1.WebsiteInspectionResponse;
import io.ltj.nyfirmasjekk.api.v1.WebsiteContentInspectionService;
import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import io.ltj.nyfirmasjekk.brreg.BrregClient;
import io.ltj.nyfirmasjekk.brreg.BrregClientException;
import io.ltj.nyfirmasjekk.brreg.EnhetFinnesIkkeException;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.StringJoiner;
import java.util.stream.Collectors;

@Validated
@RestController
@RequestMapping("/api/company-check")
public class CompanyCheckController {
    private static final Logger log = LoggerFactory.getLogger(CompanyCheckController.class);
    private static final int SEARCH_RESULT_SIZE = 25;
    private static final int MAX_IMPORT_BYTES = 2_000_000;
    private final CompanyCheckService companyCheckService;
    private final CompanyApiV1Mapper mapper;
    private final BrregClient brregClient;
    private final MetadataService metadataService;
    private final OutreachLogService outreachLogService;
    private final OutreachEmailService outreachEmailService;
    private final AdminAccessService adminAccessService;
    private final InMemoryRateLimitService rateLimitService;
    private final MeterRegistry meterRegistry;
    private final WebsiteContentInspectionService websiteContentInspectionService;

    public CompanyCheckController(
            CompanyCheckService companyCheckService,
            CompanyApiV1Mapper mapper,
            BrregClient brregClient,
            MetadataService metadataService,
            OutreachLogService outreachLogService,
            OutreachEmailService outreachEmailService,
            AdminAccessService adminAccessService,
            InMemoryRateLimitService rateLimitService,
            MeterRegistry meterRegistry,
            WebsiteContentInspectionService websiteContentInspectionService
    ) {
        this.companyCheckService = companyCheckService;
        this.mapper = mapper;
        this.brregClient = brregClient;
        this.metadataService = metadataService;
        this.outreachLogService = outreachLogService;
        this.outreachEmailService = outreachEmailService;
        this.adminAccessService = adminAccessService;
        this.rateLimitService = rateLimitService;
        this.meterRegistry = meterRegistry;
        this.websiteContentInspectionService = websiteContentInspectionService;
    }

    @GetMapping("/{organisasjonsnummer}")
    public CompanyDetails vurder(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String organisasjonsnummer
    ) {
        rateLimitService.requireAllowed("company-details", 120, Duration.ofMinutes(10));
        meterRegistry.counter("company_check_details_requests_total").increment();
        return meterRegistry.timer("company_check_details_timer").record(() -> {
            CompanyCheck check = companyCheckService.vurder(organisasjonsnummer);
            var enhet = brregClient.hentEnhet(organisasjonsnummer);
            var roller = brregClient.hentRoller(organisasjonsnummer);
            return mapper.toDetails(check, enhet, roller, List.of());
        });
    }

    @GetMapping("/{organisasjonsnummer}/events")
    public List<CompanyEvent> hendelser(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String organisasjonsnummer
    ) {
        var enhet = brregClient.hentEnhet(organisasjonsnummer);
        return mapper.toEvents(enhet);
    }

    @GetMapping("/{organisasjonsnummer}/batch-eligibility")
    public BatchEmailEligibilityResponse batchEligibility(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String organisasjonsnummer
    ) {
        rateLimitService.requireAllowed("company-batch-eligibility", 240, Duration.ofMinutes(10));
        if (outreachLogService.isSendBlocked(organisasjonsnummer)) {
            return new BatchEmailEligibilityResponse(
                    organisasjonsnummer,
                    false,
                    "Virksomheten har allerede en sendt eller uavklart nettsidehenvendelse.",
                    null
            );
        }
        var enhet = brregClient.hentEnhet(organisasjonsnummer);
        if (!hasText(enhet.epostadresse())) {
            return new BatchEmailEligibilityResponse(
                    organisasjonsnummer,
                    false,
                    "Mangler e-postadresse.",
                    null
            );
        }
        if (hasText(enhet.hjemmeside())) {
            var inspection = mapper.inspectWebsite(enhet.hjemmeside());
            boolean unavailable = inspection.websiteQuality().signals().stream()
                    .anyMatch(signal -> "TECHNICAL_FAILURE".equals(signal.code()));
            if (unavailable) {
                return new BatchEmailEligibilityResponse(
                        organisasjonsnummer,
                        true,
                        null,
                        enhet.hjemmeside()
                );
            }
            return new BatchEmailEligibilityResponse(
                    organisasjonsnummer,
                    false,
                    "Registrert nettside svarer: " + enhet.hjemmeside(),
                    enhet.hjemmeside()
            );
        }

        String emailDomain = extractEmailDomain(enhet.epostadresse());
        if (hasText(emailDomain) && !isGenericEmailDomain(emailDomain)) {
            String candidate = "https://" + emailDomain;
            var contentMatch = websiteContentInspectionService.inspect(candidate, enhet.navn(), null);
            if (contentMatch.matched()) {
                return new BatchEmailEligibilityResponse(
                        organisasjonsnummer,
                        false,
                        "Nettsiden " + candidate + " har innhold som matcher virksomhetsnavnet.",
                        candidate
                );
            }
        }

        return new BatchEmailEligibilityResponse(organisasjonsnummer, true, null, null);
    }

    @GetMapping("/{organisasjonsnummer}/outreach-status")
    public OutreachStatusResponse outreachStatus(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String organisasjonsnummer,
            @RequestHeader(value = "X-Admin-Token", required = false) String adminToken
    ) {
        adminAccessService.requireAdmin(adminToken);
        return outreachLogService.statusFor(organisasjonsnummer);
    }

    @GetMapping("/outreach")
    public List<OutreachStatusResponse> outreachStatuses(
            @RequestHeader(value = "X-Admin-Token", required = false) String adminToken
    ) {
        adminAccessService.requireAdmin(adminToken);
        return outreachLogService.statuses();
    }

    @GetMapping(value = "/outreach/export", produces = "application/x-ndjson")
    public ResponseEntity<String> exportOutreachLog(
            @RequestHeader(value = "X-Admin-Token", required = false) String adminToken
    ) {
        adminAccessService.requireAdmin(adminToken);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/x-ndjson"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"outreach-log-export.jsonl\"")
                .body(outreachLogService.exportJsonl());
    }

    @PostMapping(value = "/outreach/import", consumes = MediaType.TEXT_PLAIN_VALUE)
    public OutreachImportResponse importOutreachLog(
            @RequestBody String jsonl,
            @RequestHeader(value = "X-Admin-Token", required = false) String adminToken
    ) {
        adminAccessService.requireAdmin(adminToken);
        if (jsonl != null && jsonl.length() > MAX_IMPORT_BYTES) {
            throw new IllegalArgumentException("Importfilen er for stor.");
        }
        return outreachLogService.importJsonl(jsonl);
    }

    @PostMapping("/outreach-statuses")
    public List<OutreachStatusResponse> outreachStatusesFor(
            @RequestBody List<String> orgNumbers,
            @RequestHeader(value = "X-Admin-Token", required = false) String adminToken
    ) {
        adminAccessService.requireAdmin(adminToken);
        if (orgNumbers == null || orgNumbers.isEmpty()) {
            return List.of();
        }
        return orgNumbers.stream()
                .filter(orgNumber -> orgNumber != null && orgNumber.matches("\\d{9}"))
                .distinct()
                .limit(250)
                .map(outreachLogService::statusFor)
                .toList();
    }

    @PostMapping("/{organisasjonsnummer}/outreach-status")
    public OutreachStatusResponse registerOutreachStatus(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String organisasjonsnummer,
            @RequestBody OutreachStatusRequest request,
            @RequestHeader(value = "X-Admin-Token", required = false) String adminToken
    ) {
        adminAccessService.requireAdmin(adminToken);
        if (request == null) {
            throw new IllegalArgumentException("Mangler outreach-status.");
        }
        var payload = new OutreachStatusRequest(
                organisasjonsnummer,
                request.companyName(),
                request.organizationForm(),
                request.sent(),
                request.status(),
                request.price(),
                request.channel(),
                request.offerType(),
                request.note()
        );
        return outreachLogService.register(payload);
    }

    @PostMapping("/{organisasjonsnummer}/send-outreach-email")
    public OutreachEmailSendResponse sendOutreachEmail(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String organisasjonsnummer,
            @RequestBody OutreachEmailSendRequest request,
            @RequestHeader(value = "X-Admin-Token", required = false) String adminToken
    ) {
        adminAccessService.requireAdmin(adminToken);
        outreachEmailService.validate(request);
        requireWebsiteStillUnavailable(organisasjonsnummer, request);
        var outreachRequest = new OutreachStatusRequest(
                organisasjonsnummer,
                request.companyName(),
                request.organizationForm(),
                true,
                "sent",
                request.price(),
                request.channel() == null || request.channel().isBlank() ? "email" : request.channel(),
                request.offerType() == null || request.offerType().isBlank() ? "website-offer" : request.offerType(),
                request.note()
        );
        if (!outreachLogService.reserveSend(outreachRequest)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Virksomheten har allerede en sendt eller uavklart nettsidehenvendelse."
            );
        }

        try {
            String recipient = outreachEmailService.send(request);
            var status = outreachLogService.register(outreachRequest);
            return new OutreachEmailSendResponse(true, recipient, request.subject(), status);
        } catch (RuntimeException exception) {
            outreachLogService.markDeliveryUncertain(
                    outreachRequest,
                    "SMTP-leveringen feilet eller fikk ukjent utfall. Ny utsendelse er sperret for å unngå duplikat."
            );
            throw exception;
        }
    }

    private void requireWebsiteStillUnavailable(String organisasjonsnummer, OutreachEmailSendRequest request) {
        if (!"website-unavailable-offer".equals(request.offerType())) {
            return;
        }

        var enhet = brregClient.hentEnhet(organisasjonsnummer);
        if (!hasText(enhet.hjemmeside())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Utsending stoppet fordi registrert nettside ikke kunne kontrolleres på nytt."
            );
        }

        var inspection = mapper.inspectWebsite(enhet.hjemmeside());
        boolean stillUnavailable = inspection.websiteQuality().signals().stream()
                .anyMatch(signal -> "TECHNICAL_FAILURE".equals(signal.code()));
        if (!stillUnavailable) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Utsending stoppet fordi nettsiden svarte ved kontrollen rett før sending."
            );
        }
    }

    @GetMapping("/filters")
    public MetadataFiltersResponse filters() {
        return metadataService.filters();
    }

    @GetMapping("/website-inspection")
    public WebsiteInspectionResponse inspectWebsite(@RequestParam String url) {
        rateLimitService.requireAllowed("website-inspection", 60, Duration.ofHours(1));
        WebsiteInspectionResponse inspection = mapper.inspectWebsite(url);
        return new WebsiteInspectionResponse(
                inspection.inputUrl(),
                inspection.normalizedUrl(),
                inspection.websiteQuality(),
                findBrregWebsiteMatches(inspection.normalizedUrl())
        );
    }

    @GetMapping("/website-inspection/extended")
    public WebsiteInspectionResponse inspectWebsiteExtended(@RequestParam String url) {
        rateLimitService.requireAllowed("website-inspection-extended", 20, Duration.ofHours(1));
        WebsiteInspectionResponse inspection = mapper.inspectWebsiteExtended(url);
        return new WebsiteInspectionResponse(
                inspection.inputUrl(),
                inspection.normalizedUrl(),
                inspection.websiteQuality(),
                findBrregWebsiteMatches(inspection.normalizedUrl())
        );
    }

    private List<BrregWebsiteMatch> findBrregWebsiteMatches(String normalizedUrl) {
        List<String> homepageVariants = homepageSearchVariants(normalizedUrl);
        if (homepageVariants.isEmpty()) {
            return List.of();
        }

        Map<String, BrregWebsiteMatch> matches = new LinkedHashMap<>();
        for (String homepage : homepageVariants) {
            try {
                EnheterSearchResponsePage page = searchBrregByHomepage(homepage);
                page.enheter().stream()
                        .filter(enhet -> enhet != null && enhet.organisasjonsnummer() != null)
                        .map(enhet -> toBrregWebsiteMatch(enhet, homepage))
                        .forEach(match -> matches.putIfAbsent(match.orgNumber(), match));
            } catch (BrregClientException exception) {
                log.debug("BRREG homepage lookup failed for {}", homepage, exception);
            }
        }
        return matches.values().stream().limit(10).toList();
    }

    private EnheterSearchResponsePage searchBrregByHomepage(String homepage) {
        var response = brregClient.sok(Map.of(
                "hjemmeside", homepage,
                "size", "10",
                "page", "0"
        ));
        var enheter = response != null && response._embedded() != null && response._embedded().enheter() != null
                ? response._embedded().enheter()
                : List.<EnhetResponse>of();
        return new EnheterSearchResponsePage(enheter);
    }

    private List<String> homepageSearchVariants(String normalizedUrl) {
        String host = hostWithoutWww(normalizedUrl);
        if (host == null || host.isBlank()) {
            return List.of();
        }
        List<String> variants = new ArrayList<>();
        variants.add(host);
        variants.add("www." + host);
        variants.add("https://" + host);
        variants.add("https://www." + host);
        return variants;
    }

    private String hostWithoutWww(String url) {
        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            if (host == null || host.isBlank()) {
                return null;
            }
            return host.replaceFirst("(?i)^www\\.", "");
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private BrregWebsiteMatch toBrregWebsiteMatch(EnhetResponse enhet, String matchedHomepage) {
        return new BrregWebsiteMatch(
                enhet.organisasjonsnummer(),
                enhet.navn(),
                enhet.organisasjonsform() == null ? null : enhet.organisasjonsform().kode(),
                enhet.hjemmeside(),
                enhet.epostadresse(),
                enhet.telefon(),
                enhet.mobil(),
                enhet.naeringskode1() == null ? null : enhet.naeringskode1().kode(),
                enhet.naeringskode1() == null ? null : enhet.naeringskode1().beskrivelse(),
                enhet.forretningsadresse() == null ? null : enhet.forretningsadresse().kommune(),
                enhet.forretningsadresse() == null ? null : enhet.forretningsadresse().fylke(),
                enhet.registreringsdatoEnhetsregisteret(),
                "BRREG hjemmeside=" + matchedHomepage
        );
    }

    private record EnheterSearchResponsePage(List<EnhetResponse> enheter) {
    }

    @GetMapping("/nye-as")
    public List<CompanySummary> hentNyeAs(@RequestParam(defaultValue = "10") int dager) {
        return companyCheckService.hentNyeAs(dager).stream()
                .map(check -> mapper.toSummary(check, brregClient.hentEnhet(check.organisasjonsnummer())))
                .toList();
    }

    @GetMapping("/search")
    public CompanySearchResponse sok(
            @RequestParam(required = false) String navn,
            @RequestParam(defaultValue = "0") int dager,
            @RequestParam(required = false) String kommune,
            @RequestParam(required = false) String fylke,
            @RequestParam(required = false) String naeringskode,
            @RequestParam(required = false) String organisasjonsform,
            @RequestParam(required = false) String organizationForm,
            @RequestParam(required = false) String score,
            @RequestParam(defaultValue = "false") boolean hasEmail,
            @RequestParam(defaultValue = "false") boolean hasWebsite,
            @RequestParam(defaultValue = "false") boolean missingWebsite,
            @RequestParam(defaultValue = "0") int page
    ) {
        meterRegistry.counter("company_check_search_requests_total").increment();
        return meterRegistry.timer("company_check_search_timer", "score", score == null ? "ALL" : score).record(() -> {
            long startedAt = System.nanoTime();
            String effectiveOrganisasjonsform = firstNonBlank(organisasjonsform, organizationForm);
            var request = new CompanySearchRequest(
                    navn,
                    dager,
                    kommune,
                    fylke,
                    naeringskode,
                    effectiveOrganisasjonsform,
                    score,
                    SEARCH_RESULT_SIZE,
                    hasEmail,
                    hasWebsite,
                    missingWebsite
            );

            var searchPage = searchVisiblePage(request, page);
            var results = searchPage.items().stream()
                    .map(check -> mapper.toSummary(check, brregClient.hentEnhet(check.organisasjonsnummer())))
                    .toList();
            Map<String, Long> scoreCounts = results.stream()
                    .collect(Collectors.groupingBy(result -> result.scoreColor().name(), Collectors.counting()));

            long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
            log.info("company-check search completed in {} ms: {}", durationMs, buildSearchLogLine(
                    dager,
                    page,
                    score,
                    navn,
                    fylke,
                    effectiveOrganisasjonsform,
                    hasEmail,
                    hasWebsite,
                    missingWebsite,
                    results.size(),
                    searchPage.totalElements(),
                    scoreCounts
            ));
            return mapper.toSearchResponse(results, searchPage.page(), searchPage.size(), searchPage.totalElements(), searchPage.totalPages());
        });
    }

    private CompanySearchPage searchVisiblePage(CompanySearchRequest request, int page) {
        int requestedOffset = Math.max(page, 0) * SEARCH_RESULT_SIZE;
        int visibleBeforePage = 0;
        boolean reachedEnd = false;
        List<CompanyCheck> visibleItems = new ArrayList<>();
        Set<String> seenOrgNumbers = new HashSet<>();

        for (CompanySearchRequest searchRequest : searchRequestsForVisiblePage(request)) {
            int backendPage = 0;
            reachedEnd = false;

            while (visibleItems.size() < SEARCH_RESULT_SIZE) {
                CompanySearchPage backendSearchPage = companyCheckService.sokPage(searchRequest, backendPage);
                List<CompanyCheck> backendItems = backendSearchPage.items();
                if (backendItems.isEmpty()) {
                    reachedEnd = true;
                    break;
                }

                Map<String, OutreachStatusResponse> statusesByOrgNumber = outreachLogService.statusesFor(
                        backendItems.stream().map(CompanyCheck::organisasjonsnummer).toList()
                );
                for (CompanyCheck item : backendItems) {
                    if (!seenOrgNumbers.add(item.organisasjonsnummer())) {
                        continue;
                    }
                    if (isHiddenFromSearch(statusesByOrgNumber.get(item.organisasjonsnummer()))) {
                        continue;
                    }
                    if (visibleBeforePage >= requestedOffset && visibleItems.size() < SEARCH_RESULT_SIZE) {
                        visibleItems.add(item);
                    }
                    visibleBeforePage += 1;
                }

                if (backendPage + 1 >= backendSearchPage.totalPages()) {
                    reachedEnd = true;
                    break;
                }
                backendPage += 1;
            }

            if (visibleItems.size() >= SEARCH_RESULT_SIZE) {
                break;
            }
        }

        long totalElements = !reachedEnd && visibleItems.size() == SEARCH_RESULT_SIZE
                ? (long) requestedOffset + visibleItems.size() + 1
                : visibleBeforePage;
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / SEARCH_RESULT_SIZE);
        return new CompanySearchPage(visibleItems, Math.max(page, 0), SEARCH_RESULT_SIZE, totalElements, totalPages);
    }

    private boolean isHiddenFromSearch(OutreachStatusResponse status) {
        return status != null && (status.sent() || "not_relevant".equalsIgnoreCase(status.status()));
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

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private List<CompanySearchRequest> searchRequestsForVisiblePage(CompanySearchRequest request) {
        if (!shouldUseLeadFirstSearch(request)) {
            return List.of(request);
        }

        return List.of(
                withLeadContactFilters(request, true),
                withLeadContactFilters(request, false),
                request
        );
    }

    private boolean shouldUseLeadFirstSearch(CompanySearchRequest request) {
        return firstNonBlank(
                request.navn(),
                request.kommune(),
                request.fylke(),
                request.naeringskode(),
                request.organisasjonsform()
        ) == null
                && !request.hasEmail()
                && !request.hasWebsite()
                && !request.missingWebsite()
                && !"RED".equalsIgnoreCase(request.score());
    }

    private CompanySearchRequest withLeadContactFilters(CompanySearchRequest request, boolean missingWebsite) {
        return new CompanySearchRequest(
                request.navn(),
                request.dager(),
                request.kommune(),
                request.fylke(),
                request.naeringskode(),
                request.organisasjonsform(),
                request.score(),
                request.resultSize(),
                true,
                false,
                missingWebsite
        );
    }

    private String buildSearchLogLine(
            int dager,
            int page,
            String score,
            String navn,
            String fylke,
            String organisasjonsform,
            boolean hasEmail,
            boolean hasWebsite,
            boolean missingWebsite,
            int results,
            long totalElements,
            Map<String, Long> scoreCounts
    ) {
        var joiner = new StringJoiner(", ");
        joiner.add("dager=" + dager);
        joiner.add("page=" + page);
        if (score != null && !score.isBlank()) {
            joiner.add("score=" + score);
        }
        if (navn != null && !navn.isBlank()) {
            joiner.add("navn=" + navn);
        }
        if (fylke != null && !fylke.isBlank()) {
            joiner.add("fylke=" + fylke);
        }
        if (organisasjonsform != null && !organisasjonsform.isBlank()) {
            joiner.add("organisasjonsform=" + organisasjonsform);
        }
        if (hasEmail) {
            joiner.add("hasEmail=true");
        }
        if (hasWebsite) {
            joiner.add("hasWebsite=true");
        }
        if (missingWebsite) {
            joiner.add("missingWebsite=true");
        }
        joiner.add("results=" + results);
        joiner.add("totalElements=" + totalElements);
        joiner.add("scoreCounts=" + scoreCounts);
        return joiner.toString();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    @ExceptionHandler(ConstraintViolationException.class)
    @SuppressWarnings("unused")
    public ProblemDetail handleConstraintViolation(ConstraintViolationException exception) {
        var detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
        detail.setTitle("Ugyldig forespørsel");
        return detail;
    }

    @ExceptionHandler(EnhetFinnesIkkeException.class)
    @SuppressWarnings("unused")
    public ProblemDetail handleNotFound(EnhetFinnesIkkeException exception) {
        var detail = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, exception.getMessage());
        detail.setTitle("Virksomhet ikke funnet");
        return detail;
    }

    @ExceptionHandler(BrregClientException.class)
    @SuppressWarnings("unused")
    public ProblemDetail handleBrregFailure(BrregClientException exception) {
        var detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_GATEWAY, exception.getMessage());
        detail.setTitle("Feil mot BRREG");
        return detail;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @SuppressWarnings("unused")
    public ProblemDetail handleIllegalArgument(IllegalArgumentException exception) {
        var detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
        detail.setTitle("Ugyldig forespørsel");
        return detail;
    }

    @ExceptionHandler(IllegalStateException.class)
    @SuppressWarnings("unused")
    public ProblemDetail handleIllegalState(IllegalStateException exception) {
        var detail = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, exception.getMessage());
        detail.setTitle("Klarte ikke lagre utsendelsesstatus");
        return detail;
    }
}
