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
import java.util.ArrayList;
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
    void normalisererOrganisasjonsformTilKodeSelvNarBRREGBareHarBeskrivelse() {
        var service = new CompanyCheckService(
                new StubBrregClient(
                        new EnhetResponse(
                                "123456779",
                                "Test AS",
                                new EnhetResponse.Organisasjonsform(null, "Aksjeselskap"),
                                null,
                                List.of(),
                                "example.no",
                                "post@example.no",
                                "12345678",
                                null,
                                false,
                                false,
                                false,
                                true,
                                false,
                                0,
                                false,
                                null,
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

        var result = service.vurder("123456779");

        assertThat(result.organisasjonsform()).isEqualTo("AS");
        assertThat(result.fakta().organisasjonsform()).isEqualTo("AS");
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
    void leggerTilOrganisasjonsformSomForklarbartSignalIFullVurdering() {
        var service = new CompanyCheckService(
                new StubBrregClient(
                        new EnhetResponse(
                                "222333445",
                                "Nordic Branch NUF",
                                new EnhetResponse.Organisasjonsform("NUF", "Norskregistrert utenlandsk foretak"),
                                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                                List.of("Konsulenttjenester"),
                                "branch.no",
                                "post@branch.no",
                                "12345678",
                                null,
                                false,
                                false,
                                false,
                                false,
                                true,
                                null,
                                false,
                                "2024",
                                LocalDate.of(2023, 3, 20),
                                LocalDate.of(2023, 3, 20),
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

        var result = service.vurder("222333445");

        assertThat(result.funn())
                .anySatisfy(finding -> {
                    assertThat(finding.label()).isEqualTo("Organisasjonsform");
                    assertThat(finding.detail()).contains("NUF", "-3");
                });
    }

    @Test
    void sterkNegativOrganisasjonsformBlirIkkeGrontHurtigsok() {
        var asEnhet = new EnhetResponse(
                "111111110",
                "Stabil AS",
                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                List.of("Konsulenttjenester"),
                null,
                "post@stabil.no",
                "12345678",
                null,
                false,
                false,
                false,
                false,
                true,
                null,
                false,
                null,
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2024, 1, 1),
                null,
                null
        );
        var nufEnhet = new EnhetResponse(
                "111111109",
                "Branch NUF",
                new EnhetResponse.Organisasjonsform("NUF", "Norskregistrert utenlandsk foretak"),
                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                List.of("Konsulenttjenester"),
                "branch.no",
                "post@branch.no",
                "12345678",
                null,
                false,
                false,
                false,
                false,
                true,
                null,
                false,
                null,
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2024, 1, 1),
                null,
                null
        );
        var client = new StubBrregClient(
                Map.of(
                        asEnhet.organisasjonsnummer(), asEnhet,
                        nufEnhet.organisasjonsnummer(), nufEnhet
                ),
                Map.of(
                        asEnhet.organisasjonsnummer(), new RollerResponse(List.of()),
                        nufEnhet.organisasjonsnummer(), new RollerResponse(List.of())
                ),
                new EnheterSearchResponse(new EnheterSearchResponse.Embedded(List.of(asEnhet, nufEnhet)), null)
        );
        var service = new CompanyCheckService(client, fixedClock(), ActorRiskService.noOp(), announcementService);

        var result = service.sok(new CompanySearchRequest(null, 0, null, null, null, null, "GREEN", 100));

        assertThat(result).extracting(CompanyCheck::organisasjonsnummer).containsExactly("111111110");
        assertThat(client.roleLookups()).isZero();
    }

    @Test
    void sokBeholderTreffBadeMedOgUtenNettsideNarIngenSliktFilterFinnes() {
        var medNettside = new EnhetResponse(
                "123123123",
                "Med Nettside AS",
                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                List.of("Konsulenttjenester"),
                "med.no",
                "post@med.no",
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
        );
        var utenNettside = new EnhetResponse(
                "123123124",
                "Uten Nettside AS",
                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                List.of("Konsulenttjenester"),
                null,
                "post@uten.no",
                "87654321",
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
        );
        var client = new StubBrregClient(
                Map.of(
                        medNettside.organisasjonsnummer(), medNettside,
                        utenNettside.organisasjonsnummer(), utenNettside
                ),
                Map.of(
                        medNettside.organisasjonsnummer(), new RollerResponse(List.of()),
                        utenNettside.organisasjonsnummer(), new RollerResponse(List.of())
                ),
                new EnheterSearchResponse(new EnheterSearchResponse.Embedded(List.of(medNettside, utenNettside)), null)
        );
        var service = new CompanyCheckService(client, fixedClock(), ActorRiskService.noOp(), announcementService);

        var result = service.sok(new CompanySearchRequest(null, 0, null, null, null, null, "GREEN", 100));

        assertThat(result).extracting(CompanyCheck::organisasjonsnummer).containsExactly("123123123", "123123124");
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
    void brukerStiftelsesdatoAktivtIModenhetsvurdering() {
        var service = new CompanyCheckService(
                new StubBrregClient(
                        new EnhetResponse(
                                "444333112",
                                "Omorganisert Men Etablert AS",
                                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                                List.of("Konsulenttjenester"),
                                "etablert.no",
                                "post@etablert.no",
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
                                LocalDate.of(2026, 3, 20),
                                LocalDate.of(2025, 1, 10),
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

        var result = service.vurder("444333112");

        assertThat(result.status()).isEqualTo(TrafficLight.GREEN);
        assertThat(result.funn()).extracting(CheckFinding::label).doesNotContain("Alder");
        assertThat(result.fakta().modenhet()).isEqualTo("Etablert selskap");
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
                null,
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
                null,
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
        assertThat(result.getFirst().status()).isEqualTo(TrafficLight.GREEN);
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
                null,
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
    void sokUtenScoreFilterFjernerDubletterMellomBrregSider() {
        var ettertid = new EnhetResponse(
                "123456789",
                "ETTERTID AS",
                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                List.of("Programvareutvikling"),
                "ettertid.no",
                "post@ettertid.no",
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
                LocalDate.of(2025, 1, 10),
                LocalDate.of(2025, 1, 10),
                null,
                null
        );
        var annetSelskap = new EnhetResponse(
                "987654321",
                "ANNET AS",
                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                List.of("Konsulenttjenester"),
                "annet.no",
                "post@annet.no",
                "87654321",
                null,
                false,
                false,
                false,
                true,
                true,
                1,
                true,
                "2024",
                LocalDate.of(2025, 1, 9),
                LocalDate.of(2025, 1, 9),
                null,
                null
        );

        var client = new StubBrregClient(
                Map.of(
                        ettertid.organisasjonsnummer(), ettertid,
                        annetSelskap.organisasjonsnummer(), annetSelskap
                ),
                Map.of(
                        ettertid.organisasjonsnummer(), new RollerResponse(List.of()),
                        annetSelskap.organisasjonsnummer(), new RollerResponse(List.of())
                ),
                Map.of(
                        0, new EnheterSearchResponse(
                                new EnheterSearchResponse.Embedded(List.of(ettertid)),
                                new EnheterSearchResponse.Page(100, 3, 3, 0)
                        ),
                        1, new EnheterSearchResponse(
                                new EnheterSearchResponse.Embedded(List.of(ettertid)),
                                new EnheterSearchResponse.Page(100, 3, 3, 1)
                        ),
                        2, new EnheterSearchResponse(
                                new EnheterSearchResponse.Embedded(List.of(annetSelskap)),
                                new EnheterSearchResponse.Page(100, 3, 3, 2)
                        )
                )
        );
        var service = new CompanyCheckService(client, fixedClock(), ActorRiskService.noOp(), announcementService);

        var result = service.sokPage(new CompanySearchRequest(null, 0, null, null, null, null, null, 10), 0);

        assertThat(result.items()).extracting(CompanyCheck::organisasjonsnummer).containsExactly("123456789", "987654321");
        assertThat(result.totalElements()).isEqualTo(2);
    }

    @Test
    void sokUtenScoreFilterStopperForBrregSinMaksimaleSidegrense() {
        var enk = new EnhetResponse(
                "123456789",
                "TRYG FORSIKRING ENK",
                new EnhetResponse.Organisasjonsform("ENK", "Enkeltpersonforetak"),
                new EnhetResponse.Naeringskode("66.220", "Forsikringsformidling"),
                List.of("Forsikring"),
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
                "2024",
                LocalDate.of(2025, 1, 10),
                LocalDate.of(2025, 1, 10),
                null,
                null
        );
        Map<Integer, EnheterSearchResponse> pages = new HashMap<>();
        for (int page = 0; page < 100; page++) {
            pages.put(page, new EnheterSearchResponse(
                    new EnheterSearchResponse.Embedded(List.of(enk)),
                    new EnheterSearchResponse.Page(100, 10_100, 101, page)
            ));
        }
        var client = new StubBrregClient(
                Map.of(enk.organisasjonsnummer(), enk),
                Map.of(enk.organisasjonsnummer(), new RollerResponse(List.of())),
                pages
        );
        var service = new CompanyCheckService(client, fixedClock(), ActorRiskService.noOp(), announcementService);

        var result = service.sokPage(new CompanySearchRequest(null, 0, null, null, null, "AS", null, 10), 0);

        assertThat(result.items()).isEmpty();
        assertThat(client.requestedSearchPages()).contains(99);
        assertThat(client.requestedSearchPages()).doesNotContain(100);
    }

    @Test
    void navnesokUtenScoreFilterStopperNarResultatsidenErFylt() {
        var tryg = new EnhetResponse(
                "989563521",
                "TRYG FORSIKRING",
                new EnhetResponse.Organisasjonsform("NUF", "Norskregistrert utenlandsk foretak"),
                new EnhetResponse.Naeringskode("65.120", "Skadeforsikring"),
                List.of("Forsikring"),
                "tryg.no",
                null,
                null,
                null,
                false,
                false,
                false,
                true,
                true,
                10,
                true,
                "2024",
                LocalDate.of(2025, 1, 10),
                LocalDate.of(2025, 1, 10),
                null,
                null
        );
        var client = new StubBrregClient(
                Map.of(tryg.organisasjonsnummer(), tryg),
                Map.of(tryg.organisasjonsnummer(), new RollerResponse(List.of())),
                Map.of(
                        0, new EnheterSearchResponse(
                                new EnheterSearchResponse.Embedded(List.of(tryg)),
                                new EnheterSearchResponse.Page(100, 250, 3, 0)
                        ),
                        1, new EnheterSearchResponse(
                                new EnheterSearchResponse.Embedded(List.of(tryg)),
                                new EnheterSearchResponse.Page(100, 250, 3, 1)
                        )
                )
        );
        var service = new CompanyCheckService(client, fixedClock(), ActorRiskService.noOp(), announcementService);

        var result = service.sokPage(new CompanySearchRequest("tryg forsikring as", 0, null, null, null, null, null, 1), 0);

        assertThat(result.items()).extracting(CompanyCheck::organisasjonsnummer).containsExactly("989563521");
        assertThat(client.lastSearchFilter()).containsEntry("navn", "tryg forsikring");
        assertThat(client.requestedSearchPages()).containsExactly(0);
    }

    @Test
    void scorefiltrertSokFjernerDubletterMellomBrregSider() {
        var ettertid = new EnhetResponse(
                "123456789",
                "ETTERTID AS",
                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                List.of("Programvareutvikling"),
                "ettertid.no",
                "post@ettertid.no",
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
                LocalDate.of(2025, 1, 10),
                LocalDate.of(2025, 1, 10),
                null,
                null
        );
        var annetSelskap = new EnhetResponse(
                "987654321",
                "ANNET AS",
                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                List.of("Konsulenttjenester"),
                "annet.no",
                "post@annet.no",
                "87654321",
                null,
                false,
                false,
                false,
                true,
                true,
                1,
                true,
                "2024",
                LocalDate.of(2025, 1, 9),
                LocalDate.of(2025, 1, 9),
                null,
                null
        );

        var client = new StubBrregClient(
                Map.of(
                        ettertid.organisasjonsnummer(), ettertid,
                        annetSelskap.organisasjonsnummer(), annetSelskap
                ),
                Map.of(
                        ettertid.organisasjonsnummer(), new RollerResponse(List.of()),
                        annetSelskap.organisasjonsnummer(), new RollerResponse(List.of())
                ),
                Map.of(
                        0, new EnheterSearchResponse(
                                new EnheterSearchResponse.Embedded(List.of(ettertid)),
                                new EnheterSearchResponse.Page(25, 3, 3, 0)
                        ),
                        1, new EnheterSearchResponse(
                                new EnheterSearchResponse.Embedded(List.of(ettertid)),
                                new EnheterSearchResponse.Page(25, 3, 3, 1)
                        ),
                        2, new EnheterSearchResponse(
                                new EnheterSearchResponse.Embedded(List.of(annetSelskap)),
                                new EnheterSearchResponse.Page(25, 3, 3, 2)
                        )
                )
        );
        var service = new CompanyCheckService(client, fixedClock(), ActorRiskService.noOp(), announcementService);

        var result = service.sokPage(new CompanySearchRequest(null, 0, null, null, null, null, "GREEN", 10), 0);

        assertThat(result.items()).extracting(CompanyCheck::organisasjonsnummer).containsExactly("123456789", "987654321");
        assertThat(result.totalElements()).isEqualTo(2);
    }

    @Test
    void filtrererLokaltPaOrganisasjonsformOgScoreUtenAADelegereOrgformTilBrreg() {
        var redAs = new EnhetResponse(
                "999111111",
                "EKSEMPEL AS KONKURSBO",
                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                new EnhetResponse.Naeringskode("62.010", "Programmeringstjenester"),
                List.of("Konsulenttjenester"),
                null,
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
        private final List<Integer> requestedSearchPages = new ArrayList<>();
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
                requestedSearchPages.add(page);
                return searchResponsesByPage.getOrDefault(
                        page,
                        new EnheterSearchResponse(new EnheterSearchResponse.Embedded(List.of()), new EnheterSearchResponse.Page(0, 0, page, page))
                );
            }
            requestedSearchPages.add(Integer.parseInt(filter.getOrDefault("page", "0")));
            return searchResponse;
        }

        private Map<String, String> lastSearchFilter() {
            return lastSearchFilter;
        }

        private int roleLookups() {
            return roleLookups.get();
        }

        private List<Integer> requestedSearchPages() {
            return List.copyOf(requestedSearchPages);
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
