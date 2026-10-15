package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.brreg.RollerResponse;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ContactAgeServiceTests {
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 15);

    @Test
    void calculatesAgeOnlyForUnambiguousActiveOwner() {
        RollerResponse response = roles(
                role("INNH", "Bjørne", LocalDate.of(1952, 4, 20), false),
                role("DAGL", "Someone Else", LocalDate.of(1980, 1, 1), false)
        );

        assertThat(ContactAgeService.ageFromRoles(response, TODAY))
                .isEqualTo(new ContactAgeService.ContactAge("Bjørne Test", 74));
    }

    @Test
    void waitsUntilBirthdayHasPassed() {
        assertThat(ContactAgeService.ageFromRoles(
                roles(role("DAGL", "Ada", LocalDate.of(1999, 10, 16), false)), TODAY
        )).isEqualTo(new ContactAgeService.ContactAge("Ada Test", 26));
    }

    @Test
    void hidesAmbiguousMissingAndInactivePeople() {
        assertThat(ContactAgeService.ageFromRoles(roles(
                role("INNH", "Ada", LocalDate.of(1980, 1, 1), false),
                role("INNH", "Grace", LocalDate.of(1981, 1, 1), false)
        ), TODAY)).isNull();
        assertThat(ContactAgeService.ageFromRoles(
                roles(role("INNH", "Ada", null, false)), TODAY
        )).isNull();
        assertThat(ContactAgeService.ageFromRoles(
                roles(role("INNH", "Ada", LocalDate.of(1980, 1, 1), true)), TODAY
        )).isNull();
    }

    private static RollerResponse roles(RollerResponse.Rolle... roles) {
        return new RollerResponse(List.of(new RollerResponse.Rollegruppe(
                new RollerResponse.Rolletype("LEDE", "Ledelse"), List.of(roles)
        )));
    }

    private static RollerResponse.Rolle role(String code, String firstName, LocalDate birthDate, boolean resigned) {
        return new RollerResponse.Rolle(
                new RollerResponse.Rolletype(code, code),
                new RollerResponse.Person(new RollerResponse.Personnavn(firstName, null, "Test"), birthDate),
                null,
                resigned,
                false
        );
    }
}
