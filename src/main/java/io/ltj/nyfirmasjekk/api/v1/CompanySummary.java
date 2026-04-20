package io.ltj.nyfirmasjekk.api.v1;

import java.time.LocalDate;
import java.util.List;

public record CompanySummary(
        String orgNumber,
        String name,
        String organizationForm,
        LocalDate registrationDate,
        String municipality,
        String county,
        String naceCode,
        String naceDescription,
        String website,
        String email,
        String phone,
        String contactPersonName,
        String contactPersonRole,
        Boolean vatRegistered,
        Boolean registeredInBusinessRegistry,
        ScoreColor scoreColor,
        List<String> scoreReasons,
        List<CompanyEvent> events,
        List<String> flags
) {
}
