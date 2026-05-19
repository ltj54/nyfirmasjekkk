package io.ltj.nyfirmasjekk.api.v1;

import java.time.LocalDate;

public record BrregWebsiteMatch(
        String orgNumber,
        String name,
        String organizationForm,
        String website,
        String email,
        String phone,
        String mobile,
        String naceCode,
        String naceDescription,
        String municipality,
        String county,
        LocalDate registrationDate,
        String matchReason
) {
}
