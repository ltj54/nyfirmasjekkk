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
        boolean missingWebsite
) {
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
        this(navn, dager, kommune, fylke, naeringskode, organisasjonsform, score, resultSize, false, false, false);
    }
}
