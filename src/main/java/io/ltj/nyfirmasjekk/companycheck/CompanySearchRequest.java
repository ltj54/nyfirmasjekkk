package io.ltj.nyfirmasjekk.companycheck;

public record CompanySearchRequest(
        String navn,
        int dager,
        String kommune,
        String fylke,
        String naeringskode,
        String organisasjonsform
) {
}
