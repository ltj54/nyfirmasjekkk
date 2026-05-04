package io.ltj.nyfirmasjekk.api.v1;

public record SalesSegment(
        String code,
        String label,
        int score,
        String explanation,
        String emailPitch
) {
}
