package io.ltj.nyfirmasjekk.api.v1;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MetadataServiceTests {

    @Test
    void filtersViserBareKanoniskeOrganisasjonsformer() {
        MetadataService service = new MetadataService();

        MetadataFiltersResponse filters = service.filters();

        assertThat(filters.organizationForms()).contains("AS - Aksjeselskap", "STIFT - Stiftelse", "KBO - Konkursbo");
        assertThat(filters.organizationForms()).doesNotContain("Aksjeselskap", "STI", "BO", "Ukjent form");
    }
}
