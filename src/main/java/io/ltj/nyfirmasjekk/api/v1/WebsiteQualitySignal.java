package io.ltj.nyfirmasjekk.api.v1;

public record WebsiteQualitySignal(
        String code,
        String title,
        String detail,
        String severity
) {
}
