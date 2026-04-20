package io.ltj.nyfirmasjekk.api.v1;

public record CompanyEvent(
        String type,
        String title,
        String date,
        String source,
        String severity
) {
}
