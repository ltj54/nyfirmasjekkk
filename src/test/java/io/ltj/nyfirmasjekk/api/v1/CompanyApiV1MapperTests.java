package io.ltj.nyfirmasjekk.api.v1;

import io.ltj.nyfirmasjekk.announcements.AnnouncementService;
import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import io.ltj.nyfirmasjekk.brreg.RollerResponse;
import io.ltj.nyfirmasjekk.companycheck.CompanyCheck;
import io.ltj.nyfirmasjekk.companycheck.CompanyFacts;
import io.ltj.nyfirmasjekk.companycheck.CompanyMetrics;
import io.ltj.nyfirmasjekk.companycheck.TrafficLight;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CompanyApiV1MapperTests {

    @Test
    void brukerKanoniskKodeNarFactsBareHarBeskrivelse() {
        var mapper = new CompanyApiV1Mapper(
                null,
                Clock.fixed(Instant.parse("2025-01-15T10:15:30Z"), ZoneId.of("Europe/Oslo"))
        );
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
        assertThat(summary.structureSignals()).extracting(StructureSignal::code)
                .containsExactly("NEW_COMPANY_WINDOW");
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

        var details = mapper.toDetails(check, enhet, new RollerResponse(List.of()), List.of());

        assertThat(details.events()).extracting(CompanyEvent::type).containsExactly("WINDING_UP", "REGISTRATION");
        assertThat(details.score().evidence()).extracting(ScoreEvidence::label)
                .contains("Avvikling registrert", "Nyregistrert selskap");
    }

    @Test
    void detaljresponsInneholderStrukturmonstreFraNyeSelskaperOgNettverk() {
        var mapper = new CompanyApiV1Mapper(
                new StubAnnouncementService(List.of()),
                Clock.fixed(Instant.parse("2026-04-21T10:15:30Z"), ZoneId.of("Europe/Oslo"))
        );
        var facts = new CompanyFacts(
                "AS",
                LocalDate.of(2026, 3, 15),
                "Nytt selskap",
                "62.010",
                "Utvikling",
                "Ada Lovelace",
                List.of("Ada Lovelace"),
                "example.no",
                "post@example.no",
                "12345678",
                true,
                true,
                1,
                true,
                "2025",
                LocalDate.of(2026, 3, 1),
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
                1,
                true,
                "2025",
                LocalDate.of(2026, 3, 15),
                LocalDate.of(2026, 3, 1),
                null,
                null
        );
        var network = List.of(
                new NetworkActor(
                        "PERSON:ADA LOVELACE",
                        "Ada Lovelace",
                        List.of("DAGLIG_LEDER"),
                        TrafficLight.RED,
                        3,
                        1,
                        1,
                        1,
                        1,
                        0,
                        null,
                        null,
                        null,
                        List.of(
                                new NetworkCompanyLink("123456789", "Test AS", List.of("DAGLIG_LEDER"), TrafficLight.YELLOW, false, false, LocalDate.of(2026, 3, 15), null),
                                new NetworkCompanyLink("987654321", "Old Beta AS", List.of("STYREMEDLEM"), TrafficLight.RED, true, false, LocalDate.of(2025, 12, 20), null),
                                new NetworkCompanyLink("111111111", "Closed Gamma AS", List.of("STYREMEDLEM"), TrafficLight.YELLOW, false, true, LocalDate.of(2026, 1, 10), null),
                                new NetworkCompanyLink("222222222", "Fresh Delta AS", List.of("STYREMEDLEM"), TrafficLight.GREEN, false, false, LocalDate.of(2026, 4, 1), null)
                        )
                )
        );

        var details = mapper.toDetails(check, enhet, new RollerResponse(List.of()), network);

        assertThat(details.structureSignals()).extracting(StructureSignal::code)
                .contains(
                        "ACTOR_CONTEXT_ELEVATED",
                        "NEW_COMPANY_WINDOW",
                        "RECENT_BANKRUPTCY_RELATION",
                        "RECENT_DISSOLUTION_RELATION",
                        "CLUSTERED_NEW_COMPANY_PATTERN",
                        "POSSIBLE_REORGANIZATION"
                );
    }

    @Test
    void summaryKanByggeBoSignalAktorrisikoOgMuligOmregistrering() {
        var mapper = new CompanyApiV1Mapper(
                new StubAnnouncementService(List.of(
                        new Announcement("BANKRUPTCY", "Konkurs", "20.04.2026", "BRREG kunngjøringer")
                )),
                Clock.fixed(Instant.parse("2026-04-21T10:15:30Z"), ZoneId.of("Europe/Oslo"))
        );
        var facts = new CompanyFacts(
                "AS",
                LocalDate.of(2026, 4, 1),
                "Nytt selskap",
                "62.010",
                "Utvikling",
                "Ada Lovelace",
                List.of("Ada Lovelace"),
                "example.no",
                "post@example.no",
                "12345678",
                true,
                true,
                1,
                true,
                "2025",
                LocalDate.of(2026, 4, 1),
                true,
                true,
                false,
                "Oslo (Oslo)"
        );
        var check = new CompanyCheck(
                "123456789",
                "Eksempel AS Konkursbo",
                "KBO",
                TrafficLight.RED,
                "Forhold som kan påvirke drift eller betalingsevne. Undersøk!",
                facts,
                new CompanyMetrics(0, 1, 1),
                List.of(
                        new io.ltj.nyfirmasjekk.companycheck.CheckFinding(TrafficLight.RED, "Aktørrisiko", "Historikk hos tilknyttede personer."),
                        new io.ltj.nyfirmasjekk.companycheck.CheckFinding(TrafficLight.RED, "Alvorlige signaler", "Konkurs eller tvangsoppløsning.")
                ),
                List.of(),
                List.of()
        );
        var enhet = new EnhetResponse(
                "123456789",
                "Eksempel AS Konkursbo",
                new EnhetResponse.Organisasjonsform("KBO", "Konkursbo"),
                null,
                List.of(),
                null,
                null,
                null,
                null,
                true,
                false,
                false,
                true,
                false,
                0,
                false,
                null,
                LocalDate.of(2026, 4, 1),
                LocalDate.of(2026, 4, 1),
                null,
                null
        );

        var summary = mapper.toSummary(check, enhet);

        assertThat(summary.structureSignals()).extracting(StructureSignal::code)
                .containsExactly("NEW_COMPANY_WINDOW", "BO_SIGNAL", "BANKRUPTCY_SIGNAL", "POSSIBLE_REORGANIZATION");
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
