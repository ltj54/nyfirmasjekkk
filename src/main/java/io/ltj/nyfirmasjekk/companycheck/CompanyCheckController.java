package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.announcements.AnnouncementService;
import io.ltj.nyfirmasjekk.api.v1.Announcement;
import io.ltj.nyfirmasjekk.api.v1.CompanyApiV1Mapper;
import io.ltj.nyfirmasjekk.api.v1.CompanyDetails;
import io.ltj.nyfirmasjekk.api.v1.CompanyHistoryEntry;
import io.ltj.nyfirmasjekk.api.v1.MetadataFiltersResponse;
import io.ltj.nyfirmasjekk.api.v1.MetadataService;
import io.ltj.nyfirmasjekk.api.v1.NetworkActor;
import io.ltj.nyfirmasjekk.api.v1.CompanySearchResponse;
import io.ltj.nyfirmasjekk.api.v1.CompanySummary;
import io.ltj.nyfirmasjekk.brreg.BrregClient;
import io.ltj.nyfirmasjekk.brreg.BrregClientException;
import io.ltj.nyfirmasjekk.brreg.EnhetFinnesIkkeException;
import io.ltj.nyfirmasjekk.history.CompanyHistoryService;
import io.ltj.nyfirmasjekk.network.CompanyNetworkService;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Validated
@RestController
@RequestMapping("/api/company-check")
public class CompanyCheckController {
    private static final Logger log = LoggerFactory.getLogger(CompanyCheckController.class);

    private final CompanyCheckService companyCheckService;
    private final CompanyApiV1Mapper mapper;
    private final BrregClient brregClient;
    private final AnnouncementService announcementService;
    private final CompanyHistoryService companyHistoryService;
    private final CompanyNetworkService companyNetworkService;
    private final MetadataService metadataService;
    private final MeterRegistry meterRegistry;

    public CompanyCheckController(
            CompanyCheckService companyCheckService,
            CompanyApiV1Mapper mapper,
            BrregClient brregClient,
            AnnouncementService announcementService,
            CompanyHistoryService companyHistoryService,
            CompanyNetworkService companyNetworkService,
            MetadataService metadataService,
            MeterRegistry meterRegistry
    ) {
        this.companyCheckService = companyCheckService;
        this.mapper = mapper;
        this.brregClient = brregClient;
        this.announcementService = announcementService;
        this.companyHistoryService = companyHistoryService;
        this.companyNetworkService = companyNetworkService;
        this.metadataService = metadataService;
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
            companyHistoryService.captureSnapshot(check);
            var enhet = brregClient.hentEnhet(organisasjonsnummer);
            var roller = brregClient.hentRoller(organisasjonsnummer);
            companyNetworkService.captureRoles(organisasjonsnummer, check.navn(), check.status(), roller);
            return mapper.toDetails(check, enhet, roller);
        });
    }

    @GetMapping("/{organisasjonsnummer}/history")
    public List<CompanyHistoryEntry> history(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String organisasjonsnummer
    ) {
        return companyHistoryService.historyFor(organisasjonsnummer);
    }

    @GetMapping("/{organisasjonsnummer}/network")
    public List<NetworkActor> network(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String organisasjonsnummer
    ) {
        return companyNetworkService.networkFor(organisasjonsnummer);
    }

    @GetMapping("/{organisasjonsnummer}/events")
    public List<Announcement> hendelser(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String organisasjonsnummer
    ) {
        var enhet = brregClient.hentEnhet(organisasjonsnummer);
        return announcementService.announcementsFor(enhet);
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
            @RequestParam(defaultValue = "true") boolean utenNettside,
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
                    100,
                    utenNettside
            );

            var results = companyCheckService.sok(request, page).stream()
                    .map(check -> mapper.toSummary(check, brregClient.hentEnhet(check.organisasjonsnummer())))
                    .toList();
            Map<String, Long> scoreCounts = results.stream()
                    .collect(Collectors.groupingBy(result -> result.scoreColor().name(), Collectors.counting()));

            long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
            log.info(
                    "company-check search completed in {} ms: score={}, dager={}, page={}, navn={}, fylke={}, organisasjonsform={}, utenNettside={}, results={}, scoreCounts={}",
                    durationMs,
                    score == null ? "ALL" : score,
                    dager,
                    page,
                    navn == null || navn.isBlank() ? "-" : navn,
                    fylke == null || fylke.isBlank() ? "-" : fylke,
                    organisasjonsform == null || organisasjonsform.isBlank() ? "-" : organisasjonsform,
                    utenNettside,
                    results.size(),
                    scoreCounts
            );
            return mapper.toSearchResponse(results, page, 100);
        });
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ProblemDetail handleConstraintViolation(ConstraintViolationException exception) {
        var detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
        detail.setTitle("Ugyldig forespørsel");
        return detail;
    }

    @ExceptionHandler(EnhetFinnesIkkeException.class)
    ProblemDetail handleNotFound(EnhetFinnesIkkeException exception) {
        var detail = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, exception.getMessage());
        detail.setTitle("Virksomhet ikke funnet");
        return detail;
    }

    @ExceptionHandler(BrregClientException.class)
    ProblemDetail handleBrregFailure(BrregClientException exception) {
        var detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_GATEWAY, exception.getMessage());
        detail.setTitle("Feil mot BRREG");
        return detail;
    }
}
