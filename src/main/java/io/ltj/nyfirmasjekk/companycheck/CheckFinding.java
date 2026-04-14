package io.ltj.nyfirmasjekk.companycheck;

public record CheckFinding(
        TrafficLight severity,
        String label,
        String detail
) {
}
