package io.ltj.nyfirmasjekk.api.v1;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record CompanyHistoryEntry(
        LocalDateTime capturedAt,
        String orgNumber,
        String name,
        String organizationForm,
        String scoreColor,
        String summary,
        String municipality,
        String county,
        String naceCode,
        String latestAnnualAccountsYear,
        Boolean vatRegistered,
        Boolean registeredInBusinessRegistry,
        Boolean hasContactData,
        Boolean hasRoles,
        Boolean hasSeriousSignals,
        LocalDate registrationDate
) {
}
