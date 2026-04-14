package io.ltj.nyfirmasjekk.companycheck;

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

    public CompanyCheckController(CompanyCheckService companyCheckService) {
        this.companyCheckService = companyCheckService;
    }

    @GetMapping("/{organisasjonsnummer}")
    public CompanyCheck vurder(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String organisasjonsnummer
    ) {
        return companyCheckService.vurder(organisasjonsnummer);
    }

    @GetMapping("/nye-as")
    public List<CompanyCheck> hentNyeAs(@RequestParam(defaultValue = "30") int dager) {
        return companyCheckService.hentNyeAs(dager);
    }

    @GetMapping("/search")
    public List<CompanyCheck> sok(
            @RequestParam(required = false) String navn,
            @RequestParam(defaultValue = "30") int dager,
            @RequestParam(required = false) String kommune,
            @RequestParam(required = false) String fylke,
            @RequestParam(required = false) String naeringskode,
            @RequestParam(required = false) String organisasjonsform
    ) {
        return companyCheckService.sok(new CompanySearchRequest(
                navn,
                dager,
                kommune,
                fylke,
                naeringskode,
                organisasjonsform,
                25
        ));
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
