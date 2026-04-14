package io.ltj.nyfirmasjekk.api.v1;

import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import io.ltj.nyfirmasjekk.brreg.RollerResponse;
import io.ltj.nyfirmasjekk.companycheck.CheckFinding;
import io.ltj.nyfirmasjekk.companycheck.CompanyCheck;
import io.ltj.nyfirmasjekk.companycheck.CompanyFacts;
import io.ltj.nyfirmasjekk.companycheck.TrafficLight;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Stream;

@Component
public class CompanyApiV1Mapper {

    public CompanySummary toSummary(CompanyCheck companyCheck, EnhetResponse enhet) {
        CompanyFacts facts = companyCheck.fakta();
        return new CompanySummary(
                companyCheck.organisasjonsnummer(),
                companyCheck.navn(),
                organizationFormCode(enhet, facts),
                facts.registreringsdato(),
                municipality(enhet),
                county(enhet),
                naceCode(enhet),
                naceDescription(enhet),
                toScoreColor(companyCheck.status()),
                scoreReasons(companyCheck),
                flags(enhet, facts)
        );
    }

    public CompanyDetails toDetails(CompanyCheck companyCheck, EnhetResponse enhet, RollerResponse roller) {
        CompanyFacts facts = companyCheck.fakta();
        return new CompanyDetails(
                companyCheck.organisasjonsnummer(),
                companyCheck.navn(),
                organizationFormCode(enhet, facts),
                facts.registreringsdato(),
                null,
                status(enhet),
                address(enhet),
                postalCode(enhet),
                postalPlace(enhet),
                municipality(enhet),
                county(enhet),
                naceCode(enhet),
                naceDescription(enhet),
                enhet.hjemmeside(),
                toScore(companyCheck),
                roles(roller),
                announcements(enhet),
                flags(enhet, facts)
        );
    }

    public CompanyScoreResponse toScore(CompanyCheck companyCheck) {
        return new CompanyScoreResponse(
                companyCheck.organisasjonsnummer(),
                toScoreColor(companyCheck.status()),
                scoreLabel(companyCheck.status()),
                scoreReasons(companyCheck),
                rules(companyCheck)
        );
    }

    public CompanySearchResponse toSearchResponse(List<CompanySummary> companies, int page, int size) {
        int safeSize = Math.max(size, 1);
        int safePage = Math.max(page, 0);
        int totalElements = companies.size();
        int fromIndex = Math.min(safePage * safeSize, totalElements);
        int toIndex = Math.min(fromIndex + safeSize, totalElements);
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / safeSize);

