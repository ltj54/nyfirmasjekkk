package io.ltj.nyfirmasjekk.api.v1;

import java.util.List;

public record CompanySearchResponse(
        int page,
        int size,
        long totalElements,
        int totalPages,
        List<CompanySummary> items
) {
}
