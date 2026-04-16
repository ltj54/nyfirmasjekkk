package io.ltj.nyfirmasjekk.companycheck;

import java.time.LocalDate;
import java.util.List;

public record CompanyFacts(
        String organisasjonsform,
        LocalDate registreringsdato,
        String modenhet,
        String naeringskode,
        String aktivitet,
        String dagligLeder,
        List<String> styre,
        String hjemmeside,
        String epostadresse,
        String telefon,
        Boolean registrertIMvaregisteret,
        Boolean registrertIForetaksregisteret,
        Integer antallAnsatte,
        Boolean harRegistrertAntallAnsatte,
        String sisteInnsendteAarsregnskap,
        LocalDate stiftelsesdato,
        boolean harKontaktdata,
        boolean harRoller,
        boolean harAlvorligeSignal,
        String lokasjon
) {
}
