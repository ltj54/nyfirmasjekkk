package io.ltj.nyfirmasjekk.companycheck;

import java.time.LocalDate;

public record CompanyFacts(
        String organisasjonsform,
        LocalDate registreringsdato,
        String modenhet,
        String naeringskode,
        String aktivitet,
        String hjemmeside,
        String epostadresse,
        String telefon,
        boolean harKontaktdata,
        boolean harRoller,
        boolean harAlvorligeSignal,
        String lokasjon
) {
}
