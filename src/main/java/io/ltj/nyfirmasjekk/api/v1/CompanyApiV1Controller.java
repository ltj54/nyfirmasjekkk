package io.ltj.nyfirmasjekk.api.v1;

import io.ltj.nyfirmasjekk.brreg.BrregClient;
import io.ltj.nyfirmasjekk.brreg.BrregClientException;
import io.ltj.nyfirmasjekk.brreg.EnhetFinnesIkkeException;
import io.ltj.nyfirmasjekk.companycheck.CompanyCheck;
import io.ltj.nyfirmasjekk.companycheck.CompanyCheckService;
import io.ltj.nyfirmasjekk.companycheck.CompanySearchRequest;
import io.ltj.nyfirmasjekk.history.CompanyHistoryService;
import io.ltj.nyfirmasjekk.network.CompanyNetworkService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class CompanyApiV1Controller {

    private final CompanyCheckService companyCheckService;
    private final CompanyApiV1Mapper mapper;
    private final MetadataService metadataService;
    private final BrregClient brregClient;
    private final CompanyHistoryService companyHistoryService;
    private final CompanyNetworkService companyNetworkService;

    public CompanyApiV1Controller(
            CompanyCheckService companyCheckService,
            CompanyApiV1Mapper mapper,
            MetadataService metadataService,
            BrregClient brregClient,
            CompanyHistoryService companyHistoryService,
            CompanyNetworkService companyNetworkService
    ) {
        this.companyCheckService = companyCheckService;
        this.mapper = mapper;
        this.metadataService = metadataService;
        this.brregClient = brregClient;
        this.companyHistoryService = companyHistoryService;
        this.companyNetworkService = companyNetworkService;
    }

    @GetMapping("/companies")
    public CompanySearchResponse companies(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "30") @Min(1) @Max(365) int daysRegisteredMax,
            @RequestParam(required = false) String county,
            @RequestParam(required = false) String municipality,
            @RequestParam(required = false) String organizationForm,
            @RequestParam(required = false) String naceCode,
            @RequestParam(required = false) String score,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "newest") String sort
    ) {
        List<CompanySummary> items = exactOrgNumber(q)
                .map(this::searchByOrgNumber)
                .orElseGet(() -> searchByFilters(q, daysRegisteredMax, county, municipality, organizationForm, naceCode, page, size));

        List<CompanySummary> filtered = items.stream()
                .filter(company -> matchesScore(company, score))
                .sorted(sortComparator(sort))
                .toList();

        return mapper.toSearchResponse(filtered, page, size);
    }

    @GetMapping("/companies/{orgNumber}")
    public CompanyDetails company(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String orgNumber
    ) {
        CompanyCheck check = companyCheckService.vurder(orgNumber);
        companyHistoryService.captureSnapshot(check);
        var enhet = brregClient.hentEnhet(orgNumber);
        var roller = brregClient.hentRoller(orgNumber);
        companyNetworkService.captureRoles(orgNumber, check.navn(), roller);
        return mapper.toDetails(check, enhet, roller);
    }

    @GetMapping("/companies/{orgNumber}/history")
    public List<CompanyHistoryEntry> history(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String orgNumber
    ) {
        return companyHistoryService.historyFor(orgNumber);
    }

    @GetMapping("/companies/{orgNumber}/network")
    public List<NetworkActor> network(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String orgNumber
    ) {
        return companyNetworkService.networkFor(orgNumber);
    }

    @GetMapping("/companies/{orgNumber}/score")
    public CompanyScoreResponse score(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String orgNumber
    ) {
        return mapper.toScore(companyCheckService.vurder(orgNumber));
    }

    @GetMapping("/metadata/filters")
    public MetadataFiltersResponse filters() {
        return metadataService.filters();
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

    private java.util.Optional<String> exactOrgNumber(String q) {
        if (q != null && q.matches("\\d{9}")) {
            return java.util.Optional.of(q);
        }
        return java.util.Optional.empty();
    }

    private List<CompanySummary> searchByOrgNumber(String orgNumber) {
        CompanyCheck check = companyCheckService.vurder(orgNumber);
        companyHistoryService.captureSnapshot(check);
        var enhet = brregClient.hentEnhet(orgNumber);
        companyNetworkService.captureRoles(orgNumber, check.navn(), brregClient.hentRoller(orgNumber));
        return List.of(mapper.toSummary(check, enhet));
    }

    private List<CompanySummary> searchByFilters(
            String q,
            int daysRegisteredMax,
            String county,
            String municipality,
            String organizationForm,
            String naceCode,
            int page,
            int size
    ) {
        int requestedResultSize = Math.min(Math.max((page + 1) * size, size), 100);
        return companyCheckService.sok(new CompanySearchRequest(
                        blankToNull(q),
                        daysRegisteredMax,
                        blankToNull(municipality),
                        blankToNull(county),
                        blankToNull(naceCode),
                        blankToNull(organizationForm),
                        null,
                        requestedResultSize
                )).stream()
                .map(company -> mapper.toSummary(company, brregClient.hentEnhet(company.organisasjonsnummer())))
                .toList();
    }

    private boolean matchesScore(CompanySummary company, String score) {
        return blankToNull(score) == null || company.scoreColor().name().equalsIgnoreCase(score);
    }

    private Comparator<CompanySummary> sortComparator(String sort) {
        if ("name".equalsIgnoreCase(sort)) {
            return Comparator.comparing(CompanySummary::name, String.CASE_INSENSITIVE_ORDER);
        }
        return Comparator.comparing(CompanySummary::registrationDate, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(CompanySummary::name, String.CASE_INSENSITIVE_ORDER);
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
