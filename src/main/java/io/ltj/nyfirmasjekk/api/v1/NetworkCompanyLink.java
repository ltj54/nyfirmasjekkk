package io.ltj.nyfirmasjekk.api.v1;

import java.time.LocalDateTime;
import java.util.List;

public record NetworkCompanyLink(
        String orgNumber,
        String companyName,
        List<String> roleTypes,
        LocalDateTime lastSeenAt
) {
}
