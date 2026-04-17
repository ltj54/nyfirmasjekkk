package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.api.v1.CompanyApiV1Mapper;
import io.ltj.nyfirmasjekk.api.v1.CompanyDetails;
import io.ltj.nyfirmasjekk.api.v1.CompanySummary;
import io.ltj.nyfirmasjekk.brreg.BrregClient;
import io.ltj.nyfirmasjekk.brreg.BrregClientException;
import io.ltj.nyfirmasjekk.brreg.EnhetFinnesIkkeException;
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

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/company-check")
public class CompanyCheckController {

    private final CompanyCheckService companyCheckService;
    private final CompanyApiV1Mapper mapper;
    private final BrregClient brregClient;

    public CompanyCheckController(CompanyCheckService companyCheckService, CompanyApiV1Mapper mapper, BrregClient brregClient) {
        this.companyCheckService = companyCheckService;
        this.mapper = mapper;
        this.brregClient = brregClient;
    }

    @GetMapping("/{organisasjonsnummer}")
    public CompanyDetails vurder(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String organisasjonsnummer
    ) {
        CompanyCheck check = companyCheckService.vurder(organisasjonsnummer);
        var enhet = brregClient.hentEnhet(organisasjonsnummer);
        var roller = brregClient.hentRoller(organisasjonsnummer);
        return mapper.toDetails(check, enhet, roller);
    }

    @GetMapping("/nye-as")
    public List<CompanySummary> hentNyeAs(@RequestParam(defaultValue = "30") int dager) {
        return companyCheckService.hentNyeAs(dager).stream()
                .map(check -> mapper.toSummary(check, brregClient.hentEnhet(check.organisasjonsnummer())))
                .toList();
    }

    @GetMapping("/search")
    public List<CompanySummary> sok(
            @RequestParam(required = false) String navn,
            @RequestParam(defaultValue = "30") int dager,
            @RequestParam(required = false) String kommune,
            @RequestParam(required = false) String fylke,
            @RequestParam(required = false) String naeringskode,
            @RequestParam(required = false) String organisasjonsform,
            @RequestParam(required = false) String score,
            @RequestParam(defaultValue = "0") int page
    ) {
        return companyCheckService.sok(new CompanySearchRequest(
                navn,
                dager,
                kommune,
                fylke,
                naeringskode,
                organisasjonsform,
                score,
                100
        ), page).stream()
                .map(check -> mapper.toSummary(check, brregClient.hentEnhet(check.organisasjonsnummer())))
                .toList();
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
