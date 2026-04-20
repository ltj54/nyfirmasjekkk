package io.ltj.nyfirmasjekk.api.v1;

import io.ltj.nyfirmasjekk.announcements.AnnouncementService;
import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import io.ltj.nyfirmasjekk.brreg.RollerResponse;
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
        assertThat(summary.events()).extracting(CompanyEvent::type).containsExactly("REGISTRATION");
    }

    @Test
    void byggerNormaliserteHendelserFraRegistreringOgKunngjoringer() {
        var mapper = new CompanyApiV1Mapper(new StubAnnouncementService(List.of(
                new Announcement("ADDRESS_CHANGE", "Endring av forretningsadresse", "20.06.2025", "BRREG kunngjøringer"),
                new Announcement("BANKRUPTCY", "Konkurs", "21.06.2025", "BRREG kunngjøringer"),
                new Announcement("GENERAL", "Generell melding", "22.06.2025", "BRREG kunngjøringer")
        )));

        var events = mapper.toEvents(new EnhetResponse(
                "123456789",
                "Test AS",
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
                true,
                true,
                0,
                false,
                null,
                LocalDate.of(2025, 1, 1),
                LocalDate.of(2024, 1, 1),
                null,
                null
        ));

        assertThat(events)
                .extracting(CompanyEvent::type, CompanyEvent::severity)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("BANKRUPTCY", "HIGH"),
                        org.assertj.core.groups.Tuple.tuple("ADDRESS_CHANGE", "INFO"),
                        org.assertj.core.groups.Tuple.tuple("REGISTRATION", "INFO")
                );
    }

    @Test
    void detaljresponsInneholderNormaliserteHendelser() {
        var mapper = new CompanyApiV1Mapper(new StubAnnouncementService(List.of(
                new Announcement("WINDING_UP", "Avvikling", "20.06.2025", "BRREG kunngjøringer")
        )));
        var facts = new CompanyFacts(
                "AS",
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
                true,
                4,
                true,
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
                TrafficLight.YELLOW,
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
                true,
                true,
                4,
                true,
                "2024",
                LocalDate.of(2025, 1, 1),
                LocalDate.of(2024, 1, 1),
                null,
                null
        );

        var details = mapper.toDetails(check, enhet, new RollerResponse(List.of()));

        assertThat(details.events()).extracting(CompanyEvent::type).containsExactly("WINDING_UP", "REGISTRATION");
        assertThat(details.announcements()).extracting(Announcement::type).containsExactly("WINDING_UP");
        assertThat(details.score().evidence()).extracting(ScoreEvidence::label)
                .contains("Avvikling registrert", "Nyregistrert selskap");
    }

    private static final class StubAnnouncementService extends AnnouncementService {
        private final List<Announcement> announcements;

        private StubAnnouncementService(List<Announcement> announcements) {
            super(null);
            this.announcements = announcements;
        }

        @Override
        public List<Announcement> announcementsFor(EnhetResponse enhet) {
            return announcements;
        }
    }
}
