package io.ltj.nyfirmasjekk.network;

import io.ltj.nyfirmasjekk.brreg.RollerResponse;
import io.ltj.nyfirmasjekk.companycheck.TrafficLight;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(CompanyNetworkServiceTests.TestConfig.class)
class CompanyNetworkServiceTests {

    @Autowired
    private CompanyNetworkService service;

    @Test
    void capturesRolesAndBuildsActorNetwork() {
        var roller = new RollerResponse(List.of(
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
        ));

        service.captureRoles("111111111", "Alpha AS", TrafficLight.GREEN, false, false, roller);
        service.captureRoles("222222222", "Beta AS", TrafficLight.RED, true, true, roller);

        var network = service.networkFor("111111111");

        assertThat(network).hasSize(1);
        assertThat(network.getFirst().actorName()).isEqualTo("Ada Lovelace");
        assertThat(network.getFirst().roleTypesInSelectedCompany()).containsExactly("DAGLIG_LEDER");
        assertThat(network.getFirst().riskLevel()).isEqualTo(TrafficLight.RED);
        assertThat(network.getFirst().bankruptcyCompanyCount()).isEqualTo(1);
        assertThat(network.getFirst().redCompanyCount()).isEqualTo(1);
        assertThat(network.getFirst().dissolvedCompanyCount()).isEqualTo(1);
        assertThat(network.getFirst().greenCompanyCount()).isEqualTo(1);
        assertThat(network.getFirst().relatedCompanies())
                .extracting(link -> link.orgNumber() + ":" + link.companyName())
                .containsExactly("222222222:Beta AS", "111111111:Alpha AS");
    }

    @org.springframework.boot.test.context.TestConfiguration
    static class TestConfig {
        @org.springframework.context.annotation.Bean
        CompanyNetworkService companyNetworkService(CompanyRoleSnapshotRepository repository) {
            return new CompanyNetworkService(
                    repository,
                    Clock.fixed(Instant.parse("2026-04-17T10:15:30Z"), ZoneId.of("Europe/Oslo"))
            );
        }
    }
}
