package io.ltj.nyfirmasjekk.api.v1;

import java.util.List;

public record MetadataFiltersResponse(
        List<String> organizationForms
) {
}
