package io.ltj.nyfirmasjekk.companycheck;

public record CompanySearchRequest(
        String navn,
        int dager,
        String kommune,
        String fylke,
        String naeringskode,
        String organisasjonsform,
        String score,
        int resultSize,
        boolean hasEmail,
        boolean hasWebsite,
        boolean missingWebsite,
        boolean websiteLeadCohort,
        int websiteLeadOldestMonths
) {
    public CompanySearchRequest(
            String navn, int dager, String kommune, String fylke, String naeringskode,
            String organisasjonsform, String score, int resultSize,
            boolean hasEmail, boolean hasWebsite, boolean missingWebsite, boolean websiteLeadCohort
    ) {
        this(navn, dager, kommune, fylke, naeringskode, organisasjonsform, score,
                resultSize, hasEmail, hasWebsite, missingWebsite, websiteLeadCohort, 12);
    }
    public CompanySearchRequest(
            String navn, int dager, String kommune, String fylke, String naeringskode,
            String organisasjonsform, String score, int resultSize,
            boolean hasEmail, boolean hasWebsite, boolean missingWebsite
    ) {
        this(navn, dager, kommune, fylke, naeringskode, organisasjonsform, score,
                resultSize, hasEmail, hasWebsite, missingWebsite, false);
    }

    public CompanySearchRequest(
            String navn,
            int dager,
            String kommune,
            String fylke,
            String naeringskode,
            String organisasjonsform,
            String score,
            int resultSize
    ) {
        this(navn, dager, kommune, fylke, naeringskode, organisasjonsform, score, resultSize, false, false, false, false);
    }
}
