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
import java.time.LocalDate;
import java.time.ZoneId;
import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.StringJoiner;
import java.util.UUID;
import java.util.stream.Collectors;

@Validated
@RestController
@RequestMapping("/api/company-check")
public class CompanyCheckController {
    private static final Logger log = LoggerFactory.getLogger(CompanyCheckController.class);
    private static final String WEBSITE_LEAD_BATCH_OFFER_TYPE = "website-lead-batch";
    private static final int SEARCH_RESULT_SIZE = 25;
    private static final int WEBSITE_LEAD_RANKING_SIZE = 500;
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
    private final WebsiteAvailabilityService websiteAvailabilityService;
    private final WebsiteLeadBatchLogService websiteLeadBatchLogService;

    public CompanyCheckController(
            CompanyCheckService companyCheckService,
            CompanyApiV1Mapper mapper,
            BrregClient brregClient,
            MetadataService metadataService,
            OutreachLogService outreachLogService,
            OutreachEmailService outreachEmailService,
            CompanyCheckControllerInfrastructure infrastructure
    ) {
        this.companyCheckService = companyCheckService;
        this.mapper = mapper;
        this.brregClient = brregClient;
        this.metadataService = metadataService;
        this.outreachLogService = outreachLogService;
        this.outreachEmailService = outreachEmailService;
        this.adminAccessService = infrastructure.adminAccessService();
        this.rateLimitService = infrastructure.rateLimitService();
        this.meterRegistry = infrastructure.meterRegistry();
        this.websiteAvailabilityService = infrastructure.websiteAvailabilityService();
        this.websiteLeadBatchLogService = infrastructure.websiteLeadBatchLogService();
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

    @GetMapping("/{organisasjonsnummer}/website-availability")
    public WebsiteAvailabilityResponse websiteAvailability(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String organisasjonsnummer
    ) {
        rateLimitService.requireAllowed("website-availability", 1_200, Duration.ofMinutes(10));
        return websiteAvailabilityService.check(organisasjonsnummer);
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

    @GetMapping(value = "/website-lead-batch-log/export", produces = "application/x-ndjson")
    public ResponseEntity<String> exportWebsiteLeadBatchLog(
            @RequestHeader(value = "X-Admin-Token", required = false) String adminToken
    ) {
        adminAccessService.requireAdmin(adminToken);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/x-ndjson"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"website-lead-batch-log.jsonl\"")
                .body(websiteLeadBatchLogService.exportJsonl());
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
        requireOutreachSendEligible(organisasjonsnummer, request);
        var outreachRequest = createOutreachRequest(organisasjonsnummer, request);
        reserveOutreachSend(outreachRequest);
        return deliverOutreachEmail(organisasjonsnummer, request, outreachRequest);
    }

    private void requireOutreachSendEligible(String organisasjonsnummer, OutreachEmailSendRequest request) {
        if ("website-unavailable-offer".equals(request.offerType())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Utilgjengelige nettsider krever et individuelt, manuelt kontrollert utkast; automatisk utsending er sperret."
            );
        }
        if (WEBSITE_LEAD_BATCH_OFFER_TYPE.equals(request.offerType())) {
            requireWebsiteLeadBatchEligible(organisasjonsnummer, request);
        }
        if (outreachLogService.isWebsiteClient(organisasjonsnummer)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Virksomheten er nettsidekunde og kan aldri motta automatisk salgs-e-post."
            );
        }
    }

    private OutreachStatusRequest createOutreachRequest(String organisasjonsnummer, OutreachEmailSendRequest request) {
        return new OutreachStatusRequest(
                organisasjonsnummer,
                request.companyName(),
                request.organizationForm(),
                true,
                "sent",
                request.price(),
                request.channel() == null || request.channel().isBlank() ? "email" : request.channel(),
                request.offerType() == null || request.offerType().isBlank() ? "website-offer" : request.offerType(),
                WEBSITE_LEAD_BATCH_OFFER_TYPE.equals(request.offerType()) ? "Nettsidelead-batch " + request.batchId() : request.note()
        );
    }

    private void reserveOutreachSend(OutreachStatusRequest outreachRequest) {
        boolean followUp = "website-follow-up".equals(outreachRequest.offerType());
        boolean reserved = followUp
                ? outreachLogService.reserveFollowUp(outreachRequest)
                : outreachLogService.reserveSend(outreachRequest);
        if (!reserved) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.CONFLICT,
                    followUp
                            ? "Oppfølging kan bare sendes 4–14 arbeidsdager etter førstegangshenvendelsen, og bare én gang."
                            : "Virksomheten har allerede en sendt eller uavklart nettsidehenvendelse."
            );
        }
    }

    private OutreachEmailSendResponse deliverOutreachEmail(String organisasjonsnummer,
                                                           OutreachEmailSendRequest request,
                                                           OutreachStatusRequest outreachRequest) {
        try {
            appendWebsiteLeadBatchEventIfNeeded(organisasjonsnummer, request, request.to(), "sending", null);
            String recipient = outreachEmailService.send(request);
            appendWebsiteLeadBatchEventIfNeeded(organisasjonsnummer, request, recipient, "sent", null);
            var status = outreachLogService.register(outreachRequest);
            return new OutreachEmailSendResponse(true, recipient, request.subject(), status);
        } catch (RuntimeException exception) {
            outreachLogService.markDeliveryUncertain(
                    outreachRequest,
                    "SMTP-leveringen feilet eller fikk ukjent utfall. Ny utsendelse er sperret for å unngå duplikat."
            );
            appendFailedWebsiteLeadBatchEvent(organisasjonsnummer, request, exception);
            throw exception;
        }
    }

    private void appendWebsiteLeadBatchEventIfNeeded(String organisasjonsnummer, OutreachEmailSendRequest request,
                                                      String recipient, String status, String note) {
        if (WEBSITE_LEAD_BATCH_OFFER_TYPE.equals(request.offerType())) {
            websiteLeadBatchLogService.appendBatchEvent(request.batchId(), organisasjonsnummer, request.companyName(),
                    recipient, request.subject(), status, note);
        }
    }

    private void appendFailedWebsiteLeadBatchEvent(String organisasjonsnummer, OutreachEmailSendRequest request,
                                                   RuntimeException exception) {
        if (!WEBSITE_LEAD_BATCH_OFFER_TYPE.equals(request.offerType())) {
            return;
        }
        try {
            appendWebsiteLeadBatchEventIfNeeded(organisasjonsnummer, request, request.to(),
                    "delivery_uncertain", exception.getMessage());
        } catch (RuntimeException logException) {
            log.error("Klarte ikke skrive nettsidelead-batchlogg for {}", organisasjonsnummer, logException);
        }
    }

    private void requireWebsiteLeadBatchEligible(String orgNumber, OutreachEmailSendRequest request) {
        requireValidWebsiteLeadBatchDraft(request);
        EnhetResponse company = brregClient.hentEnhet(orgNumber);
        if (!isEligibleWebsiteLeadCompany(orgNumber, company, request)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.CONFLICT,
                    "Virksomheten oppfyller ikke kravene for nettsidelead-batch.");
        }
        WebsiteAvailabilityResponse availability = websiteAvailabilityService.check(orgNumber);
        if (!"CONFIRMED_UNREACHABLE".equals(availability.status())
                || !"CANDIDATE".equals(availability.leadSuitability())
                || !websiteAvailabilityService.stillUnreachableNow(company.hjemmeside())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.CONFLICT,
                    "Nettsiden er ikke bekreftet utilgjengelig ved to adskilte sjekker og en ny kontroll før utsending.");
        }
    }

    private void requireValidWebsiteLeadBatchDraft(OutreachEmailSendRequest request) {
        try {
            UUID.fromString(request.batchId());
        } catch (RuntimeException exception) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Ugyldig batch-ID.");
        }
        if (request.body().contains("[Fyll inn") || request.body().contains("[Skriv én konkret observasjon")) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Uferdig e-postutkast kan ikke sendes.");
        }
    }

    private boolean isEligibleWebsiteLeadCompany(String orgNumber, EnhetResponse company,
                                                 OutreachEmailSendRequest request) {
        LocalDate registrationDate = company.registreringsdatoEnhetsregisteret();
        LocalDate today = LocalDate.now(ZoneId.of("Europe/Oslo"));
        boolean inCohort = registrationDate != null
                && !registrationDate.isBefore(today.minusMonths(12))
                && !registrationDate.isAfter(today.minusMonths(6));
        boolean hasValidWebsite = WebsiteLeadUrlPolicy.isPlausibleBusinessWebsite(company.hjemmeside());
        boolean hasMatchingEmail = company.epostadresse() != null
                && company.epostadresse().trim().equalsIgnoreCase(request.to().trim());
        boolean notForeign = company.organisasjonsform() == null
                || !"UTLA".equalsIgnoreCase(company.organisasjonsform().kode());
        String outreachStatus = outreachLogService.statusFor(orgNumber).status();
        return inCohort && hasValidWebsite && hasMatchingEmail && notForeign
                && !"not_relevant".equals(outreachStatus) && !"batch_excluded".equals(outreachStatus);
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
                findBrregWebsiteMatches(inspection.normalizedUrl()),
                inspection.coverage()
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
                findBrregWebsiteMatches(inspection.normalizedUrl()),
                inspection.coverage()
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
            @RequestParam(defaultValue = "false") boolean websiteLeadCohort,
            @RequestParam(defaultValue = "false") boolean websiteLeadRanking,
            @RequestParam(defaultValue = "7") int websiteLeadOldestMonths,
            @RequestParam(defaultValue = "0") int page
    ) {
        meterRegistry.counter("company_check_search_requests_total").increment();
        return meterRegistry.timer("company_check_search_timer", "score", score == null ? "ALL" : score).record(() -> {
            long startedAt = System.nanoTime();
            String effectiveOrganisasjonsform = firstNonBlank(organisasjonsform, organizationForm);
            int resultSize = websiteLeadCohort && websiteLeadRanking ? WEBSITE_LEAD_RANKING_SIZE : SEARCH_RESULT_SIZE;
            var request = new CompanySearchRequest(
                    navn,
                    dager,
                    kommune,
                    fylke,
                    naeringskode,
                    effectiveOrganisasjonsform,
                    score,
                    resultSize,
                    hasEmail,
                    hasWebsite,
                    missingWebsite,
                    websiteLeadCohort,
                    websiteLeadOldestMonths == 12 ? 12 : 7
            );

            var searchPage = searchVisiblePage(request, page);
            var results = searchPage.items().stream()
                    .map(check -> mapper.toSummary(check, brregClient.hentEnhet(check.organisasjonsnummer())))
                    .toList();
            Map<String, Long> scoreCounts = results.stream()
                    .collect(Collectors.groupingBy(result -> result.scoreColor().name(), Collectors.counting()));

            long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
            var searchLogData = new SearchLogData(
                    dager, page, score, navn, fylke, effectiveOrganisasjonsform,
                    hasEmail, hasWebsite, missingWebsite, results.size(), searchPage.totalElements(), scoreCounts
            );
            log.info("company-check search completed in {} ms: {}", durationMs, buildSearchLogLine(searchLogData));
            return mapper.toSearchResponse(results, searchPage.page(), searchPage.size(), searchPage.totalElements(), searchPage.totalPages());
        });
    }

    private CompanySearchPage searchVisiblePage(CompanySearchRequest request, int page) {
        int resultSize = request.resultSize();
        int requestedOffset = Math.max(page, 0) * resultSize;
        int visibleBeforePage = 0;
        boolean reachedEnd = false;
        List<CompanyCheck> visibleItems = new ArrayList<>();
        Set<String> seenOrgNumbers = new HashSet<>();

        for (CompanySearchRequest searchRequest : searchRequestsForVisiblePage(request)) {
            int backendPage = 0;
            reachedEnd = false;
            boolean hasMoreBackendPages = true;

            while (visibleItems.size() < resultSize && hasMoreBackendPages) {
                CompanySearchPage backendSearchPage = companyCheckService.sokPage(searchRequest, backendPage);
                List<CompanyCheck> backendItems = backendSearchPage.items();
                if (backendItems.isEmpty()) {
                    reachedEnd = true;
                    hasMoreBackendPages = false;
                } else {
                    Map<String, OutreachStatusResponse> statusesByOrgNumber = outreachLogService.statusesFor(
                            backendItems.stream().map(CompanyCheck::organisasjonsnummer).toList()
                    );
                    visibleBeforePage = collectVisibleItems(
                            backendItems,
                            statusesByOrgNumber,
                            seenOrgNumbers,
                            visibleItems,
                            new VisiblePageContext(requestedOffset, visibleBeforePage, resultSize, request.websiteLeadCohort())
                    );
                    hasMoreBackendPages = backendPage + 1 < backendSearchPage.totalPages();
                    reachedEnd = !hasMoreBackendPages;
                    backendPage += 1;
                }
            }

            if (visibleItems.size() >= resultSize) {
                break;
            }
        }

        long totalElements = !reachedEnd && visibleItems.size() == resultSize
                ? (long) requestedOffset + visibleItems.size() + 1
                : visibleBeforePage;
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / resultSize);
        return new CompanySearchPage(visibleItems, Math.max(page, 0), resultSize, totalElements, totalPages);
    }

    private int collectVisibleItems(
            List<CompanyCheck> backendItems,
            Map<String, OutreachStatusResponse> statusesByOrgNumber,
            Set<String> seenOrgNumbers,
            List<CompanyCheck> visibleItems,
            VisiblePageContext context
    ) {
        int visibleCount = context.visibleBeforePage();
        for (CompanyCheck item : backendItems) {
            boolean isNewItem = seenOrgNumbers.add(item.organisasjonsnummer());
            OutreachStatusResponse status = statusesByOrgNumber.get(item.organisasjonsnummer());
            boolean isVisible = isNewItem && !isHiddenFromSearch(status)
                    && (!context.websiteLeadCohort() || status == null || !status.everSent());
            if (isVisible) {
                if (visibleCount >= context.requestedOffset() && visibleItems.size() < context.resultSize()) {
                    visibleItems.add(item);
                }
                visibleCount += 1;
            }
        }
        return visibleCount;
    }

    private record VisiblePageContext(int requestedOffset, int visibleBeforePage, int resultSize,
                                      boolean websiteLeadCohort) {
    }

    private boolean isHiddenFromSearch(OutreachStatusResponse status) {
        return status != null && (status.sent()
                || "replied".equalsIgnoreCase(status.status())
                || "auto_replied".equalsIgnoreCase(status.status())
                || "delivery_failed".equalsIgnoreCase(status.status())
                || "not_relevant".equalsIgnoreCase(status.status())
                || outreachLogService.isWebsiteClient(status.orgNumber()));
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
                && !request.websiteLeadCohort()
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
                missingWebsite,
                request.websiteLeadCohort(),
                request.websiteLeadOldestMonths()
        );
    }

    private String buildSearchLogLine(SearchLogData data) {
        var joiner = new StringJoiner(", ");
        joiner.add("dager=" + data.dager());
        joiner.add("page=" + data.page());
        if (hasText(data.score())) {
            joiner.add("score=" + data.score());
        }
        if (hasText(data.navn())) {
            joiner.add("navn=" + data.navn());
        }
        if (hasText(data.fylke())) {
            joiner.add("fylke=" + data.fylke());
        }
        if (hasText(data.organisasjonsform())) {
            joiner.add("organisasjonsform=" + data.organisasjonsform());
        }
        if (data.hasEmail()) {
            joiner.add("hasEmail=true");
        }
        if (data.hasWebsite()) {
            joiner.add("hasWebsite=true");
        }
        if (data.missingWebsite()) {
            joiner.add("missingWebsite=true");
        }
        joiner.add("results=" + data.results());
        joiner.add("totalElements=" + data.totalElements());
        joiner.add("scoreCounts=" + data.scoreCounts());
        return joiner.toString();
    }

    private record SearchLogData(
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
