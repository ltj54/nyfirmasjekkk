package io.ltj.nyfirmasjekk.companycheck;

public record ActorRiskSummary(
        TrafficLight riskLevel,
        int totalRelatedCompanyCount,
        int redCompanyCount,
        int yellowCompanyCount,
        int greenCompanyCount
) {
    public static ActorRiskSummary none() {
        return new ActorRiskSummary(TrafficLight.GREEN, 0, 0, 0, 0);
    }
}
