package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.brreg.BrregClient;
import io.ltj.nyfirmasjekk.brreg.RollerResponse;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

@Service
public class ContactAgeService {
    private static final ZoneId OSLO = ZoneId.of("Europe/Oslo");
    private static final List<String> PREFERRED_ROLES = List.of("INNH", "DAGL");

    private final BrregClient brregClient;
    private final Clock clock;

    public ContactAgeService(BrregClient brregClient, Clock clock) {
        this.brregClient = brregClient;
        this.clock = clock;
    }

    public ContactAge ageFor(String orgNumber) {
        return ageFromRoles(brregClient.hentRoller(orgNumber), LocalDate.now(clock.withZone(OSLO)));
    }

    static ContactAge ageFromRoles(RollerResponse response, LocalDate today) {
        if (response == null || response.rollegrupper() == null) {
            return null;
        }
        for (String roleCode : PREFERRED_ROLES) {
            List<RollerResponse.Person> people = peopleForRole(response, roleCode);
            if (people.isEmpty()) {
                continue;
            }
            if (people.size() != 1) {
                return null;
            }
            return contactAge(people.getFirst(), today);
        }
        return null;
    }

    private static List<RollerResponse.Person> peopleForRole(RollerResponse response, String roleCode) {
        return response.rollegrupper().stream()
                .filter(Objects::nonNull)
                .flatMap(group -> group.roller() == null ? Stream.empty() : group.roller().stream())
                .filter(role -> role != null && !Boolean.TRUE.equals(role.fratraadt())
                        && !Boolean.TRUE.equals(role.avregistrert()))
                .filter(role -> role.type() != null && roleCode.equalsIgnoreCase(role.type().kode()))
                .map(RollerResponse.Rolle::person)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    private static ContactAge contactAge(RollerResponse.Person person, LocalDate today) {
        String name = personName(person.navn());
        LocalDate birthDate = person.fodselsdato();
        if (name == null || birthDate == null || birthDate.isAfter(today)) {
            return null;
        }
        int age = Period.between(birthDate, today).getYears();
        return age >= 18 && age <= 110 ? new ContactAge(name, age) : null;
    }

    private static String personName(RollerResponse.Personnavn name) {
        if (name == null) {
            return null;
        }
        String value = String.join(" ", Arrays.stream(new String[]{name.fornavn(), name.mellomnavn(), name.etternavn()})
                .filter(part -> part != null && !part.isBlank())
                .map(String::trim)
                .toList());
        return value.isBlank() ? null : value;
    }

    public record ContactAge(String name, int age) {
    }
}
