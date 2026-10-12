package io.ltj.nyfirmasjekk.companycheck;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WebsiteContactPathPolicyTests {
    @Test
    void prioritizesExplicitBookingLinkOverContactLink() {
        String html = "<a href='/kontakt'>Kontakt oss</a><a href='/bestill-time'>Bestill time</a>";
        assertEquals("https://example.no/bestill-time",
                WebsiteContactPathPolicy.priorityUrl(html, "https://example.no"));
    }

    @Test
    void ignoresMailLinksAndPageFragments() {
        String html = "<a href='mailto:hei@example.no'>Kontakt</a><a href='#booking'>Booking</a>";
        assertNull(WebsiteContactPathPolicy.priorityUrl(html, "https://example.no"));
    }

    @Test
    void onlyCertainHttpErrorsCountAsConfirmedFailures() {
        assertTrue(WebsiteContactPathPolicy.isConfirmedFailure("HTTP_ERROR", 404));
        assertTrue(WebsiteContactPathPolicy.isConfirmedFailure("HTTP_ERROR", 410));
        assertTrue(WebsiteContactPathPolicy.isConfirmedFailure("HTTP_ERROR", 503));
        assertFalse(WebsiteContactPathPolicy.isConfirmedFailure("TIMEOUT", null));
        assertFalse(WebsiteContactPathPolicy.isConfirmedFailure("HTTP_ERROR", 400));
    }
}
