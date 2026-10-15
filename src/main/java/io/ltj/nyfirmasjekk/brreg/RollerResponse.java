package io.ltj.nyfirmasjekk.brreg;

import java.util.List;
import java.time.LocalDate;

public record RollerResponse(List<Rollegruppe> rollegrupper) {

    public record Rollegruppe(Rolletype type, List<Rolle> roller) {
    }

    public record Rolle(
            Rolletype type,
            Person person,
            Rolleenhet enhet,
            Boolean fratraadt,
            Boolean avregistrert
    ) {
    }

    public record Rolletype(String kode, String beskrivelse) {
    }

    public record Person(Personnavn navn, LocalDate fodselsdato) {
        public Person(Personnavn navn) {
            this(navn, null);
        }
    }

    public record Personnavn(String fornavn, String mellomnavn, String etternavn) {
    }

    public record Rolleenhet(String organisasjonsnummer, List<String> navn) {
    }
}