        return new CompanySearchResponse(
                safePage,
                safeSize,
                totalElements,
                totalPages,
                companies.subList(fromIndex, toIndex)
        );
    }

    private ScoreColor toScoreColor(TrafficLight light) {
        return ScoreColor.valueOf(light.name());
    }

    private String scoreLabel(TrafficLight light) {
        return switch (light) {
            case GREEN -> "Ser grei ut";
            case YELLOW -> "Vær obs";
            case RED -> "Høy risiko";
        };
    }

    private List<String> scoreReasons(CompanyCheck companyCheck) {
        List<String> reasons = companyCheck.funn().stream()
                .filter(Objects::nonNull)
                .map(CheckFinding::detail)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        return reasons.isEmpty() ? List.of(companyCheck.sammendrag()) : reasons;
    }

    private List<String> rules(CompanyCheck companyCheck) {
        return companyCheck.funn().stream()
                .filter(Objects::nonNull)
                .map(CheckFinding::label)
                .filter(Objects::nonNull)
                .map(this::toRuleName)
                .distinct()
                .toList();
    }

    private String toRuleName(String label) {
        return label.trim()
                .toUpperCase(Locale.ROOT)
                .replace('Æ', 'E')
                .replace('Ø', 'O')
                .replace('Å', 'A')
                .replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
    }

    private List<String> flags(EnhetResponse enhet, CompanyFacts facts) {
        List<String> flags = new ArrayList<>();
        if ("Nytt selskap".equals(facts.modenhet())) {
            flags.add("NEW_COMPANY");
        }
        if (!facts.harKontaktdata()) {
            flags.add("LIMITED_PUBLIC_INFO");
        }
        if (!facts.harRoller()) {
            flags.add("LIMITED_ROLE_INFO");
        }
        if (Boolean.TRUE.equals(enhet.konkurs())) {
            flags.add("BANKRUPTCY_ANNOUNCEMENT");
        }
        if (Boolean.TRUE.equals(enhet.underTvangsavviklingEllerTvangsopplosning())) {
            flags.add("DISSOLUTION_ANNOUNCEMENT");
        }
        if (Boolean.TRUE.equals(enhet.underAvvikling())) {
            flags.add("WINDING_UP");
        }
        return List.copyOf(flags);
    }

    private List<Role> roles(RollerResponse roller) {
        if (roller == null || roller.rollegrupper() == null) {
            return List.of();
        }

        return roller.rollegrupper().stream()
                .filter(Objects::nonNull)
                .flatMap(group -> group.roller() == null ? Stream.empty() : group.roller().stream())
                .filter(this::isActiveRole)
                .map(this::toRole)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    private Role toRole(RollerResponse.Rolle rolle) {
        String name = roleName(rolle);
        if (name == null || name.isBlank() || rolle.type() == null || rolle.type().beskrivelse() == null) {
            return null;
        }
        return new Role(normalizeRoleType(rolle.type().beskrivelse()), name, null);
    }

    private boolean isActiveRole(RollerResponse.Rolle rolle) {
        return !Boolean.TRUE.equals(rolle.fratraadt()) && !Boolean.TRUE.equals(rolle.avregistrert());
    }

    private String roleName(RollerResponse.Rolle rolle) {
        if (rolle.person() != null && rolle.person().navn() != null) {
            return Stream.of(
                            rolle.person().navn().fornavn(),
                            rolle.person().navn().mellomnavn(),
                            rolle.person().navn().etternavn()
                    )
                    .filter(Objects::nonNull)
                    .filter(value -> !value.isBlank())
                    .reduce((left, right) -> left + " " + right)
                    .orElse(null);
        }
        if (rolle.enhet() != null && rolle.enhet().navn() != null && !rolle.enhet().navn().isEmpty()) {
            return rolle.enhet().navn().getFirst();
        }
        return null;
    }

    private String normalizeRoleType(String description) {
        String normalized = description.toUpperCase(Locale.ROOT);
        if (normalized.contains("DAGLIG")) {
            return "DAGLIG_LEDER";
        }
        if (normalized.contains("STYRELEDER")) {
            return "STYRELEDER";
        }
        if (normalized.contains("STYRE")) {
            return "STYREMEDLEM";
        }
        if (normalized.contains("SIGNATUR")) {
            return "SIGNATUR";
        }
        if (normalized.contains("PROKURA")) {
            return "PROKURA";
        }
        return description.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "_");
    }

    private List<Announcement> announcements(EnhetResponse enhet) {
        List<Announcement> announcements = new ArrayList<>();
        if (Boolean.TRUE.equals(enhet.konkurs())) {
            announcements.add(new Announcement("BANKRUPTCY", "Konkursrelatert signal registrert i åpne data", null, "BRREG"));
        }
        if (Boolean.TRUE.equals(enhet.underTvangsavviklingEllerTvangsopplosning())) {
            announcements.add(new Announcement("DISSOLUTION", "Tvangsoppløsning eller tvangsavvikling registrert i åpne data", null, "BRREG"));
        }
        if (Boolean.TRUE.equals(enhet.underAvvikling())) {
            announcements.add(new Announcement("WINDING_UP", "Avvikling registrert i åpne data", null, "BRREG"));
        }
        return List.copyOf(announcements);
    }

    private String organizationFormCode(EnhetResponse enhet, CompanyFacts facts) {
        if (enhet.organisasjonsform() != null && enhet.organisasjonsform().kode() != null) {
            return enhet.organisasjonsform().kode();
        }
        return facts.organisasjonsform();
    }

    private String naceCode(EnhetResponse enhet) {
        return enhet.naeringskode1() == null ? null : enhet.naeringskode1().kode();
    }

    private String naceDescription(EnhetResponse enhet) {
        return enhet.naeringskode1() == null ? null : enhet.naeringskode1().beskrivelse();
    }

    private String municipality(EnhetResponse enhet) {
        EnhetResponse.Adresse address = preferredAddress(enhet);
        return address == null ? null : address.kommune();
    }

    private String county(EnhetResponse enhet) {
        EnhetResponse.Adresse address = preferredAddress(enhet);
        return address == null ? null : address.fylke();
    }

    private String address(EnhetResponse enhet) {
        EnhetResponse.Adresse address = preferredAddress(enhet);
        if (address == null || address.adresse() == null || address.adresse().isEmpty()) {
            return null;
        }
        return String.join(", ", address.adresse());
    }

    private String postalCode(EnhetResponse enhet) {
        EnhetResponse.Adresse address = preferredAddress(enhet);
        return address == null ? null : address.postnummer();
    }

    private String postalPlace(EnhetResponse enhet) {
        EnhetResponse.Adresse address = preferredAddress(enhet);
        return address == null ? null : address.poststed();
    }

    private String status(EnhetResponse enhet) {
        if (Boolean.TRUE.equals(enhet.konkurs())) {
            return "BANKRUPTCY";
        }
        if (Boolean.TRUE.equals(enhet.underTvangsavviklingEllerTvangsopplosning())) {
            return "FORCED_DISSOLUTION";
        }
        if (Boolean.TRUE.equals(enhet.underAvvikling())) {
            return "WINDING_UP";
        }
        return "ACTIVE";
    }

    private EnhetResponse.Adresse preferredAddress(EnhetResponse enhet) {
        return enhet.forretningsadresse() != null ? enhet.forretningsadresse() : enhet.postadresse();
    }
}
