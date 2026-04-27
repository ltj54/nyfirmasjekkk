package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.api.v1.CompanyApiV1Mapper;
import io.ltj.nyfirmasjekk.api.v1.CompanyDetails;
import io.ltj.nyfirmasjekk.api.v1.CompanyEvent;
import io.ltj.nyfirmasjekk.api.v1.MetadataFiltersResponse;
import io.ltj.nyfirmasjekk.api.v1.MetadataService;
import io.ltj.nyfirmasjekk.api.v1.CompanySearchResponse;
import io.ltj.nyfirmasjekk.api.v1.CompanySummary;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.StringJoiner;
import java.util.stream.Collectors;

@Validated
@RestController
@RequestMapping("/api/company-check")
public class CompanyCheckController {
    private static final Logger log = LoggerFactory.getLogger(CompanyCheckController.class);

    private final CompanyCheckService companyCheckService;
    private final CompanyApiV1Mapper mapper;
    private final BrregClient brregClient;
    private final MetadataService metadataService;
    private final OutreachLogService outreachLogService;
    private final MeterRegistry meterRegistry;

    public CompanyCheckController(
            CompanyCheckService companyCheckService,
            CompanyApiV1Mapper mapper,
            BrregClient brregClient,
            MetadataService metadataService,
            OutreachLogService outreachLogService,
            MeterRegistry meterRegistry
    ) {
        this.companyCheckService = companyCheckService;
        this.mapper = mapper;
        this.brregClient = brregClient;
        this.metadataService = metadataService;
        this.outreachLogService = outreachLogService;
        this.meterRegistry = meterRegistry;
    }

    @GetMapping("/{organisasjonsnummer}")
    public CompanyDetails vurder(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String organisasjonsnummer
    ) {
        meterRegistry.counter("company_check_details_requests_total").increment();
        return meterRegistry.timer("company_check_details_timer", "org", organisasjonsnummer).record(() -> {
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

    @GetMapping("/{organisasjonsnummer}/outreach-status")
    public OutreachStatusResponse outreachStatus(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String organisasjonsnummer
    ) {
        return outreachLogService.statusFor(organisasjonsnummer);
    }

    @GetMapping("/outreach")
    public List<OutreachStatusResponse> outreachStatuses() {
        return outreachLogService.statuses();
    }

    @GetMapping(value = "/outreach/export", produces = "application/x-ndjson")
    public ResponseEntity<String> exportOutreachLog() {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/x-ndjson"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"outreach-log-export.jsonl\"")
                .body(outreachLogService.exportJsonl());
    }

    @PostMapping(value = "/outreach/import", consumes = MediaType.TEXT_PLAIN_VALUE)
    public OutreachImportResponse importOutreachLog(@RequestBody String jsonl) {
        return outreachLogService.importJsonl(jsonl);
    }

    @PostMapping("/outreach-statuses")
    public List<OutreachStatusResponse> outreachStatusesFor(@RequestBody List<String> orgNumbers) {
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
            @RequestBody OutreachStatusRequest request
    ) {
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

    @GetMapping("/filters")
    public MetadataFiltersResponse filters() {
        return metadataService.filters();
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
            @RequestParam(required = false) String score,
            @RequestParam(defaultValue = "0") int page
    ) {
        meterRegistry.counter("company_check_search_requests_total").increment();
        return meterRegistry.timer("company_check_search_timer", "score", score == null ? "ALL" : score).record(() -> {
            long startedAt = System.nanoTime();
            var request = new CompanySearchRequest(
                    navn,
                    dager,
                    kommune,
                    fylke,
                    naeringskode,
                    organisasjonsform,
                    score,
                    100
            );

            var searchPage = companyCheckService.sokPage(request, page);
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
                    organisasjonsform,
                    results.size(),
                    searchPage.totalElements(),
                    scoreCounts
            ));
            return mapper.toSearchResponse(results, searchPage.page(), searchPage.size(), searchPage.totalElements(), searchPage.totalPages());
        });
    }

    private String buildSearchLogLine(
            int dager,
            int page,
            String score,
            String navn,
            String fylke,
            String organisasjonsform,
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
        joiner.add("results=" + results);
        joiner.add("totalElements=" + totalElements);
        joiner.add("scoreCounts=" + scoreCounts);
        return joiner.toString();
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
