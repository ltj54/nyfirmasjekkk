package io.ltj.nyfirmasjekk.companycheck;

import java.time.Instant;

public record WebsiteAvailabilityResponse(
        String orgNumber,
        String website,
        String status,
        String reasonCode,
        Integer httpStatus,
        Instant firstCheckedAt,
        Instant lastCheckedAt,
        Instant nextCheckAt,
        String leadSuitability,
        String leadSuitabilityReason,
        String issueUrl
) {
}
