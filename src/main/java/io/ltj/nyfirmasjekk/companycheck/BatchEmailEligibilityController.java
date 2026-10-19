package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.api.v1.CompanyApiV1Mapper;
import io.ltj.nyfirmasjekk.api.v1.WebsiteContentInspectionService;
import io.ltj.nyfirmasjekk.brreg.BrregClient;
import jakarta.validation.constraints.Pattern;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.Locale;
import java.util.Set;

@Validated
@RestController
@RequestMapping("/api/company-check")
public class BatchEmailEligibilityController {
    private static final Set<String> GENERIC_EMAIL_DOMAINS = Set.of(
            "gmail.com", "gmail.no", "outlook.com", "outlook.no", "hotmail.com", "hotmail.no",
            "live.com", "live.no", "icloud.com", "me.com", "online.no", "yahoo.com", "yahoo.no",
            "proton.me", "protonmail.com"
    );

    private final BrregClient brregClient;
    private final CompanyApiV1Mapper mapper;
    private final WebsiteContentInspectionService websiteContentInspectionService;
    private final OutreachLogService outreachLogService;
    private final InMemoryRateLimitService rateLimitService;

    public BatchEmailEligibilityController(BrregClient brregClient, CompanyApiV1Mapper mapper,
                                           WebsiteContentInspectionService websiteContentInspectionService,
                                           OutreachLogService outreachLogService,
                                           InMemoryRateLimitService rateLimitService) {
        this.brregClient = brregClient;
        this.mapper = mapper;
        this.websiteContentInspectionService = websiteContentInspectionService;
        this.outreachLogService = outreachLogService;
        this.rateLimitService = rateLimitService;
    }

    @GetMapping("/{organisasjonsnummer}/batch-eligibility")
    public BatchEmailEligibilityResponse batchEligibility(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String organisasjonsnummer
    ) {
        rateLimitService.requireAllowed("company-batch-eligibility", 240, Duration.ofMinutes(10));
        if (outreachLogService.isSendBlocked(organisasjonsnummer)) {
            return new BatchEmailEligibilityResponse(organisasjonsnummer, false,
                    "Virksomheten har allerede en sendt eller uavklart nettsidehenvendelse.", null);
        }
        var enhet = brregClient.hentEnhet(organisasjonsnummer);
        if (!hasText(enhet.epostadresse())) {
            return new BatchEmailEligibilityResponse(organisasjonsnummer, false, "Mangler e-postadresse.", null);
        }
        if (hasText(enhet.hjemmeside())) {
            var inspection = mapper.inspectWebsite(enhet.hjemmeside());
            boolean unavailable = inspection.websiteQuality().signals().stream()
                    .anyMatch(signal -> "TECHNICAL_FAILURE".equals(signal.code()));
            if (unavailable) {
                return new BatchEmailEligibilityResponse(organisasjonsnummer, true, null, enhet.hjemmeside());
            }
            return new BatchEmailEligibilityResponse(organisasjonsnummer, false,
                    "Registrert nettside svarer: " + enhet.hjemmeside(), enhet.hjemmeside());
        }

        String emailDomain = extractEmailDomain(enhet.epostadresse());
        if (hasText(emailDomain) && !GENERIC_EMAIL_DOMAINS.contains(emailDomain)) {
            String candidate = "https://" + emailDomain;
            var contentMatch = websiteContentInspectionService.inspect(candidate, enhet.navn(), null);
            if (contentMatch.matched()) {
                return new BatchEmailEligibilityResponse(organisasjonsnummer, false,
                        "Nettsiden " + candidate + " har innhold som matcher virksomhetsnavnet.", candidate);
            }
        }
        return new BatchEmailEligibilityResponse(organisasjonsnummer, true, null, null);
    }

    private String extractEmailDomain(String email) {
        if (!hasText(email) || !email.contains("@")) return null;
        return email.substring(email.indexOf('@') + 1).trim().toLowerCase(Locale.ROOT);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
