package io.ltj.nyfirmasjekk.api.v1;

import java.util.List;

public record WebsiteDiscovery(
        String status,
        String confidence,
        List<String> candidates,
        String verifiedCandidate,
        Boolean verifiedReachable,
        Boolean contentMatched,
        String contentMatchReason,
        String pageTitle,
        List<WebsiteCandidateCheck> candidateChecks,
        String reason,
        String source
) {
}
