package io.ltj.nyfirmasjekk.api.v1;

record WebsiteContentMatch(
        boolean matched,
        String reason,
        String pageTitle
) {
}
