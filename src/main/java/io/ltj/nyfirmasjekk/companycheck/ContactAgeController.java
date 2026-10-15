package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.brreg.BrregClientException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/company-check")
public class ContactAgeController {
    private final ContactAgeService contactAgeService;
    private final InMemoryRateLimitService rateLimitService;
    private final AdminAccessService adminAccessService;

    public ContactAgeController(ContactAgeService contactAgeService, InMemoryRateLimitService rateLimitService,
                                AdminAccessService adminAccessService) {
        this.contactAgeService = contactAgeService;
        this.rateLimitService = rateLimitService;
        this.adminAccessService = adminAccessService;
    }

    @PostMapping("/contact-ages")
    public Map<String, ContactAgeService.ContactAge> contactAges(
            @RequestBody List<String> orgNumbers,
            @RequestHeader(value = "X-Admin-Token", required = false) String adminToken
    ) {
        adminAccessService.requireAdmin(adminToken);
        rateLimitService.requireAllowed("contact-ages", 30, Duration.ofMinutes(10));
        if (orgNumbers == null || orgNumbers.size() > 25 || orgNumbers.stream().anyMatch(number -> number == null || !number.matches("\\d{9}"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Oppgi inntil 25 gyldige organisasjonsnumre.");
        }
        Map<String, ContactAgeService.ContactAge> ages = new LinkedHashMap<>();
        for (String orgNumber : orgNumbers.stream().distinct().toList()) {
            try {
                ContactAgeService.ContactAge age = contactAgeService.ageFor(orgNumber);
                if (age != null) {
                    ages.put(orgNumber, age);
                }
            } catch (BrregClientException exception) {
                // A missing role lookup must not prevent other leads from being shown.
            }
        }
        return ages;
    }
}
