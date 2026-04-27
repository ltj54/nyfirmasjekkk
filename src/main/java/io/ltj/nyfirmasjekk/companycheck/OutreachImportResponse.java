package io.ltj.nyfirmasjekk.companycheck;

public record OutreachImportResponse(
        int imported,
        int skipped,
        int totalEntries
) {
}
