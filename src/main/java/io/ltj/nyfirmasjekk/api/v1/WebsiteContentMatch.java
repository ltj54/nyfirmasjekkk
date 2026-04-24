package io.ltj.nyfirmasjekk.api.v1;

public record WebsiteContentMatch(
        boolean matched,
        String reason,
        String pageTitle
) {
}
