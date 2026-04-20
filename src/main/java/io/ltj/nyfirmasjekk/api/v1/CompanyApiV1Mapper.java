package io.ltj.nyfirmasjekk.api.v1;

import io.ltj.nyfirmasjekk.announcements.AnnouncementService;
import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import io.ltj.nyfirmasjekk.brreg.RollerResponse;
import io.ltj.nyfirmasjekk.companycheck.OrganizationFormCatalog;
import io.ltj.nyfirmasjekk.companycheck.CheckFinding;
import io.ltj.nyfirmasjekk.companycheck.CompanyCheck;
import io.ltj.nyfirmasjekk.companycheck.CompanyFacts;
import io.ltj.nyfirmasjekk.companycheck.TrafficLight;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;

@Component
public class CompanyApiV1Mapper {

    private final AnnouncementService announcementService;

    public CompanyApiV1Mapper(AnnouncementService announcementService) {
        this.announcementService = announcementService;
    }

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
                enhet.hjemmeside(),
                enhet.epostadresse(),
                firstNonBlank(enhet.telefon(), enhet.mobil()),
                preferredSummaryContactName(facts),
                preferredSummaryContactRole(facts),
                enhet.registrertIMvaregisteret(),
                enhet.registrertIForetaksregisteret(),
                toScoreColor(companyCheck.status()),
                scoreReasons(companyCheck),
                summaryEvents(enhet),
                flags(enhet, facts)
        );
    }

    public CompanyDetails toDetails(CompanyCheck companyCheck, EnhetResponse enhet, RollerResponse roller) {
        CompanyFacts facts = companyCheck.fakta();
        Role contactPerson = preferredContactRole(roller);
        List<CompanyEvent> events = events(enhet);
        return new CompanyDetails(
                companyCheck.organisasjonsnummer(),
                companyCheck.navn(),
                organizationFormCode(enhet, facts),
                facts.registreringsdato(),
                facts.stiftelsesdato(),
                status(enhet),
                address(enhet),
                postalCode(enhet),
                postalPlace(enhet),
                municipality(enhet),
                county(enhet),
                naceCode(enhet),
                naceDescription(enhet),
                enhet.hjemmeside(),
                enhet.epostadresse(),
                firstNonBlank(enhet.telefon(), enhet.mobil()),
                contactPerson == null ? null : contactPerson.name(),
                contactPerson == null ? null : contactPerson.type(),
                enhet.registrertIMvaregisteret(),
                enhet.registrertIForetaksregisteret(),
                enhet.antallAnsatte(),
                enhet.harRegistrertAntallAnsatte(),
                enhet.sisteInnsendteAarsregnskap(),
                toScore(companyCheck, enhet, events),
                roles(roller),
                events,
                announcements(enhet),
                flags(enhet, facts)
        );
    }

    public CompanyScoreResponse toScore(CompanyCheck companyCheck) {
        return toScore(companyCheck, null, List.of());
    }

    private CompanyScoreResponse toScore(CompanyCheck companyCheck, EnhetResponse enhet, List<CompanyEvent> events) {
        return new CompanyScoreResponse(
                companyCheck.organisasjonsnummer(),
                toScoreColor(companyCheck.status()),
                scoreLabel(companyCheck.status()),
                scoreReasons(companyCheck),
                rules(companyCheck),
                scoreEvidence(companyCheck, enhet, events)
        );
    }

    public CompanySearchResponse toSearchResponse(List<CompanySummary> companies, int page, int size, long totalElements, int totalPages) {
        return new CompanySearchResponse(
                Math.max(page, 0),
                Math.max(size, 1),
                totalElements,
                totalPages,
                companies
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

    private List<ScoreEvidence> scoreEvidence(CompanyCheck companyCheck, EnhetResponse enhet, List<CompanyEvent> events) {
        Map<String, ScoreEvidence> evidence = new LinkedHashMap<>();

        companyCheck.funn().stream()
                .filter(Objects::nonNull)
                .forEach(finding -> {
                    String label = finding.label();
                    String detail = finding.detail();
                    if (label == null || detail == null || detail.isBlank()) {
                        return;
                    }
                    evidence.putIfAbsent(label, new ScoreEvidence(label, normalizeFindingDetail(label, detail), sourceForFinding(label)));
                });

        if (events.stream().anyMatch(event -> "BANKRUPTCY".equals(event.type()))) {
            evidence.putIfAbsent("Konkurs registrert",
                    new ScoreEvidence("Konkurs registrert", "Åpne registerdata viser konkursrelatert hendelse for virksomheten.", "BRREG kunngjøringer"));
        }
        if (events.stream().anyMatch(event -> "DISSOLUTION".equals(event.type()))) {
            evidence.putIfAbsent("Tvangsoppløsning registrert",
                    new ScoreEvidence("Tvangsoppløsning registrert", "Åpne registerdata viser tvangsoppløsning eller tvangsavvikling.", "BRREG kunngjøringer"));
        }
        if (events.stream().anyMatch(event -> "WINDING_UP".equals(event.type()))) {
            evidence.putIfAbsent("Avvikling registrert",
                    new ScoreEvidence("Avvikling registrert", "Virksomheten står som under avvikling i åpne registerspor.", "BRREG / kunngjøringer"));
        }
        if (enhet != null && enhet.registreringsdatoEnhetsregisteret() != null) {
            evidence.putIfAbsent("Nyregistrert selskap",
                    new ScoreEvidence("Nyregistrert selskap",
                            "Virksomheten ble registrert %s.".formatted(enhet.registreringsdatoEnhetsregisteret()),
                            "BRREG Enhetsregisteret"));
        }
        if (enhet != null && !hasText(enhet.hjemmeside())) {
            evidence.putIfAbsent("Ingen registrert nettside",
                    new ScoreEvidence("Ingen registrert nettside", "Det finnes ingen registrert nettside i åpne BRREG-data.", "BRREG grunndata"));
        }
        if (enhet != null && !hasText(enhet.epostadresse())) {
            evidence.putIfAbsent("Ingen registrert e-post",
                    new ScoreEvidence("Ingen registrert e-post", "Det finnes ingen registrert e-postadresse i åpne BRREG-data.", "BRREG grunndata"));
        }
        if (enhet != null && !hasText(firstNonBlank(enhet.telefon(), enhet.mobil()))) {
            evidence.putIfAbsent("Ingen registrert telefon",
                    new ScoreEvidence("Ingen registrert telefon", "Det finnes ingen registrert telefon i åpne BRREG-data.", "BRREG grunndata"));
        }
        if (enhet != null && Boolean.FALSE.equals(enhet.registrertIForetaksregisteret())) {
            evidence.putIfAbsent("Ikke i Foretaksregisteret",
                    new ScoreEvidence("Ikke i Foretaksregisteret", "Virksomheten er ikke registrert i Foretaksregisteret.", "BRREG registerstatus"));
        }
        if (enhet != null && Boolean.FALSE.equals(enhet.registrertIMvaregisteret())) {
            evidence.putIfAbsent("Ikke MVA-registrert",
                    new ScoreEvidence("Ikke MVA-registrert", "Virksomheten er ikke registrert i Merverdiavgiftsregisteret.", "BRREG registerstatus"));
        }
        if (enhet != null && enhet.naeringskode1() == null) {
            evidence.putIfAbsent("Manglende næringskode",
                    new ScoreEvidence("Manglende næringskode", "Åpne data viser ikke en tydelig næringskode for virksomheten.", "BRREG grunndata"));
        }

        return evidence.values().stream().limit(6).toList();
    }

    private String sourceForFinding(String label) {
        String normalized = label == null ? "" : label.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "ALVORLIGE SIGNALER", "AVVIKLING" -> "BRREG / kunngjøringer";
            case "ROLLER" -> "BRREG roller";
            case "AKTØRRISIKO", "AKTORRISIKO" -> "Intern nettverksvurdering";
            case "ALDER" -> "BRREG Enhetsregisteret";
            case "STRUKTUR", "ORGANISASJONSNUMMER" -> "BRREG grunndata";
            default -> "Scoremodell";
        };
    }

    private String normalizeFindingDetail(String label, String detail) {
        if ("OK".equalsIgnoreCase(detail)) {
            return switch (label == null ? "" : label.trim().toUpperCase(Locale.ROOT)) {
                case "ORGANISASJONSNUMMER" -> "Virksomheten finnes i Enhetsregisteret.";
                default -> "Registersporet ser ryddig ut.";
            };
        }
        if ("Registrert.".equalsIgnoreCase(detail)) {
            return "Sentrale roller er registrert i åpne rolledata.";
        }
        if ("Mangler ledelse.".equalsIgnoreCase(detail)) {
            return "Sentrale roller eller ledelse er ikke synlige i åpne rolledata.";
        }
        if ("Historikk hos tilknyttede personer.".equalsIgnoreCase(detail)) {
            return "Tilknyttede rolleholdere har historikk som påvirker vurderingen.";
        }
        if ("Nytt selskap.".equalsIgnoreCase(detail)) {
            return "Virksomheten er nylig registrert og har begrenset historikk.";
        }
        if ("Konkurs eller tvangsoppløsning.".equalsIgnoreCase(detail)) {
            return "Åpne registerdata viser alvorlige strukturelle signaler som konkurs eller tvangsoppløsning.";
        }
        if ("Selskapet er under oppløsning.".equalsIgnoreCase(detail)) {
            return "Virksomheten er registrert som under avvikling eller oppløsning.";
        }
        if ("Fisjon/Fusjon.".equalsIgnoreCase(detail)) {
            return "Det finnes signaler om fisjon eller fusjon i registergrunnlaget.";
        }
        return detail;
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
        if (Boolean.FALSE.equals(facts.registrertIMvaregisteret())) {
            flags.add("NOT_VAT_REGISTERED");
        }
        if (Boolean.FALSE.equals(facts.registrertIForetaksregisteret()) && shouldExpectBusinessRegistry(facts.organisasjonsform())) {
            flags.add("NOT_REGISTERED_IN_FORETAKSREGISTERET");
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

    private boolean shouldExpectBusinessRegistry(String organizationForm) {
        String normalized = OrganizationFormCatalog.normalizeCode(organizationForm);
        if (normalized == null) {
            return false;
        }
        return switch (normalized.toUpperCase(Locale.ROOT)) {
            case "AS", "ASA", "ANS", "DA", "NUF", "SA", "SE", "KS" -> true;
            default -> false;
        };
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

    private Role preferredContactRole(RollerResponse roller) {
        List<Role> activeRoles = roles(roller);
        return activeRoles.stream()
                .filter(role -> "DAGLIG_LEDER".equals(role.type()))
                .findFirst()
                .or(() -> activeRoles.stream().filter(role -> "STYRELEDER".equals(role.type())).findFirst())
                .or(() -> activeRoles.stream().findFirst())
                .orElse(null);
    }

    private String preferredSummaryContactName(CompanyFacts facts) {
        if (facts == null) {
            return null;
        }
        if (facts.dagligLeder() != null && !facts.dagligLeder().isBlank()) {
            return facts.dagligLeder();
        }
        if (facts.styre() != null) {
            return facts.styre().stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(value -> !value.isBlank())
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }

    private String preferredSummaryContactRole(CompanyFacts facts) {
        if (facts == null) {
            return null;
        }
        if (facts.dagligLeder() != null && !facts.dagligLeder().isBlank()) {
            return "DAGLIG_LEDER";
        }
        if (facts.styre() != null && facts.styre().stream().anyMatch(Objects::nonNull)) {
            return "STYREMEDLEM";
        }
        return null;
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

    private String firstNonBlank(String... values) {
        return Stream.of(values)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .findFirst()
                .orElse(null);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private List<Announcement> announcements(EnhetResponse enhet) {
        return announcementService.announcementsFor(enhet);
    }

    public List<CompanyEvent> toEvents(EnhetResponse enhet) {
        return events(enhet);
    }

    private List<CompanyEvent> events(EnhetResponse enhet) {
        if (enhet == null) {
            return List.of();
        }

        Map<String, CompanyEvent> events = new LinkedHashMap<>();
        addRegistrationEvent(events, enhet);
        announcements(enhet).stream()
                .map(this::toEvent)
                .filter(Objects::nonNull)
                .forEach(event -> events.putIfAbsent(eventKey(event), event));

        return events.values().stream()
                .sorted(Comparator
                        .comparing(this::parseEventDate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(this::severityRank)
                .thenComparing(CompanyEvent::title, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private List<CompanyEvent> summaryEvents(EnhetResponse enhet) {
        if (enhet == null) {
            return List.of();
        }

        List<CompanyEvent> events = new ArrayList<>();
        if (enhet.registreringsdatoEnhetsregisteret() != null) {
            events.add(new CompanyEvent(
                    "REGISTRATION",
                    "Nyregistrert",
                    enhet.registreringsdatoEnhetsregisteret().toString(),
                    "BRREG Enhetsregisteret",
                    "INFO"
            ));
        }
        if (Boolean.TRUE.equals(enhet.konkurs())) {
            events.add(new CompanyEvent(
                    "BANKRUPTCY",
                    "Konkurs",
                    null,
                    "BRREG",
                    "HIGH"
            ));
        }
        if (Boolean.TRUE.equals(enhet.underTvangsavviklingEllerTvangsopplosning())) {
            events.add(new CompanyEvent(
                    "DISSOLUTION",
                    "Tvangsoppløsning",
                    null,
                    "BRREG",
                    "HIGH"
            ));
        }
        if (Boolean.TRUE.equals(enhet.underAvvikling())) {
            events.add(new CompanyEvent(
                    "WINDING_UP",
                    "Avvikling",
                    null,
                    "BRREG",
                    "MEDIUM"
            ));
        }

        return events.stream()
                .sorted(Comparator
                        .comparing(this::severityRank)
                        .thenComparing(this::parseEventDate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(CompanyEvent::title, String.CASE_INSENSITIVE_ORDER))
                .limit(3)
                .toList();
    }

    private void addRegistrationEvent(Map<String, CompanyEvent> events, EnhetResponse enhet) {
        if (enhet.registreringsdatoEnhetsregisteret() == null) {
            return;
        }
        CompanyEvent event = new CompanyEvent(
                "REGISTRATION",
                "Nyregistrering i Enhetsregisteret",
                enhet.registreringsdatoEnhetsregisteret().toString(),
                "BRREG Enhetsregisteret",
                "INFO"
        );
        events.putIfAbsent(eventKey(event), event);
    }

    private CompanyEvent toEvent(Announcement announcement) {
        return switch (announcement.type()) {
            case "BANKRUPTCY" -> new CompanyEvent("BANKRUPTCY", announcement.title(), announcement.date(), announcement.source(), "HIGH");
            case "DISSOLUTION" -> new CompanyEvent("DISSOLUTION", announcement.title(), announcement.date(), announcement.source(), "HIGH");
            case "WINDING_UP" -> new CompanyEvent("WINDING_UP", announcement.title(), announcement.date(), announcement.source(), "MEDIUM");
            case "ADDRESS_CHANGE" -> new CompanyEvent("ADDRESS_CHANGE", announcement.title(), announcement.date(), announcement.source(), "INFO");
            case "ARTICLES_OF_ASSOCIATION" -> new CompanyEvent("ARTICLES_OF_ASSOCIATION", announcement.title(), announcement.date(), announcement.source(), "INFO");
            case "REGISTRATION" -> new CompanyEvent("REGISTRATION", announcement.title(), announcement.date(), announcement.source(), "INFO");
            default -> null;
        };
    }

    private String eventKey(CompanyEvent event) {
        return "%s|%s|%s".formatted(event.type(), Objects.toString(event.date(), ""), event.title());
    }

    private LocalDate parseEventDate(CompanyEvent event) {
        if (event.date() == null || event.date().isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(event.date());
        } catch (DateTimeParseException ignored) {
            try {
                return LocalDate.parse(event.date(), DateTimeFormatter.ofPattern("dd.MM.yyyy"));
            } catch (DateTimeParseException ignoredAgain) {
                return null;
            }
        }
    }

    private int severityRank(CompanyEvent event) {
        return switch (event.severity()) {
            case "HIGH" -> 0;
            case "MEDIUM" -> 1;
            default -> 2;
        };
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
