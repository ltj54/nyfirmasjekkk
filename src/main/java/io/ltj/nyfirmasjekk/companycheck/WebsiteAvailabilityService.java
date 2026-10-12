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
    private static final String CONTACT_PATH_PENDING_RECHECK = "CONTACT_PATH_PENDING_RECHECK";
    private static final String CONFIRMED_CONTACT_PATH_BROKEN = "CONFIRMED_CONTACT_PATH_BROKEN";

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
                    null, null, null, null, "REVIEW", "Ingen gyldig registrert nettside å vurdere.", null);
        }
        String url = website.matches("(?i)^https?://.*") ? website.trim() : "https://" + website.trim();
        Instant now = Instant.now(clock);
        Observation observation = observations.compute(orgNumber + "|" + url,
                (key, previous) -> nextObservation(url, company, now, previous));
        Instant nextCheckAt = isPending(observation.status)
                ? observation.lastCheckedAt.plus(RECHECK_DELAY)
                : null;
        return new WebsiteAvailabilityResponse(orgNumber, website, observation.status,
                observation.reasonCode, observation.httpStatus, observation.firstCheckedAt,
                observation.lastCheckedAt, nextCheckAt, observation.suitability.status(), observation.suitability.reason(),
                observation.issueUrl);
    }

    private Observation nextObservation(String url, EnhetResponse company, Instant now, Observation previous) {
        if (previous != null) {
            Duration elapsed = Duration.between(previous.lastCheckedAt, now);
            Duration minimumGap = isPending(previous.status) ? RECHECK_DELAY : RESULT_TTL;
            if (elapsed.compareTo(minimumGap) < 0) {
                return previous;
            }
        }

        WebsiteProbeResult probe = reachabilityService.probeNow(url);
        if (probe.reachable()) {
            WebsiteContentInspectionService.WebsiteContentSnapshot snapshot = contentInspectionService.fetchSnapshot(url);
            return observeReachableWebsite(url, company, now, previous, probe, snapshot);
        }
        if ("INVALID_URL".equals(probe.reasonCode()) || "INTERRUPTED".equals(probe.reasonCode())) {
            return new Observation(UNVERIFIABLE, probe.reasonCode(), probe.httpStatus(), now, now,
                    WebsiteLeadSuitabilityPolicy.assess(company, UNVERIFIABLE, null, null), null);
        }
        if (previous != null && PENDING_RECHECK.equals(previous.status)) {
            return new Observation("CONFIRMED_UNREACHABLE", probe.reasonCode(), probe.httpStatus(),
                    previous.firstCheckedAt, now,
                    WebsiteLeadSuitabilityPolicy.assess(company, "CONFIRMED_UNREACHABLE", null, null), null);
        }
        return new Observation(PENDING_RECHECK, probe.reasonCode(), probe.httpStatus(), now, now,
                WebsiteLeadSuitabilityPolicy.assess(company, PENDING_RECHECK, null, null), null);
    }

    private Observation observeReachableWebsite(String url, EnhetResponse company, Instant now, Observation previous,
                                                WebsiteProbeResult websiteProbe,
                                                WebsiteContentInspectionService.WebsiteContentSnapshot snapshot) {
        String contactUrl = snapshot == null ? null : WebsiteContactPathPolicy.priorityUrl(snapshot.html(), url);
        if (contactUrl != null) {
            WebsiteProbeResult contactProbe = reachabilityService.probeNow(contactUrl);
            if (WebsiteContactPathPolicy.isConfirmedFailure(contactProbe.reasonCode(), contactProbe.httpStatus())) {
                boolean repeatedFailure = previous != null
                        && CONTACT_PATH_PENDING_RECHECK.equals(previous.status)
                        && contactUrl.equals(previous.issueUrl);
                String status = repeatedFailure ? CONFIRMED_CONTACT_PATH_BROKEN : CONTACT_PATH_PENDING_RECHECK;
                Instant firstCheckedAt = repeatedFailure ? previous.firstCheckedAt : now;
                return new Observation(status, contactProbe.reasonCode(), contactProbe.httpStatus(),
                        firstCheckedAt, now, WebsiteLeadSuitabilityPolicy.assess(company, status,
                        snapshot.title(), snapshot.bodyText()), contactUrl);
            }
        }
        return new Observation("REACHABLE", websiteProbe.reasonCode(), websiteProbe.httpStatus(), now, now,
                WebsiteLeadSuitabilityPolicy.assess(company, "REACHABLE",
                        snapshot == null ? null : snapshot.title(), snapshot == null ? null : snapshot.bodyText()), null);
    }

    private boolean isPending(String status) {
        return PENDING_RECHECK.equals(status) || CONTACT_PATH_PENDING_RECHECK.equals(status);
    }

    private record Observation(String status, String reasonCode, Integer httpStatus,
                               Instant firstCheckedAt, Instant lastCheckedAt,
                               WebsiteLeadSuitabilityPolicy.Assessment suitability, String issueUrl) {
    }
}
