package io.ltj.nyfirmasjekk.api.v1;

import java.util.List;

public record WebsiteInspectionResponse(
        String inputUrl,
        String normalizedUrl,
        WebsiteQualityAssessment websiteQuality,
        List<BrregWebsiteMatch> brregMatches,
        WebsiteInspectionCoverage coverage
) {
    public WebsiteInspectionResponse(
            String inputUrl,
            String normalizedUrl,
            WebsiteQualityAssessment websiteQuality,
            List<BrregWebsiteMatch> brregMatches
    ) {
        this(inputUrl, normalizedUrl, websiteQuality, brregMatches, null);
    }
}
