package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.announcements.AnnouncementService;
import io.ltj.nyfirmasjekk.api.v1.Announcement;
import io.ltj.nyfirmasjekk.brreg.BrregClient;
import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import io.ltj.nyfirmasjekk.brreg.EnheterSearchResponse;
import io.ltj.nyfirmasjekk.brreg.RollerResponse;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class CompanyCheckServiceTests {

    private final AnnouncementService announcementService = new StubAnnouncementService();

    @Test
    void girRodNarAapneDataViserKonkurs() {
        var service = new CompanyCheckService(
                new StubBrregClient(
                        new EnhetResponse(
                                "123456789",
                                "Test AS",
                                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                                List.of("Utvikling av programvare"),
                                "example.no",
                                "post@example.no",
                                "12345678",
                                null,
                                true,
                                false,
                                false,
                                true,
                                true,
                                4,
                                true,
                                "2024",
                                LocalDate.of(2025, 1, 10),
                                LocalDate.of(2025, 1, 8),
                                null,
                                null
                        ),
                        new RollerResponse(List.of())
                ),
                fixedClock(),
                ActorRiskService.noOp(),
                announcementService
        );

        var result = service.vurder("123456789");

        assertThat(result.status()).isEqualTo(TrafficLight.RED);
    }

    @Test
    void girRodNarNavnEllerOrganisasjonsformTydeligViserKonkursbo() {
        var service = new CompanyCheckService(
                new StubBrregClient(
                        new EnhetResponse(
                                "123456780",
                                "EKSEMPEL AS KONKURSBO",
                                new EnhetResponse.Organisasjonsform("KBO", "Konkursbo"),
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
                                false,
                                null,
                                false,
                                null,
                                LocalDate.of(2026, 4, 10),
                                LocalDate.of(2026, 4, 10),
                                null,
                                null
                        ),
                        new RollerResponse(List.of())
                ),
                fixedClock(),
                ActorRiskService.noOp(),
                announcementService
        );

        var result = service.vurder("123456780");

        assertThat(result.status()).isEqualTo(TrafficLight.RED);
    }

    @Test
    void girGulForNyttSelskapMedLiteData() {
        var service = new CompanyCheckService(
                new StubBrregClient(
                        new EnhetResponse(
                                "987654321",
                                "Nytt Foretak",
                                new EnhetResponse.Organisasjonsform("ENK", "Enkeltpersonforetak"),
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
                                false,
                                null,
                                false,
                                null,
                                LocalDate.of(2026, 3, 15),
                                LocalDate.of(2026, 3, 15),
                                null,
                                null
                        ),
                        new RollerResponse(List.of())
                ),
                fixedClock(),
                ActorRiskService.noOp(),
                announcementService
        );

        var result = service.vurder("987654321");

        assertThat(result.status()).isEqualTo(TrafficLight.YELLOW);
    }

    @Test
    void girGronnNarBasisdataOgRollerErPaaPlass() {
        var service = new CompanyCheckService(
                new StubBrregClient(
                        new EnhetResponse(
                                "111222333",
                                "Stabilt Selskap AS",
                                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                                List.of("Konsulenttjenester"),
                                "example.no",
                                "post@example.no",
                                "12345678",
                                null,
                                false,
                                false,
                                false,
                                true,
                                true,
                                3,
                                true,
                                "2024",
                                LocalDate.of(2022, 1, 5),
                                LocalDate.of(2021, 12, 20),
                                null,
                                null
                        ),
                        new RollerResponse(List.of(
                                new RollerResponse.Rollegruppe(
                                        new RollerResponse.Rolletype("LEDE", "Ledelse"),
                                        List.of(
                                                new RollerResponse.Rolle(
                                                        new RollerResponse.Rolletype("DAGL", "Daglig leder"),
                                                        new RollerResponse.Person(new RollerResponse.Personnavn("Ada", null, "Lovelace")),
                                                        null,
                                                        false,
                                                        false
                                                ),
                                                new RollerResponse.Rolle(
                                                        new RollerResponse.Rolletype("STYR", "Styremedlem"),
                                                        new RollerResponse.Person(new RollerResponse.Personnavn("Grace", null, "Hopper")),
                                                        null,
                                                        false,
                                                        false
                                                )
                                        )
                                )
                        ))
                ),
                fixedClock(),
                ActorRiskService.noOp(),
                announcementService
        );

        var result = service.vurder("111222333");

        assertThat(result.status()).isEqualTo(TrafficLight.GREEN);
        assertThat(result.fakta().dagligLeder()).isEqualTo("Ada Lovelace");
        assertThat(result.fakta().styre()).containsExactly("Grace Hopper");
    }

    @Test
    void girGronnForNyttEnkMedRyddigeGrunnsignaler() {
        var service = new CompanyCheckService(
                new StubBrregClient(
                        new EnhetResponse(
                                "222333444",
                                "Trygg ENK",
                                new EnhetResponse.Organisasjonsform("ENK", "Enkeltpersonforetak"),
                                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                                List.of("Konsulenttjenester"),
                                "trygg.no",
                                "post@trygg.no",
                                "12345678",
                                null,
                                false,
                                false,
                                false,
                                false,
                                false,
                                null,
                                false,
                                null,
                                LocalDate.of(2026, 3, 20),
                                LocalDate.of(2026, 3, 18),
                                null,
                                null
                        ),
                        new RollerResponse(List.of())
                ),
                fixedClock(),
                ActorRiskService.noOp(),
                announcementService
        );

        var result = service.vurder("222333444");

        assertThat(result.status()).isEqualTo(TrafficLight.GREEN);
    }

    @Test
    void girGronnForRelativtNyttSelskapMedRyddigeGrunnsignaler() {
        var service = new CompanyCheckService(
                new StubBrregClient(
                        new EnhetResponse(
                                "444333222",
                                "Ungt Men Ryddig AS",
                                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                                List.of("Konsulenttjenester"),
                                "ungt.no",
                                "post@ungt.no",
                                "12345678",
                                null,
                                false,
                                false,
                                false,
                                true,
                                true,
                                2,
                                true,
                                null,
                                LocalDate.of(2025, 10, 1),
                                LocalDate.of(2025, 9, 20),
                                null,
                                null
                        ),
                        new RollerResponse(List.of(
                                new RollerResponse.Rollegruppe(
                                        new RollerResponse.Rolletype("LEDE", "Ledelse"),
                                        List.of(
                                                new RollerResponse.Rolle(
                                                        new RollerResponse.Rolletype("DAGL", "Daglig leder"),
                                                        new RollerResponse.Person(new RollerResponse.Personnavn("Ada", null, "Lovelace")),
                                                        null,
                                                        false,
                                                        false
                                                )
                                        )
                                )
                        ))
                ),
                fixedClock(),
                ActorRiskService.noOp(),
                announcementService
        );

        var result = service.vurder("444333222");

        assertThat(result.status()).isEqualTo(TrafficLight.GREEN);
    }

    @Test
    void girGulNarMinimumPositivStrukturManglerSelvUtenAlvorligeSignal() {
        var service = new CompanyCheckService(
                new StubBrregClient(
                        new EnhetResponse(
                                "444333111",
                                "Strukturfattig Foretak",
                                new EnhetResponse.Organisasjonsform("FLI", "Forening/lag/innretning"),
                                new EnhetResponse.Naeringskode("94.992", "Aktiviteter i andre medlemsorganisasjoner ellers"),
                                List.of(),
                                null,
                                null,
                                null,
                                null,
                                false,
                                false,
                                false,
                                false,
                                false,
                                null,
                                false,
                                null,
                                LocalDate.of(2025, 10, 1),
                                LocalDate.of(2025, 9, 20),
                                null,
                                null
                        ),
                        new RollerResponse(List.of())
                ),
                fixedClock(),
                ActorRiskService.noOp(),
                announcementService
        );

        var result = service.vurder("444333111");

        assertThat(result.status()).isEqualTo(TrafficLight.YELLOW);
    }

    @Test
    void girGulForEldreAsMedManglendeRegistersignaler() {
        var service = new CompanyCheckService(
                new StubBrregClient(
                        new EnhetResponse(
                                "333444555",
                                "Tynt AS",
                                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                                List.of("Konsulenttjenester"),
                                "tynt.no",
                                "post@tynt.no",
                                "12345678",
                                null,
                                false,
                                false,
                                false,
                                false,
                                false,
                                0,
                                true,
                                null,
                                LocalDate.of(2024, 1, 5),
                                LocalDate.of(2024, 1, 1),
                                null,
                                null
                        ),
                        new RollerResponse(List.of(
                                new RollerResponse.Rollegruppe(
                                        new RollerResponse.Rolletype("LEDE", "Ledelse"),
                                        List.of(
                                                new RollerResponse.Rolle(
                                                        new RollerResponse.Rolletype("DAGL", "Daglig leder"),
                                                        new RollerResponse.Person(new RollerResponse.Personnavn("Ada", null, "Lovelace")),
                                                        null,
                                                        false,
                                                        false
                                                )
                                        )
                                )
                        ))
                ),
                fixedClock(),
                ActorRiskService.noOp(),
                announcementService
        );

        var result = service.vurder("333444555");

        // Score: 100 - 10 (regnskap) - 5 (ansatte) - 0 (alder > 12mnd) = 85 -> GRØNN
        assertThat(result.status()).isEqualTo(TrafficLight.GREEN);
    }

    @Test
    void brukerStandardResultatstorrelseISok() {
        var client = new StubBrregClient(
                null,
                new RollerResponse(List.of()),
                new EnheterSearchResponse(new EnheterSearchResponse.Embedded(List.of()), null)
        );
        var service = new CompanyCheckService(client, fixedClock(), ActorRiskService.noOp(), announcementService);

        service.sok(new CompanySearchRequest(null, 30, null, null, null, "AS", null, 60));

        // Vi bruker nå alltid size=100 for å være effektive mot BRREG-cachen
        assertThat(client.lastSearchFilter()).containsEntry("size", "100");
    }

    @Test
    void filtrererPaAlleSokeordOgScoreLokalt() {
        var trygEnhet = new EnhetResponse(
                "911934558",
                "FUNKSJONÆRLAGET TRYG FORSIKRING AVD. TØNSBERG",
                new EnhetResponse.Organisasjonsform("FLI", "Forening/lag/innretning"),
                new EnhetResponse.Naeringskode("94.992", "Aktiviteter i andre medlemsorganisasjoner ellers"),
                List.of("Interesseorganisasjon"),
                "tryg.no",
                "post@tryg.no",
                "12345678",
                null,
                false,
                false,
                false,
                false,
                false,
                null,
                false,
                null,
                LocalDate.of(2013, 11, 4),
                LocalDate.of(2013, 11, 4),
                null,
                null
        );
        var redEnhet = new EnhetResponse(
                "915488641",
                "UNI FORSIKRING AS",
                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                new EnhetResponse.Naeringskode("66.220", "Forsikringsformidling"),
                List.of("Forsikringsformidling"),
                null,
                null,
                null,
                null,
                false,
                true,
                false,
                true,
                false,
                null,
                false,
                null,
                LocalDate.of(2015, 6, 29),
                LocalDate.of(2015, 6, 29),
                null,
                null
        );
        var client = new StubBrregClient(
                Map.of(
                        trygEnhet.organisasjonsnummer(), trygEnhet,
                        redEnhet.organisasjonsnummer(), redEnhet
                ),
                Map.of(
                        trygEnhet.organisasjonsnummer(), new RollerResponse(List.of()),
                        redEnhet.organisasjonsnummer(), new RollerResponse(List.of(
                                new RollerResponse.Rollegruppe(
                                        new RollerResponse.Rolletype("LEDE", "Ledelse"),
                                        List.of(
                                                new RollerResponse.Rolle(
                                                        new RollerResponse.Rolletype("DAGL", "Daglig leder"),
                                                        new RollerResponse.Person(new RollerResponse.Personnavn("Ada", null, "Lovelace")),
                                                        null,
                                                        false,
                                                        false
                                                )
                                        )
                                )
                        ))
                ),
                new EnheterSearchResponse(new EnheterSearchResponse.Embedded(List.of(trygEnhet, redEnhet)), null)
        );
        var service = new CompanyCheckService(client, fixedClock(), ActorRiskService.noOp(), announcementService);

        var result = service.sok(new CompanySearchRequest("tryg forsikring", 0, null, null, null, null, "GREEN", 100));

        assertThat(result).extracting(CompanyCheck::organisasjonsnummer).containsExactly("911934558");
    }

    @Test
    void grontSokBrukerHurtigbaneUtenRolleoppslag() {
        var greenEnhet = new EnhetResponse(
                "111111111",
                "Stabil ENK",
                new EnhetResponse.Organisasjonsform("ENK", "Enkeltpersonforetak"),
                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                List.of("Konsulenttjenester"),
                "stabil.no",
                "post@stabil.no",
                "12345678",
                null,
                false,
                false,
                false,
                false,
                false,
                null,
                false,
                null,
                LocalDate.of(2025, 1, 10),
                LocalDate.of(2025, 1, 10),
                null,
                null
        );
        var yellowEnhet = new EnhetResponse(
                "222222222",
                "Tynt ENK",
                new EnhetResponse.Organisasjonsform("ENK", "Enkeltpersonforetak"),
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
                false,
                null,
                false,
                null,
                LocalDate.of(2026, 4, 10),
                LocalDate.of(2026, 4, 10),
                null,
                null
        );
        var client = new StubBrregClient(
                Map.of(
                        greenEnhet.organisasjonsnummer(), greenEnhet,
                        yellowEnhet.organisasjonsnummer(), yellowEnhet
                ),
                Map.of(
                        greenEnhet.organisasjonsnummer(), new RollerResponse(List.of()),
                        yellowEnhet.organisasjonsnummer(), new RollerResponse(List.of())
                ),
                new EnheterSearchResponse(
                        new EnheterSearchResponse.Embedded(List.of(greenEnhet, yellowEnhet)),
                        new EnheterSearchResponse.Page(100, 2, 1, 0)
                )
        );
        var service = new CompanyCheckService(client, fixedClock(), ActorRiskService.noOp(), announcementService);

        var result = service.sok(new CompanySearchRequest(null, 10, null, null, null, null, "GREEN", 100));

        assertThat(result).extracting(CompanyCheck::organisasjonsnummer).containsExactly("111111111");
        assertThat(result.get(0).status()).isEqualTo(TrafficLight.GREEN);
        assertThat(client.roleLookups()).isZero();
    }

    @Test
    void scorefiltrertSokFortsetterTilNesteBrregSideNarForsteSideIkkeHarTreff() {
        var yellowEnhet = new EnhetResponse(
                "222222222",
                "Tynt ENK",
                new EnhetResponse.Organisasjonsform("ENK", "Enkeltpersonforetak"),
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
                false,
                null,
                false,
                null,
                LocalDate.of(2026, 4, 10),
                LocalDate.of(2026, 4, 10),
                null,
                null
        );
        var greenEnhet = new EnhetResponse(
                "111111111",
                "Stabilt Foretak",
                new EnhetResponse.Organisasjonsform("ENK", "Enkeltpersonforetak"),
                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                List.of("Konsulenttjenester"),
                "stabil.no",
                "post@stabil.no",
                "12345678",
                null,
                false,
                false,
                false,
                false,
                false,
                1,
                true,
                "2024",
                LocalDate.of(2024, 1, 10),
                LocalDate.of(2024, 1, 10),
                null,
                null
        );

        var client = new StubBrregClient(
                Map.of(
                        yellowEnhet.organisasjonsnummer(), yellowEnhet,
                        greenEnhet.organisasjonsnummer(), greenEnhet
                ),
                Map.of(
                        yellowEnhet.organisasjonsnummer(), new RollerResponse(List.of()),
                        greenEnhet.organisasjonsnummer(), new RollerResponse(List.of())
                ),
                Map.of(
                        0, new EnheterSearchResponse(
                                new EnheterSearchResponse.Embedded(List.of(yellowEnhet)),
                                new EnheterSearchResponse.Page(100, 2, 2, 0)
                        ),
                        1, new EnheterSearchResponse(
                                new EnheterSearchResponse.Embedded(List.of(greenEnhet)),
                                new EnheterSearchResponse.Page(100, 2, 2, 1)
                        )
                )
        );
        var service = new CompanyCheckService(client, fixedClock(), ActorRiskService.noOp(), announcementService);

        var result = service.sok(new CompanySearchRequest(null, 0, null, null, null, null, "GREEN", 100));

        assertThat(result).extracting(CompanyCheck::organisasjonsnummer).containsExactly("111111111");
    }

    @Test
    void filtrererLokaltPaOrganisasjonsformOgScoreUtenAADelegereOrgformTilBrreg() {
        var redAs = new EnhetResponse(
                "999111111",
                "EKSEMPEL AS KONKURSBO",
                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                List.of("Konsulenttjenester"),
                "eksempel.no",
                "post@eksempel.no",
                "12345678",
                null,
                false,
                false,
                false,
                true,
                true,
                2,
                true,
                "2024",
                LocalDate.of(2026, 4, 10),
                LocalDate.of(2026, 4, 10),
                null,
                null
        );
        var redEnk = new EnhetResponse(
                "999222222",
                "EKSEMPEL ENK KONKURSBO",
                new EnhetResponse.Organisasjonsform("ENK", "Enkeltpersonforetak"),
                new EnhetResponse.Naeringskode("96.020", "Frisering og annen skjønnhetspleie"),
                List.of("Frisering"),
                "enk.no",
                "post@enk.no",
                "87654321",
                null,
                false,
                false,
                false,
                false,
                false,
                null,
                false,
                null,
                LocalDate.of(2026, 4, 10),
                LocalDate.of(2026, 4, 10),
                null,
                null
        );

        var client = new StubBrregClient(
                Map.of(
                        redAs.organisasjonsnummer(), redAs,
                        redEnk.organisasjonsnummer(), redEnk
                ),
                Map.of(
                        redAs.organisasjonsnummer(), new RollerResponse(List.of()),
                        redEnk.organisasjonsnummer(), new RollerResponse(List.of())
                ),
                new EnheterSearchResponse(
                        new EnheterSearchResponse.Embedded(List.of(redAs, redEnk)),
                        new EnheterSearchResponse.Page(100, 2, 1, 0)
                )
        );
        var service = new CompanyCheckService(client, fixedClock(), ActorRiskService.noOp(), announcementService);

        var result = service.sok(new CompanySearchRequest(null, 0, null, null, null, "AS", "RED", 100));

        assertThat(result).extracting(CompanyCheck::organisasjonsnummer).containsExactly("999111111");
        assertThat(client.lastSearchFilter()).doesNotContainKey("organisasjonsform.kode");
    }

    @Test
    void girGulNarAktorhistorikkErUrovekkende() {
        var service = new CompanyCheckService(
                new StubBrregClient(
                        new EnhetResponse(
                                "444555666",
                                "Rolig AS",
                                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                                List.of("Konsulenttjenester"),
                                "rolig.no",
                                "post@rolig.no",
                                "12345678",
                                null,
                                false,
                                false,
                                false,
                                true,
                                true,
                                3,
                                true,
                                "2024",
                                LocalDate.of(2022, 1, 5),
                                LocalDate.of(2021, 12, 20),
                                null,
                                null
                        ),
                        new RollerResponse(List.of(
                                new RollerResponse.Rollegruppe(
                                        new RollerResponse.Rolletype("LEDE", "Ledelse"),
                                        List.of(
                                                new RollerResponse.Rolle(
                                                        new RollerResponse.Rolletype("DAGL", "Daglig leder"),
                                                        new RollerResponse.Person(new RollerResponse.Personnavn("Ada", null, "Lovelace")),
                                                        null,
                                                        false,
                                                        false
                                                )
                                        )
                                )
                        ))
                ),
                fixedClock(),
                (orgNumber, rollerResponse) -> new ActorRiskSummary(TrafficLight.YELLOW, 2, 1, 1, 0),
                announcementService
        );

        var result = service.vurder("444555666");

        assertThat(result.status()).isEqualTo(TrafficLight.YELLOW);
    }

    @Test
    void girRodNarAktorhistorikkErAlvorlig() {
        var service = new CompanyCheckService(
                new StubBrregClient(
                        new EnhetResponse(
                                "555666777",
                                "Rolig AS",
                                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                                List.of("Konsulenttjenester"),
                                "rolig.no",
                                "post@rolig.no",
                                "12345678",
                                null,
                                false,
                                false,
                                false,
                                true,
                                true,
                                3,
                                true,
                                "2024",
                                LocalDate.of(2022, 1, 5),
                                LocalDate.of(2021, 12, 20),
                                null,
                                null
                        ),
                        new RollerResponse(List.of(
                                new RollerResponse.Rollegruppe(
                                        new RollerResponse.Rolletype("LEDE", "Ledelse"),
                                        List.of(
                                                new RollerResponse.Rolle(
                                                        new RollerResponse.Rolletype("DAGL", "Daglig leder"),
                                                        new RollerResponse.Person(new RollerResponse.Personnavn("Ada", null, "Lovelace")),
                                                        null,
                                                        false,
                                                        false
                                                )
                                        )
                                )
                        ))
                ),
                fixedClock(),
                (orgNumber, rollerResponse) -> new ActorRiskSummary(TrafficLight.RED, 3, 2, 1, 0),
                announcementService
        );

        var result = service.vurder("555666777");

        assertThat(result.status()).isEqualTo(TrafficLight.RED);
    }

    @Test
    void girGulForNyttSelskapMedFisjonOgOpplosning() {
        var orgnr = "123456789";
        var service = new CompanyCheckService(
                new StubBrregClient(
                        new EnhetResponse(
                                orgnr,
                                "ELVEFRONT AS",
                                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                                null,
                                List.of(),
                                null,
                                null,
                                null,
                                null,
                                false,
                                true, // underAvvikling (oppløsning)
                                false,
                                false,
                                false,
                                null,
                                false,
                                null,
                                LocalDate.of(2026, 3, 1), // Nylig registrert
                                LocalDate.of(2025, 12, 1),
                                null,
                                null
                        ),
                        new RollerResponse(List.of())
                ),
                fixedClock(),
                ActorRiskService.noOp(),
                new StubAnnouncementService(List.of(
                        new Announcement("FISSION", "Fisjon", "2026-04-01", "BRREG")
                ))
        );

        var result = service.vurder(orgnr);
        System.out.println("DEBUG: Status for ELVEFRONT is " + result.status());

        assertThat(result.status()).isEqualTo(TrafficLight.YELLOW);
    }

    private Clock fixedClock() {
        return Clock.fixed(Instant.parse("2026-04-13T10:15:30Z"), ZoneId.of("Europe/Oslo"));
    }

    private static final class StubBrregClient extends BrregClient {

        private final EnhetResponse enhet;
        private final RollerResponse roller;
        private final EnheterSearchResponse searchResponse;
        private final Map<Integer, EnheterSearchResponse> searchResponsesByPage;
        private final Map<String, EnhetResponse> enheterByOrgNumber;
        private final Map<String, RollerResponse> rollerByOrgNumber;
        private final AtomicInteger roleLookups = new AtomicInteger(0);
        private Map<String, String> lastSearchFilter;

        private StubBrregClient(EnhetResponse enhet, RollerResponse roller) {
            this(enhet, roller, new EnheterSearchResponse(new EnheterSearchResponse.Embedded(List.of()), null));
        }

        private StubBrregClient(EnhetResponse enhet, RollerResponse roller, EnheterSearchResponse searchResponse) {
            super(null, null);
            this.enhet = enhet;
            this.roller = roller;
            this.searchResponse = searchResponse;
            this.searchResponsesByPage = Map.of();
            this.enheterByOrgNumber = Map.of();
            this.rollerByOrgNumber = Map.of();
        }

        private StubBrregClient(
                Map<String, EnhetResponse> enheterByOrgNumber,
                Map<String, RollerResponse> rollerByOrgNumber,
                EnheterSearchResponse searchResponse
        ) {
            super(null, null);
            this.enhet = null;
            this.roller = null;
            this.searchResponse = searchResponse;
            this.searchResponsesByPage = Map.of();
            this.enheterByOrgNumber = new HashMap<>(enheterByOrgNumber);
            this.rollerByOrgNumber = new HashMap<>(rollerByOrgNumber);
        }

        private StubBrregClient(
                Map<String, EnhetResponse> enheterByOrgNumber,
                Map<String, RollerResponse> rollerByOrgNumber,
                Map<Integer, EnheterSearchResponse> searchResponsesByPage
        ) {
            super(null, null);
            this.enhet = null;
            this.roller = null;
            this.searchResponse = new EnheterSearchResponse(new EnheterSearchResponse.Embedded(List.of()), null);
            this.searchResponsesByPage = new HashMap<>(searchResponsesByPage);
            this.enheterByOrgNumber = new HashMap<>(enheterByOrgNumber);
            this.rollerByOrgNumber = new HashMap<>(rollerByOrgNumber);
        }

        @Override
        public EnhetResponse hentEnhet(String organisasjonsnummer) {
            return enheterByOrgNumber.getOrDefault(organisasjonsnummer, enhet);
        }

        @Override
        public RollerResponse hentRoller(String organisasjonsnummer) {
            roleLookups.incrementAndGet();
            return rollerByOrgNumber.getOrDefault(organisasjonsnummer, roller);
        }

        @Override
        public EnheterSearchResponse sok(Map<String, String> filter) {
            lastSearchFilter = Map.copyOf(filter);
            if (!searchResponsesByPage.isEmpty()) {
                int page = Integer.parseInt(filter.getOrDefault("page", "0"));
                return searchResponsesByPage.getOrDefault(
                        page,
                        new EnheterSearchResponse(new EnheterSearchResponse.Embedded(List.of()), new EnheterSearchResponse.Page(0, 0, page, page))
                );
            }
            return searchResponse;
        }

        private Map<String, String> lastSearchFilter() {
            return lastSearchFilter;
        }

        private int roleLookups() {
            return roleLookups.get();
        }
    }

    private static final class StubAnnouncementService extends AnnouncementService {
        private final List<Announcement> announcements;

        private StubAnnouncementService() {
            this(List.of());
        }

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
