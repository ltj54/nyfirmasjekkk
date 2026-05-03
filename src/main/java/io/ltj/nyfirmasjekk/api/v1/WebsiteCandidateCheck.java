package io.ltj.nyfirmasjekk.api.v1;

public record WebsiteCandidateCheck(
        String url,
        Boolean reachable,
        Boolean contentMatched,
        String pageTitle,
        String reason
) {
}
