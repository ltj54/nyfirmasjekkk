package io.ltj.nyfirmasjekk.companycheck;

import java.util.List;

public record CompanySearchPage(
        List<CompanyCheck> items,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
