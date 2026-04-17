package io.ltj.nyfirmasjekk.api.v1;

import io.ltj.nyfirmasjekk.announcements.AnnouncementService;
import io.ltj.nyfirmasjekk.brreg.BrregClient;
import jakarta.validation.constraints.Pattern;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/companies")
public class CompanyEventsController {

    private final BrregClient brregClient;
    private final AnnouncementService announcementService;

    public CompanyEventsController(BrregClient brregClient, AnnouncementService announcementService) {
        this.brregClient = brregClient;
        this.announcementService = announcementService;
    }

    @GetMapping("/{orgNumber}/events")
    public List<Announcement> events(
            @PathVariable
            @Pattern(regexp = "\\d{9}", message = "Organisasjonsnummer må være ni siffer")
            String orgNumber
    ) {
        return announcementService.announcementsFor(brregClient.hentEnhet(orgNumber));
    }
}
