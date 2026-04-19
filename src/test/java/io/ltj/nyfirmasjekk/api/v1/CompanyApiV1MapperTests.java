package io.ltj.nyfirmasjekk.api.v1;

import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import io.ltj.nyfirmasjekk.companycheck.CompanyCheck;
import io.ltj.nyfirmasjekk.companycheck.CompanyFacts;
import io.ltj.nyfirmasjekk.companycheck.CompanyMetrics;
import io.ltj.nyfirmasjekk.companycheck.TrafficLight;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CompanyApiV1MapperTests {

    @Test
    void brukerKanoniskKodeNarFactsBareHarBeskrivelse() {
        var mapper = new CompanyApiV1Mapper(null);
        var facts = new CompanyFacts(
                "Aksjeselskap",
                LocalDate.of(2025, 1, 1),
                "Etablert selskap",
                "62.010",
                "Utvikling",
                "Ola Nordmann",
                List.of("Ola Nordmann"),
                "example.no",
                "post@example.no",
                "12345678",
                true,
                false,
                0,
                false,
                "2024",
                LocalDate.of(2024, 1, 1),
                true,
                true,
                false,
                "Oslo (Oslo)"
        );
        var check = new CompanyCheck(
                "123456789",
                "Test AS",
                "AS",
                TrafficLight.GREEN,
                "Ryddig førsteinntrykk.",
                facts,
                new CompanyMetrics(0, 0, 0),
                List.of(),
                List.of(),
                List.of()
        );
        var enhet = new EnhetResponse(
                "123456789",
                "Test AS",
                null,
                null,
                List.of(),
                null,
                null,
                null,
                null,
                false,
                false,
                false,
                true,
                false,
                0,
                false,
                null,
                LocalDate.of(2025, 1, 1),
                LocalDate.of(2024, 1, 1),
                null,
                null
        );

        var summary = mapper.toSummary(check, enhet);

        assertThat(summary.flags()).containsExactly("NOT_REGISTERED_IN_FORETAKSREGISTERET");
    }
}
