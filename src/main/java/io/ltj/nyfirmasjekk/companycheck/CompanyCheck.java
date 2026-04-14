package io.ltj.nyfirmasjekk.companycheck;

import java.util.List;

public record CompanyCheck(
        String organisasjonsnummer,
        String navn,
        String organisasjonsform,
        TrafficLight status,
        String sammendrag,
        CompanyFacts fakta,
        CompanyMetrics statistikk,
        List<CheckFinding> funn,
        List<String> kilder,
        List<String> begrensninger
) {
}
