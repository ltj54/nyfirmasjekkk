package io.ltj.nyfirmasjekk.brreg;

import java.time.LocalDate;
import java.util.List;

public record EnhetResponse(
        String organisasjonsnummer,
        String navn,
        Organisasjonsform organisasjonsform,
        Naeringskode naeringskode1,
        List<String> aktivitet,
        String hjemmeside,
        String epostadresse,
        String telefon,
        String mobil,
        Boolean konkurs,
        Boolean underAvvikling,
        Boolean underTvangsavviklingEllerTvangsopplosning,
        LocalDate registreringsdatoEnhetsregisteret,
        Adresse forretningsadresse,
        Adresse postadresse
) {

    public record Organisasjonsform(String kode, String beskrivelse) {
    }

    public record Naeringskode(String kode, String beskrivelse) {
    }

    public record Adresse(
            String land,
            String landkode,
            String postnummer,
            String poststed,
            List<String> adresse,
            String kommune,
            String kommunenummer,
            String fylke,
            String fylkesnummer
    ) {
    }
}
