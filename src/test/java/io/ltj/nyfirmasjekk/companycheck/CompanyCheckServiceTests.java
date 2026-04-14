package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.brreg.BrregClient;
import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import io.ltj.nyfirmasjekk.brreg.RollerResponse;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CompanyCheckServiceTests {

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
                                LocalDate.of(2025, 1, 10),
                                null,
                                null
                        ),
                        new RollerResponse(List.of())
                ),
                fixedClock()
        );

        var result = service.vurder("123456789");

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
                                LocalDate.of(2026, 3, 15),
                                null,
                                null
                        ),
                        new RollerResponse(List.of())
                ),
                fixedClock()
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
                                LocalDate.of(2024, 1, 5),
                                null,
                                null
                        ),
                        new RollerResponse(List.of(
                                new RollerResponse.Rollegruppe(
                                        new RollerResponse.Rolletype("LEDE", "Ledelse"),
                                        List.of(new RollerResponse.Rolle(new RollerResponse.Rolletype("DAGL", "Daglig leder")))
                                )
                        ))
                ),
                fixedClock()
        );

        var result = service.vurder("111222333");

        assertThat(result.status()).isEqualTo(TrafficLight.GREEN);
    }

    private Clock fixedClock() {
        return Clock.fixed(Instant.parse("2026-04-13T10:15:30Z"), ZoneId.of("Europe/Oslo"));
    }

    private static final class StubBrregClient extends BrregClient {

        private final EnhetResponse enhet;
        private final RollerResponse roller;

        private StubBrregClient(EnhetResponse enhet, RollerResponse roller) {
            super(null);
            this.enhet = enhet;
            this.roller = roller;
        }

        @Override
        public EnhetResponse hentEnhet(String organisasjonsnummer) {
            return enhet;
        }

        @Override
        public RollerResponse hentRoller(String organisasjonsnummer) {
            return roller;
        }
    }
}
