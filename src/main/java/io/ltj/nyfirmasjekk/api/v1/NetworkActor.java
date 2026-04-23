package io.ltj.nyfirmasjekk.api.v1;

import io.ltj.nyfirmasjekk.companycheck.TrafficLight;

import java.time.LocalDateTime;
import java.util.List;

public record NetworkActor(
        String actorKey,
        String actorName,
        List<String> roleTypesInSelectedCompany,
        TrafficLight riskLevel,
        int totalCompanyCount,
        int bankruptcyCompanyCount,
        int redCompanyCount,
        int dissolvedCompanyCount,
        int yellowCompanyCount,
        int greenCompanyCount,
        LocalDateTime lastRedSeenAt,
        LocalDateTime lastBankruptcySeenAt,
        LocalDateTime lastDissolvedSeenAt,
        List<NetworkCompanyLink> relatedCompanies
) {
}
