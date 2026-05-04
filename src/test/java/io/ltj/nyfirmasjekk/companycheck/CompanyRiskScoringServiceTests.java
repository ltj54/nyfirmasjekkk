package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CompanyRiskScoringServiceTests {
    private static final Clock FIXED_CLOCK = Clock.fixed(Instant.parse("2026-05-04T10:00:00Z"), ZoneId.of("Europe/Oslo"));
    private final CompanyRiskScoringService service = new CompanyRiskScoringService(FIXED_CLOCK);

    @Test
    void konkursGirRodStatus() {
        var status = service.determineStatus(
                establishedAs(),
                "AS",
                true,
                true,
                false,
                false,
                false,
                false,
                ActorRiskSummary.none()
        );

        assertThat(status).isEqualTo(TrafficLight.RED);
    }

    @Test
    void etablertSentraltSelskapUtenRollerGirRodStatus() {
        var status = service.determineStatus(
                establishedAs(),
                "AS",
                false,
                false,
                false,
                false,
                false,
                false,
                ActorRiskSummary.none()
        );

        assertThat(status).isEqualTo(TrafficLight.RED);
    }

    @Test
    void nyttSelskapMedTyntDatagrunnlagGirGulStatus() {
        var enhet = new EnhetResponse(
                "937000001",
                "NYTT TOMT AS",
                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                null,
                List.of(),
                null,
                null,
                null,
                null,
                false,
                false,
                false,
                false,
                true,
                0,
                true,
                null,
                LocalDate.of(2026, 5, 1),
                LocalDate.of(2026, 5, 1),
                null,
                null
        );

        var status = service.determineStatus(
                enhet,
                "AS",
                false,
                false,
                false,
                false,
                false,
                true,
                ActorRiskSummary.none()
        );

        assertThat(status).isEqualTo(TrafficLight.YELLOW);
        assertThat(service.hasThinData(enhet, false)).isTrue();
    }

    @Test
    void ryddigEtablertSelskapMedRollerGirGronnStatus() {
        var status = service.determineStatus(
                establishedAs(),
                "AS",
                true,
                false,
                false,
                false,
                false,
                false,
                ActorRiskSummary.none()
        );

        assertThat(status).isEqualTo(TrafficLight.GREEN);
    }

    @Test
    void aktorrisikoLofterStatusTilGulEllerRod() {
        var yellowStatus = service.determineStatus(
                establishedAs(),
                "AS",
                true,
                false,
                false,
                false,
                false,
                false,
                new ActorRiskSummary(TrafficLight.YELLOW, 2, 1, 0, 0)
        );

        var redStatus = service.determineStatus(
                establishedAs(),
                "AS",
                true,
                false,
                false,
                false,
                false,
                false,
                new ActorRiskSummary(TrafficLight.RED, 3, 2, 1, 0)
        );

        assertThat(yellowStatus).isEqualTo(TrafficLight.YELLOW);
        assertThat(redStatus).isEqualTo(TrafficLight.RED);
    }

    @Test
    void normalisererOrganisasjonsformFraKodeEllerBeskrivelse() {
        var fraKode = establishedAs();
        var fraBeskrivelse = new EnhetResponse(
                "937000002",
                "BESKRIVELSE AS",
                new EnhetResponse.Organisasjonsform(null, "Aksjeselskap"),
                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                List.of("Programmering"),
                "https://example.no",
                "post@example.no",
                null,
                null,
                false,
                false,
                false,
                false,
                true,
                1,
                true,
                "2025",
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2024, 1, 1),
                null,
                null
        );

        assertThat(service.normalizedOrganizationFormCode(fraKode)).isEqualTo("AS");
        assertThat(service.normalizedOrganizationFormCode(fraBeskrivelse)).isEqualTo("AS");
    }

    private EnhetResponse establishedAs() {
        return new EnhetResponse(
                "937000000",
                "RYDDIG AS",
                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                List.of("Programmering"),
                "https://ryddig.no",
                "post@ryddig.no",
                null,
                null,
                false,
                false,
                false,
                false,
                true,
                1,
                true,
                "2025",
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2024, 1, 1),
                null,
                null
        );
    }
}
