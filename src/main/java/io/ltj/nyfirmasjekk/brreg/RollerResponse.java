package io.ltj.nyfirmasjekk.brreg;

import java.util.List;

public record RollerResponse(List<Rollegruppe> rollegrupper) {

    public record Rollegruppe(Rolletype type, List<Rolle> roller) {
    }

    public record Rolle(Rolletype type) {
    }

    public record Rolletype(String kode, String beskrivelse) {
    }
}
