package io.ltj.nyfirmasjekk.api.v1;

import java.util.List;

public record WebsiteInspectionCoverage(
        int pagesInspected,
        int pageLimit,
        int internalLinksChecked,
        String method,
        List<String> limitations
) {
}
