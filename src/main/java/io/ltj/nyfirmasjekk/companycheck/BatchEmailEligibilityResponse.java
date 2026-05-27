package io.ltj.nyfirmasjekk.companycheck;

public record BatchEmailEligibilityResponse(
        String orgNumber,
        boolean eligible,
        String reason,
        String blockingWebsite
) {
}
