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
import java.time.Month;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CompanyApiV1MapperTests {

    @Test
    void brukerKanoniskKodeNarFactsBareHarBeskrivelse() {
        var mapper = new CompanyApiV1Mapper(
                null,
                new StubWebsiteReachabilityService(),
                new StubWebsiteContentInspectionService(),
                Clock.fixed(Instant.parse("2025-01-15T10:15:30Z"), ZoneId.of("Europe/Oslo"))
        );
        var facts = new CompanyFacts(
                "Aksjeselskap",
                LocalDate.of(2025, Month.JANUARY, 1),
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
                LocalDate.of(2024, Month.JANUARY, 1),
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
                LocalDate.of(2025, Month.JANUARY, 1),
                LocalDate.of(2024, Month.JANUARY, 1),
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
    void nettsideforslagFjernerRomertallOgSelskapsformFraNavn() {
        var summary = summaryForName("FONNES BÅTSERVICE II AS");

        assertThat(summary.websiteDiscovery()).isNotNull();
        assertThat(summary.websiteDiscovery().status()).isEqualTo("UNVERIFIED_SUGGESTION");
        assertThat(summary.websiteDiscovery().candidates())
                .contains("https://fonnesbatservice.no")
                .contains("https://fonnes-batservice.no")
                .contains("https://fonnesbatserviceii.no")
                .doesNotContain("https://fonnesbatserviceiier.no");
        assertThat(summary.websiteDiscovery().candidates().getFirst())
                .isEqualTo("https://fonnesbatservice.no");
    }

    @Test
    void nettsideforslagFjernerTypiskeStruktursuffiksOgOgVariant() {
        var holding = summaryForName("ABC BYGG HOLDING AS");
        var ogNavn = summaryForName("OLSEN & SØNN AS");
        var langBransje = summaryForName("ROMERIKE RENHOLD OG VEDLIKEHOLDSSERVICE AS");
        var langBransjeMedPrivatEpost = summaryForName("ROMERIKE RENHOLD OG VEDLIKEHOLDSSERVICE AS", "kontakt@yahoo.no");

        assertThat(holding.websiteDiscovery()).isNotNull();
        assertThat(holding.websiteDiscovery().candidates())
                .contains("https://abcbygg.no")
                .contains("https://abc-bygg.no")
                .contains("https://abcbyggholding.no");

        assertThat(ogNavn.websiteDiscovery()).isNotNull();
        assertThat(ogNavn.websiteDiscovery().candidates())
                .contains("https://olsenogsonn.no")
                .contains("https://olsensonn.no");

        assertThat(langBransje.websiteDiscovery()).isNotNull();
        assertThat(langBransje.websiteDiscovery().candidates())
                .contains("https://romerikerenhold.no")
                .contains("https://romerikerenholdservice.no");
        assertThat(langBransjeMedPrivatEpost.websiteDiscovery()).isNotNull();
        assertThat(langBransjeMedPrivatEpost.websiteDiscovery().source()).isEqualTo("NAME_HEURISTIC");
        assertThat(langBransjeMedPrivatEpost.websiteDiscovery().candidates())
                .contains("https://romerikerenhold.no")
                .contains("https://romerikerenholdservice.no")
                .doesNotContain("https://yahoo.no");
    }

    @Test
    void ukontrollertEpostdomeneErEtForslagMedLavSikkerhet() {
        var summary = summaryForName("TESTFIRMA AS", "kontakt@testfirma.no");

        assertThat(summary.websiteDiscovery()).isNotNull();
        assertThat(summary.websiteDiscovery().status()).isEqualTo("UNVERIFIED_SUGGESTION");
        assertThat(summary.websiteDiscovery().confidence()).isEqualTo("LOW");
        assertThat(summary.websiteDiscovery().source()).isEqualTo("EMAIL_DOMAIN");
        assertThat(summary.websiteDiscovery().candidates()).containsExactly("https://testfirma.no");
    }

    @Test
    void detaljresponsVurdererKvalitetPaRegistrertNettside() {
        var mapper = new CompanyApiV1Mapper(
                new StubAnnouncementService(List.of()),
                new StubWebsiteReachabilityService(true),
                new StubWebsiteContentInspectionService(new WebsiteContentInspectionService.WebsiteContentSnapshot(
                        "Home",
                        "Hei",
                        "<html><head><title>Home</title></head><body><img src=\"logo.png\" alt=\"\"></body></html>",
                        null,
                        null,
                        null,
                        null
                )),
                Clock.fixed(Instant.parse("2026-04-21T10:15:30Z"), ZoneId.of("Europe/Oslo"))
        );
        var facts = new CompanyFacts(
                "AS",
                LocalDate.of(2026, Month.APRIL, 20),
                "Nytt selskap",
                "62.010",
                "Utvikling",
                null,
                List.of(),
                "https://instagram.com/testfirma",
                "post@testfirma.no",
                null,
                true,
                true,
                0,
                false,
                null,
                LocalDate.of(2026, Month.APRIL, 20),
                true,
                true,
                false,
                "Oslo"
        );
        var check = new CompanyCheck(
                "123456789",
                "Testfirma AS",
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
                "Testfirma AS",
                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                null,
                List.of(),
                "https://instagram.com/testfirma",
                "post@testfirma.no",
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
                LocalDate.of(2026, Month.APRIL, 20),
                LocalDate.of(2026, Month.APRIL, 20),
                null,
                null
        );

        var details = mapper.toDetails(check, enhet, new RollerResponse(List.of()), List.of());

        assertThat(details.websiteQuality()).isNotNull();
        assertThat(details.websiteQuality().status()).isEqualTo("NEEDS_REVIEW");
        assertThat(details.websiteQuality().signals()).extracting(WebsiteQualitySignal::code)
                .contains(
                        "THIRD_PARTY_SURFACE",
                        "NON_NO_DOMAIN",
                        "WEAK_TITLE",
                        "WEAK_SHARE_PREVIEW",
                        "MISSING_STRUCTURED_DATA",
                        "WEAK_NAVIGATION",
                        "MISSING_ORG_NUMBER",
                        "MISSING_VIEWPORT",
                        "MISSING_LANGUAGE"
                );
    }

    @Test
    void etablertNettsideMedMetadataOgUuKontrollpunkterFaarMildTotalvurdering() {
        var mapper = new CompanyApiV1Mapper(
                null,
                new StubWebsiteReachabilityService(true),
                new StubWebsiteContentInspectionService(new WebsiteContentInspectionService.WebsiteContentSnapshot(
                        "Hjem",
                        "Etablert Dataselskap tilbyr foretaksdata, kredittinformasjon, risikoanalyse, markedsinnsikt og datadrevne vurderinger for norske virksomheter. Siden beskriver løsninger for kreditt, compliance, salg, leverandøroppfølging og analyse. Den har flere innganger til tjenester, fagartikler og kundestøtte, og fremstår som en etablert konsernside med mye innhold. Lær mer om hvordan virksomhetsdata kan brukes til bedre beslutninger.",
                        "<html lang=\"nb\"><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"></head><body><main><h1>Foretaksdata og risikoanalyse</h1><a href=\"/produkter\">Lær mer</a></main></body></html>",
                        "",
                        "width=device-width, initial-scale=1",
                        "nb",
                        "Foretaksdata og risikoanalyse"
                ))
        );

        var inspection = mapper.inspectWebsiteExtended("https://www.etablertdataselskap.no/");

        assertThat(inspection.websiteQuality().status())
                .as("signals: %s", inspection.websiteQuality().signals())
                .isEqualTo("OK");
        assertThat(inspection.websiteQuality().label()).isEqualTo("Generelt god nettside - enkelte forbedringspunkter");
        assertThat(inspection.websiteQuality().summary())
                .contains("i hovedsak god")
                .contains("metadata")
                .contains("universell utforming");
        assertThat(inspection.websiteQuality().summary()).doesNotContain("vanskeligere å forstå hva virksomheten tilbyr");
        assertThat(inspection.websiteQuality().signals()).extracting(WebsiteQualitySignal::code)
                .contains("WEAK_TITLE", "MISSING_META_DESCRIPTION", "WEAK_SHARE_PREVIEW");
    }

    @Test
    void byggerNormaliserteHendelserFraRegistreringOgKunngjoringer() {
        var mapper = new CompanyApiV1Mapper(new StubAnnouncementService(List.of(
                new Announcement("ADDRESS_CHANGE", "Endring av forretningsadresse", "20.06.2025", "BRREG kunngjøringer"),
                new Announcement("BANKRUPTCY", "Konkurs", "21.06.2025", "BRREG kunngjøringer"),
                new Announcement("GENERAL", "Generell melding", "22.06.2025", "BRREG kunngjøringer")
        )), new StubWebsiteReachabilityService(), new StubWebsiteContentInspectionService());

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
                LocalDate.of(2025, Month.JANUARY, 1),
                LocalDate.of(2024, Month.JANUARY, 1),
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
        )), new StubWebsiteReachabilityService(), new StubWebsiteContentInspectionService());
        var facts = new CompanyFacts(
                "AS",
                LocalDate.of(2025, Month.JANUARY, 1),
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
                LocalDate.of(2024, Month.JANUARY, 1),
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
                LocalDate.of(2025, Month.JANUARY, 1),
                LocalDate.of(2024, Month.JANUARY, 1),
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
                new StubWebsiteReachabilityService(),
                new StubWebsiteContentInspectionService(),
                Clock.fixed(Instant.parse("2026-04-21T10:15:30Z"), ZoneId.of("Europe/Oslo"))
        );
        var facts = new CompanyFacts(
                "AS",
                LocalDate.of(2026, Month.MARCH, 15),
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
                LocalDate.of(2026, Month.MARCH, 1),
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
                LocalDate.of(2026, Month.MARCH, 15),
                LocalDate.of(2026, Month.MARCH, 1),
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
                                new NetworkCompanyLink("123456789", "Test AS", List.of("DAGLIG_LEDER"), TrafficLight.YELLOW, false, false, LocalDate.of(2026, Month.MARCH, 15), null),
                                new NetworkCompanyLink("987654321", "Old Beta AS", List.of("STYREMEDLEM"), TrafficLight.RED, true, false, LocalDate.of(2025, Month.DECEMBER, 20), null),
                                new NetworkCompanyLink("111111111", "Closed Gamma AS", List.of("STYREMEDLEM"), TrafficLight.YELLOW, false, true, LocalDate.of(2026, Month.JANUARY, 10), null),
                                new NetworkCompanyLink("222222222", "Fresh Delta AS", List.of("STYREMEDLEM"), TrafficLight.GREEN, false, false, LocalDate.of(2026, Month.APRIL, 1), null)
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
                new StubWebsiteReachabilityService(),
                new StubWebsiteContentInspectionService(),
                Clock.fixed(Instant.parse("2026-04-21T10:15:30Z"), ZoneId.of("Europe/Oslo"))
        );
        var facts = new CompanyFacts(
                "AS",
                LocalDate.of(2026, Month.APRIL, 1),
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
                LocalDate.of(2026, Month.APRIL, 1),
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
                LocalDate.of(2026, Month.APRIL, 1),
                LocalDate.of(2026, Month.APRIL, 1),
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

    private static CompanySummary summaryForName(String companyName) {
        return summaryForName(companyName, null);
    }

    private static CompanySummary summaryForName(String companyName, String email) {
        var mapper = new CompanyApiV1Mapper(
                new StubAnnouncementService(List.of()),
                new StubWebsiteReachabilityService(),
                new StubWebsiteContentInspectionService()
        );
        var facts = new CompanyFacts(
                "AS",
                LocalDate.of(2026, Month.APRIL, 20),
                "Begrenset info.",
                "50.000",
                "Sjøtransport",
                null,
                List.of(),
                null,
                email,
                null,
                false,
                true,
                0,
                false,
                null,
                null,
                false,
                false,
                false,
                "Vestland"
        );
        var check = new CompanyCheck(
                "987654321",
                companyName,
                "AS",
                TrafficLight.YELLOW,
                "Begrenset info.",
                facts,
                new CompanyMetrics(0, 0, 0),
                List.of(),
                List.of(),
                List.of()
        );
        var enhet = new EnhetResponse(
                "987654321",
                companyName,
                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                null,
                List.of(),
                null,
                email,
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
                LocalDate.of(2026, Month.APRIL, 20),
                LocalDate.of(2026, Month.APRIL, 20),
                null,
                null
        );
        return mapper.toSummary(check, enhet);
    }

    private static final class StubWebsiteReachabilityService extends WebsiteReachabilityService {
        private final boolean reachable;

        private StubWebsiteReachabilityService() {
            this(false);
        }

        private StubWebsiteReachabilityService(boolean reachable) {
            this.reachable = reachable;
        }

        @Override
        public boolean isReachable(String url) {
            return reachable;
        }
    }

    private static final class StubWebsiteContentInspectionService extends WebsiteContentInspectionService {
        private final WebsiteContentSnapshot snapshot;

        private StubWebsiteContentInspectionService() {
            this(new WebsiteContentSnapshot(
                    "Testside",
                    "Dette er en testside med kontaktinformasjon, tjenester og nok tekst til at kvalitetssjekken ikke regner siden som tynn.",
                    "<html lang=\"nb\"><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><meta name=\"description\" content=\"Testside\"></head><body>Kontakt oss på post@example.no</body></html>",
                    "Testside",
                    "width=device-width, initial-scale=1",
                    "nb",
                    "Kontakt oss"
            ));
        }

        private StubWebsiteContentInspectionService(WebsiteContentSnapshot snapshot) {
            this.snapshot = snapshot;
        }

        @Override
        public WebsiteContentMatch inspect(String url, String companyName, String emailDomain) {
            return new WebsiteContentMatch(false, "Ingen innholdsmatch i test.", null);
        }

        @Override
        public WebsiteContentSnapshot fetchSnapshot(String url) {
            return snapshot;
        }

        @Override
        public WebsiteContentSnapshot fetchExtendedSnapshot(String url) {
            return snapshot;
        }
    }
}
