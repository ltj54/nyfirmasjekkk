package io.ltj.nyfirmasjekk.api.v1;

import io.ltj.nyfirmasjekk.history.CompanyHistorySnapshotRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MetadataServiceTests {

    @Test
    void filtersViserBareKanoniskeOrganisasjonsformer() {
        CompanyHistorySnapshotRepository repository = mock(CompanyHistorySnapshotRepository.class);
        when(repository.findDistinctCounties()).thenReturn(List.of("Oslo"));
        when(repository.findDistinctOrganizationForms()).thenReturn(List.of("Aksjeselskap", "STI", "BO", "Ukjent form"));

        MetadataService service = new MetadataService(repository);

        MetadataFiltersResponse filters = service.filters();

        assertThat(filters.organizationForms()).contains("AS - Aksjeselskap", "STIFT - Stiftelse", "KBO - Konkursbo");
        assertThat(filters.organizationForms()).doesNotContain("Aksjeselskap", "STI", "BO", "Ukjent form");
    }
}
