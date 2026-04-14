package io.ltj.nyfirmasjekk.brreg;

import java.util.List;

public record EnheterSearchResponse(
        Embedded _embedded,
        Page page
) {
    public record Embedded(List<EnhetResponse> enheter) {}
    public record Page(int size, int totalElements, int totalPages, int number) {}
}
