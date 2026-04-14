package io.ltj.nyfirmasjekk.brreg;

public class BrregClientException extends RuntimeException {

    public BrregClientException(String message) {
        super(message);
    }

    public BrregClientException(String message, Throwable cause) {
        super(message, cause);
    }
}
