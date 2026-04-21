package io.ltj.nyfirmasjekk.api.v1;

import io.ltj.nyfirmasjekk.companycheck.TrafficLight;

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
        List<NetworkCompanyLink> relatedCompanies
) {
}
