package io.ltj.nyfirmasjekk.brreg;

public class EnhetFinnesIkkeException extends RuntimeException {

    public EnhetFinnesIkkeException(String organisasjonsnummer) {
        super("Fant ikke virksomhet med organisasjonsnummer " + organisasjonsnummer);
    }
}
