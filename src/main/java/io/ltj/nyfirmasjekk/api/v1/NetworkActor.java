package io.ltj.nyfirmasjekk.api.v1;

import java.util.List;

public record NetworkActor(
        String actorKey,
        String actorName,
        List<String> roleTypesInSelectedCompany,
        List<NetworkCompanyLink> relatedCompanies
) {
}
