package io.ltj.nyfirmasjekk.api.v1;

import java.time.LocalDate;
import java.util.List;

public record CompanyDetails(
        String orgNumber,
        String name,
        String organizationForm,
        LocalDate registrationDate,
        LocalDate foundationDate,
        String status,
        String address,
        String postalCode,
        String postalPlace,
        String municipality,
        String county,
        String naceCode,
        String naceDescription,
        SalesSegment salesSegment,
        String website,
        WebsiteDiscovery websiteDiscovery,
        String email,
        String phone,
        String contactPersonName,
        String contactPersonRole,
        Boolean vatRegistered,
        Boolean registeredInBusinessRegistry,
        Integer employeeCount,
        Boolean employeeCountRegistered,
        String latestAnnualAccountsYear,
        CompanyScoreResponse score,
        List<Role> roles,
        List<CompanyEvent> events,
        List<StructureSignal> structureSignals,
        List<String> flags
) {
}
