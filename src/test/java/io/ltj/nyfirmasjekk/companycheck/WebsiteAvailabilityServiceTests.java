package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.api.v1.WebsiteProbeResult;
import io.ltj.nyfirmasjekk.api.v1.WebsiteReachabilityService;
import io.ltj.nyfirmasjekk.api.v1.WebsiteContentInspectionService;
import io.ltj.nyfirmasjekk.brreg.BrregClient;
import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

class WebsiteAvailabilityServiceTests {

    private final BrregClient brregClient = mock(BrregClient.class);
    private final WebsiteReachabilityService reachabilityService = mock(WebsiteReachabilityService.class);
    private final WebsiteContentInspectionService contentInspectionService = mock(WebsiteContentInspectionService.class);
    private final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-10-11T12:00:00Z"));
    private final Clock clock = new Clock() {
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now.get(); }
    };

    @Test
    void requiresTwoSeparatedFailuresBeforeConfirmingUnreachable() {
        givenWebsite("www.example.no");
        when(reachabilityService.probeNow("https://www.example.no"))
                .thenReturn(new WebsiteProbeResult(false, "TLS_ERROR", null));
        when(reachabilityService.probeNow("https://example.no"))
                .thenReturn(new WebsiteProbeResult(false, "TLS_ERROR", null));
        var service = new WebsiteAvailabilityService(brregClient, reachabilityService, contentInspectionService, clock);

        var first = service.check("123456789");
        assertEquals("PENDING_RECHECK", first.status());
        assertEquals("TLS_ERROR", first.reasonCode());

        now.set(now.get().plusSeconds(29));
        assertEquals("PENDING_RECHECK", service.check("123456789").status());
        verify(reachabilityService, times(1)).probeNow("https://www.example.no");

        now.set(now.get().plusSeconds(1));
        var confirmed = service.check("123456789");
        assertEquals("CONFIRMED_UNREACHABLE", confirmed.status());
        assertEquals(first.firstCheckedAt(), confirmed.firstCheckedAt());
        verify(reachabilityService, times(2)).probeNow("https://www.example.no");
        verify(reachabilityService, times(2)).probeNow("https://example.no");
    }

    @Test
    void aSuccessfulRecheckClearsTheFailure() {
        givenWebsite("example.no");
        when(reachabilityService.probeNow("https://example.no"))
                .thenReturn(new WebsiteProbeResult(false, "TIMEOUT", null),
                        new WebsiteProbeResult(true, "REACHABLE", 200));
        when(reachabilityService.probeNow("https://www.example.no"))
                .thenReturn(new WebsiteProbeResult(false, "TIMEOUT", null));
        var service = new WebsiteAvailabilityService(brregClient, reachabilityService, contentInspectionService, clock);

        assertEquals("PENDING_RECHECK", service.check("123456789").status());
        now.set(now.get().plusSeconds(30));
        assertEquals("REACHABLE", service.check("123456789").status());
    }

    @Test
    void reachableApexDomainClearsTlsFailureOnRegisteredWwwHost() {
        givenWebsite("www.ingengjeld.no");
        when(reachabilityService.probeNow("https://www.ingengjeld.no"))
                .thenReturn(new WebsiteProbeResult(false, "TLS_ERROR", null));
        when(reachabilityService.probeNow("https://ingengjeld.no"))
                .thenReturn(new WebsiteProbeResult(true, "REACHABLE", 200));
        var service = new WebsiteAvailabilityService(brregClient, reachabilityService, contentInspectionService, clock);

        var result = service.check("123456789");

        assertEquals("REACHABLE", result.status());
        assertEquals("REACHABLE_ALTERNATE_HOST", result.reasonCode());
        assertEquals(200, result.httpStatus());
        verify(contentInspectionService).fetchSnapshot("https://ingengjeld.no");
    }

    @Test
    void brokenBookingLinkRequiresTwoSeparatedFailures() {
        givenWebsite("example.no");
        String homepage = "https://example.no";
        String booking = "https://example.no/bestill-time";
        var snapshot = new WebsiteContentInspectionService.WebsiteContentSnapshot(
                "Hjem", "Bestill time", "<a href='/bestill-time'>Bestill time</a>", null, null, null, null);
        when(contentInspectionService.fetchSnapshot(homepage)).thenReturn(snapshot);
        when(reachabilityService.probeNow(homepage)).thenReturn(new WebsiteProbeResult(true, "REACHABLE", 200));
        when(reachabilityService.probeNow(booking)).thenReturn(new WebsiteProbeResult(false, "HTTP_ERROR", 404));
        var service = new WebsiteAvailabilityService(brregClient, reachabilityService, contentInspectionService, clock);

        var first = service.check("123456789");
        assertEquals("CONTACT_PATH_PENDING_RECHECK", first.status());
        assertEquals(booking, first.issueUrl());
        assertEquals("REVIEW", first.leadSuitability());

        now.set(now.get().plusSeconds(30));
        var confirmed = service.check("123456789");
        assertEquals("CONFIRMED_CONTACT_PATH_BROKEN", confirmed.status());
        assertEquals("CANDIDATE", confirmed.leadSuitability());
        assertEquals(first.firstCheckedAt(), confirmed.firstCheckedAt());
        verify(reachabilityService, times(2)).probeNow(booking);
    }

    @Test
    void repairedBookingLinkClearsPendingFinding() {
        givenWebsite("example.no");
        String homepage = "https://example.no";
        String booking = "https://example.no/booking";
        var snapshot = new WebsiteContentInspectionService.WebsiteContentSnapshot(
                "Hjem", "Booking", "<a href='/booking'>Booking</a>", null, null, null, null);
        when(contentInspectionService.fetchSnapshot(homepage)).thenReturn(snapshot);
        when(reachabilityService.probeNow(homepage)).thenReturn(new WebsiteProbeResult(true, "REACHABLE", 200));
        when(reachabilityService.probeNow(booking)).thenReturn(
                new WebsiteProbeResult(false, "HTTP_ERROR", 404),
                new WebsiteProbeResult(true, "REACHABLE", 200));
        var service = new WebsiteAvailabilityService(brregClient, reachabilityService, contentInspectionService, clock);

        assertEquals("CONTACT_PATH_PENDING_RECHECK", service.check("123456789").status());
        now.set(now.get().plusSeconds(30));
        assertEquals("REACHABLE", service.check("123456789").status());
    }

    @Test
    void noWebsiteIsUnverifiableAndDoesNotTriggerProbe() {
        givenWebsite(null);
        var service = new WebsiteAvailabilityService(brregClient, reachabilityService, contentInspectionService, clock);

        var result = service.check("123456789");
        assertEquals("UNVERIFIABLE", result.status());
        assertEquals("NO_WEBSITE", result.reasonCode());
        assertNull(result.lastCheckedAt());
    }

    @Test
    void socialReferenceIsNotProbedAsBrokenWebsite() {
        givenWebsite("FacebookBigImpress");
        var service = new WebsiteAvailabilityService(brregClient, reachabilityService, contentInspectionService, clock);

        var result = service.check("123456789");
        assertEquals("UNVERIFIABLE", result.status());
        assertEquals("INVALID_WEBSITE_VALUE", result.reasonCode());
        assertNull(result.lastCheckedAt());
    }

    @Test
    void freshSendCheckBlocksWhenWebsiteHasRecovered() {
        when(reachabilityService.probeNow("https://example.no"))
                .thenReturn(new WebsiteProbeResult(true, "REACHABLE", 200));
        var service = new WebsiteAvailabilityService(brregClient, reachabilityService, contentInspectionService, clock);

        assertFalse(service.stillUnreachableNow("example.no"));
        verify(reachabilityService, times(1)).probeNow("https://example.no");
    }

    private void givenWebsite(String website) {
        EnhetResponse company = mock(EnhetResponse.class);
        when(company.hjemmeside()).thenReturn(website);
        when(brregClient.hentEnhet("123456789")).thenReturn(company);
    }
}
