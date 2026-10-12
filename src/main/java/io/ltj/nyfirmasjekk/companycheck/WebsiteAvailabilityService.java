package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.api.v1.WebsiteProbeResult;
import io.ltj.nyfirmasjekk.api.v1.WebsiteReachabilityService;
import io.ltj.nyfirmasjekk.api.v1.WebsiteContentInspectionService;
import io.ltj.nyfirmasjekk.brreg.BrregClient;
import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class WebsiteAvailabilityService {
    private static final Duration RECHECK_DELAY = Duration.ofSeconds(30);
    private static final Duration RESULT_TTL = Duration.ofMinutes(30);
    private static final String UNVERIFIABLE = "UNVERIFIABLE";
    private static final String PENDING_RECHECK = "PENDING_RECHECK";

    private final BrregClient brregClient;
    private final WebsiteReachabilityService reachabilityService;
    private final WebsiteContentInspectionService contentInspectionService;
    private final Clock clock;
    private final ConcurrentHashMap<String, Observation> observations = new ConcurrentHashMap<>();

    @Autowired
    public WebsiteAvailabilityService(BrregClient brregClient, WebsiteReachabilityService reachabilityService,
                                      WebsiteContentInspectionService contentInspectionService) {
        this(brregClient, reachabilityService, contentInspectionService, Clock.systemDefaultZone());
    }

    WebsiteAvailabilityService(BrregClient brregClient, WebsiteReachabilityService reachabilityService,
                               WebsiteContentInspectionService contentInspectionService, Clock clock) {
        this.brregClient = brregClient;
        this.reachabilityService = reachabilityService;
        this.contentInspectionService = contentInspectionService;
        this.clock = clock;
    }

    public WebsiteAvailabilityResponse check(String orgNumber) {
        EnhetResponse company = brregClient.hentEnhet(orgNumber);
        String website = company.hjemmeside();
        if (!WebsiteLeadUrlPolicy.isPlausibleBusinessWebsite(website)) {
            return new WebsiteAvailabilityResponse(orgNumber, website, UNVERIFIABLE,
                    website == null || website.isBlank() ? "NO_WEBSITE" : "INVALID_WEBSITE_VALUE",
                    null, null, null, null, "REVIEW", "Ingen gyldig registrert nettside å vurdere.");
        }
        String url = website.matches("(?i)^https?://.*") ? website.trim() : "https://" + website.trim();
        Instant now = Instant.now(clock);
        Observation observation = observations.compute(orgNumber + "|" + url,
                (key, previous) -> nextObservation(url, company, now, previous));
        Instant nextCheckAt = observation.status.equals(PENDING_RECHECK)
                ? observation.lastCheckedAt.plus(RECHECK_DELAY)
                : null;
        return new WebsiteAvailabilityResponse(orgNumber, website, observation.status,
                observation.reasonCode, observation.httpStatus, observation.firstCheckedAt,
                observation.lastCheckedAt, nextCheckAt, observation.suitability.status(), observation.suitability.reason());
    }

    private Observation nextObservation(String url, EnhetResponse company, Instant now, Observation previous) {
        if (previous != null) {
            Duration elapsed = Duration.between(previous.lastCheckedAt, now);
            Duration minimumGap = previous.status.equals(PENDING_RECHECK) ? RECHECK_DELAY : RESULT_TTL;
            if (elapsed.compareTo(minimumGap) < 0) {
                return previous;
            }
        }

        WebsiteProbeResult probe = reachabilityService.probeNow(url);
        if (probe.reachable()) {
            WebsiteContentInspectionService.WebsiteContentSnapshot snapshot = contentInspectionService.fetchSnapshot(url);
            var suitability = WebsiteLeadSuitabilityPolicy.assess(company, "REACHABLE",
                    snapshot == null ? null : snapshot.title(), snapshot == null ? null : snapshot.bodyText());
            return new Observation("REACHABLE", probe.reasonCode(), probe.httpStatus(), now, now, suitability);
        }
        if ("INVALID_URL".equals(probe.reasonCode()) || "INTERRUPTED".equals(probe.reasonCode())) {
            return new Observation(UNVERIFIABLE, probe.reasonCode(), probe.httpStatus(), now, now,
                    WebsiteLeadSuitabilityPolicy.assess(company, UNVERIFIABLE, null, null));
        }
        if (previous != null && PENDING_RECHECK.equals(previous.status)) {
            return new Observation("CONFIRMED_UNREACHABLE", probe.reasonCode(), probe.httpStatus(),
                    previous.firstCheckedAt, now,
                    WebsiteLeadSuitabilityPolicy.assess(company, "CONFIRMED_UNREACHABLE", null, null));
        }
        return new Observation(PENDING_RECHECK, probe.reasonCode(), probe.httpStatus(), now, now,
                WebsiteLeadSuitabilityPolicy.assess(company, PENDING_RECHECK, null, null));
    }

    private record Observation(String status, String reasonCode, Integer httpStatus,
                               Instant firstCheckedAt, Instant lastCheckedAt,
                               WebsiteLeadSuitabilityPolicy.Assessment suitability) {
    }
}
