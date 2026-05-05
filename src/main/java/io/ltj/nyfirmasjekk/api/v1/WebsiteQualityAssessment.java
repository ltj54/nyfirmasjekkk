package io.ltj.nyfirmasjekk.api.v1;

import java.util.List;

public record WebsiteQualityAssessment(
        String status,
        String label,
        String summary,
        List<WebsiteQualitySignal> signals
) {
}
