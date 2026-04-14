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
        String website,
        CompanyScoreResponse score,
        List<Role> roles,
        List<Announcement> announcements,
        List<String> flags
) {
}
