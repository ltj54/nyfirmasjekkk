package io.ltj.nyfirmasjekk.api.v1;

import java.util.List;

public record CompanyScoreResponse(
        String orgNumber,
        ScoreColor color,
        String label,
        List<String> reasons,
        List<String> rulesTriggered
) {
}
