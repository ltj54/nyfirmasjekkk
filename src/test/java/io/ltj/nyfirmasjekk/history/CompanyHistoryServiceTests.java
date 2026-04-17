package io.ltj.nyfirmasjekk.history;

import io.ltj.nyfirmasjekk.companycheck.CompanyCheck;
import io.ltj.nyfirmasjekk.companycheck.CompanyFacts;
import io.ltj.nyfirmasjekk.companycheck.CompanyMetrics;
import io.ltj.nyfirmasjekk.companycheck.TrafficLight;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(CompanyHistoryServiceTests.TestConfig.class)
class CompanyHistoryServiceTests {

    @Autowired
    private CompanyHistoryService service;

    @Test
    void capturesAndReturnsHistoryEntries() {
        service.captureSnapshot(new CompanyCheck(
                "123456789",
                "Historikk AS",
                "AS",
                TrafficLight.YELLOW,
                "Åpne registerdata viser noen forhold som bør vurderes litt nærmere.",
                new CompanyFacts(
                        "AS",
                        LocalDate.of(2024, 1, 5),
                        "Etablert selskap",
                        "62.010 - Programmeringstjenester",
                        "Utvikling",
                        "Ada Lovelace",
                        List.of("Grace Hopper"),
                        "example.no",
                        "post@example.no",
                        "12345678",
                        true,
                        true,
                        3,
                        true,
                        "2024",
                        LocalDate.of(2024, 1, 1),
                        true,
                        true,
                        false,
                        "OSLO (OSLO)"
                ),
                new CompanyMetrics(4, 2, 0),
                List.of(),
                List.of(),
                List.of()
        ));

        var history = service.historyFor("123456789");

        assertThat(history).hasSize(1);
        assertThat(history.getFirst().orgNumber()).isEqualTo("123456789");
        assertThat(history.getFirst().scoreColor()).isEqualTo("YELLOW");
        assertThat(history.getFirst().latestAnnualAccountsYear()).isEqualTo("2024");
        assertThat(history.getFirst().municipality()).isEqualTo("OSLO");
    }

    @org.springframework.boot.test.context.TestConfiguration
    static class TestConfig {
        @org.springframework.context.annotation.Bean
        CompanyHistoryService companyHistoryService(CompanyHistorySnapshotRepository repository) {
            return new CompanyHistoryService(
                    repository,
                    Clock.fixed(Instant.parse("2026-04-17T10:15:30Z"), ZoneId.of("Europe/Oslo"))
            );
        }
    }
}
