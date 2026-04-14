package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.brreg.BrregClient;
import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import io.ltj.nyfirmasjekk.brreg.RollerResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;

@Service
public class CompanyCheckService {

    private static final List<String> CENTRAL_ORG_FORMS = List.of("AS", "ASA", "SA");
    private static final String ROLE_LABEL = "Roller";

    private final BrregClient brregClient;
    private final Clock clock;

    @Autowired
    public CompanyCheckService(BrregClient brregClient) {
        this(brregClient, Clock.systemDefaultZone());
    }

    CompanyCheckService(BrregClient brregClient, Clock clock) {
        this.brregClient = brregClient;
        this.clock = clock;
    }

    public List<CompanyCheck> hentNyeAs(int dagerSiden) {
        return sok(new CompanySearchRequest(null, dagerSiden, null, null, null, "AS", 25));
    }

    public List<CompanyCheck> sok(CompanySearchRequest request) {
        var searchResponse = brregClient.sok(byggFilter(request));

        if (searchResponse == null || searchResponse._embedded() == null || searchResponse._embedded().enheter() == null) {
            return List.of();
        }

        return searchResponse._embedded().enheter().stream()
                .filter(Objects::nonNull)
                .filter(enhet -> matcherLokalFiltrering(enhet, request))
                .map(this::vurderFraSok)
                .toList();
    }

    public CompanyCheck vurder(String organisasjonsnummer) {
        var enhet = brregClient.hentEnhet(organisasjonsnummer);
        var roller = brregClient.hentRoller(organisasjonsnummer);
        return vurderEnhet(enhet, roller);
    }

    private CompanyCheck vurderFraSok(EnhetResponse enhet) {
        return vurderEnhet(enhet, brregClient.hentRoller(enhet.organisasjonsnummer()));
    }

    private CompanyCheck vurderEnhet(EnhetResponse enhet, RollerResponse roller) {
        boolean hasRoles = roller != null && (harRolle(roller, "styre") || harRolle(roller, "daglig leder"));
        boolean hasSeriousSignals = isTrue(enhet.konkurs()) || isTrue(enhet.underTvangsavviklingEllerTvangsopplosning()) || isTrue(enhet.underAvvikling());
        List<CheckFinding> funn = new ArrayList<>();
        byggFunn(enhet, roller, hasRoles, hasSeriousSignals, funn);

        var status = funn.stream()
                .map(CheckFinding::severity)
                .max(Comparator.comparingInt(this::severityRank))
                .orElse(TrafficLight.YELLOW);
        int greenCount = (int) funn.stream().filter(f -> f.severity() == TrafficLight.GREEN).count();
        int yellowCount = (int) funn.stream().filter(f -> f.severity() == TrafficLight.YELLOW).count();
        int redCount = (int) funn.stream().filter(f -> f.severity() == TrafficLight.RED).count();

        String organisasjonsformBeskrivelse = hentOrganisasjonsformBeskrivelse(enhet);
        String modenhet = erNyttSelskap(enhet) ? "Nytt selskap" : "Etablert selskap";
        String naeringskode = hentNaeringskodeBeskrivelse(enhet);
        String aktivitet = hentPrimarAktivitet(enhet);
        String dagligLeder = hentRollenavn(roller, "daglig leder");
        List<String> styre = hentRoller(roller, "styre");
        String lokasjon = utledLokasjon(enhet);

        return new CompanyCheck(
                enhet.organisasjonsnummer(),
                enhet.navn(),
                organisasjonsformBeskrivelse,
                status,
                lagSammendrag(status, funn),
                new CompanyFacts(
                        organisasjonsformBeskrivelse,
                        enhet.registreringsdatoEnhetsregisteret(),
                        modenhet,
                        naeringskode,
                        aktivitet,
                        dagligLeder,
                        styre,
                        enhet.hjemmeside(),
                        enhet.epostadresse(),
                        førsteIkkeTom(enhet.telefon(), enhet.mobil()),
                        harKontaktdata(enhet),
                        hasRoles,
                        hasSeriousSignals,
                        lokasjon
                ),
                new CompanyMetrics(greenCount, yellowCount, redCount),
                List.copyOf(funn),
                List.of(
                        "https://data.brreg.no/enhetsregisteret/api/enheter/{organisasjonsnummer}",
                        "https://data.brreg.no/enhetsregisteret/api/enheter/{organisasjonsnummer}/roller"
                ),
                List.of(
                        "Denne førsteversjonen bruker bare åpne data fra Enhetsregisteret.",
                        "Signatur/prokura, reelle rettighetshavere, kunngjøringer og oppdateringsstrømmer er ikke vurdert ennå.",
                        "Rød status dekker foreløpig bare alvorlige signaler som faktisk finnes i de åpne feltene vi leser."
                )
        );
    }

    private void byggFunn(
            EnhetResponse enhet,
            RollerResponse roller,
            boolean hasRoles,
            boolean hasSeriousSignals,
            List<CheckFinding> funn
    ) {
        funn.add(new CheckFinding(TrafficLight.GREEN, "Organisasjonsnummer", "Virksomheten finnes i Enhetsregisteret."));
        leggTilRegistreringsfunn(enhet, funn);
        leggTilAlvorligeSignalFunn(hasSeriousSignals, funn);
        leggTilKontaktfunn(enhet, funn);
        leggTilTelefonfunn(enhet, funn);
        leggTilNaeringskodefunn(enhet, funn);
        leggTilAktivitetsfunn(enhet, funn);
        leggTilRollefunn(enhet, roller, hasRoles, funn);
        leggTilAldersfunn(enhet, funn);
        leggTilDatakvalitetsfunn(enhet, funn);
    }

    private void leggTilRegistreringsfunn(EnhetResponse enhet, List<CheckFinding> funn) {
        if (enhet.registreringsdatoEnhetsregisteret() != null) {
            funn.add(new CheckFinding(
                    TrafficLight.GREEN,
                    "Registrering",
                    "Registrert i Enhetsregisteret " + enhet.registreringsdatoEnhetsregisteret() + "."
            ));
        }
    }

    private void leggTilAlvorligeSignalFunn(boolean hasSeriousSignals, List<CheckFinding> funn) {
        if (hasSeriousSignals) {
            funn.add(new CheckFinding(
                    TrafficLight.RED,
                    "Alvorlige registreringssignaler",
                    "Enheten er merket med konkurs, avvikling eller tvangsoppløsning i åpne BRREG-data."
            ));
        }
    }

    private void leggTilKontaktfunn(EnhetResponse enhet, List<CheckFinding> funn) {
        if (harKontaktdata(enhet)) {
            funn.add(new CheckFinding(TrafficLight.GREEN, "Kontaktdata", "Nettside eller e-post er registrert."));
            return;
        }
        funn.add(new CheckFinding(TrafficLight.YELLOW, "Kontaktdata", "Nettside og e-post mangler i åpne data."));
    }

    private void leggTilTelefonfunn(EnhetResponse enhet, List<CheckFinding> funn) {
        if (harTelefondata(enhet)) {
            funn.add(new CheckFinding(TrafficLight.GREEN, "Telefon", "Telefon eller mobil er registrert."));
            return;
        }
        funn.add(new CheckFinding(TrafficLight.YELLOW, "Telefon", "Telefon og mobil mangler i åpne data."));
    }

    private void leggTilNaeringskodefunn(EnhetResponse enhet, List<CheckFinding> funn) {
        if (harNaeringskode(enhet)) {
            funn.add(new CheckFinding(
                    TrafficLight.GREEN,
                    "Næringskode",
                    "Næringskode " + enhet.naeringskode1().kode() + " er registrert."
            ));
            return;
        }
        funn.add(new CheckFinding(TrafficLight.YELLOW, "Næringskode", "Næringskode mangler eller er uklar."));
    }

    private void leggTilAktivitetsfunn(EnhetResponse enhet, List<CheckFinding> funn) {
        if (harAktivitet(enhet)) {
            funn.add(new CheckFinding(TrafficLight.GREEN, "Aktivitet", "Virksomhetsaktivitet er beskrevet i registeret."));
            return;
        }
        funn.add(new CheckFinding(TrafficLight.YELLOW, "Aktivitet", "Aktivitetsbeskrivelse mangler i åpne data."));
    }

    private void leggTilRollefunn(EnhetResponse enhet, RollerResponse roller, boolean hasRoles, List<CheckFinding> funn) {
        if (roller != null) {
            funn.add(vurderRoller(enhet, hasRoles));
            return;
        }
        funn.add(new CheckFinding(TrafficLight.YELLOW, ROLE_LABEL, "Rolledata ikke sjekket i listevisning."));
    }

    private void leggTilAldersfunn(EnhetResponse enhet, List<CheckFinding> funn) {
        if (erNyttSelskap(enhet)) {
            funn.add(new CheckFinding(TrafficLight.YELLOW, "Alder", "Selskapet er nylig registrert og har begrenset historikk."));
        }
    }

    private void leggTilDatakvalitetsfunn(EnhetResponse enhet, List<CheckFinding> funn) {
        if (harFaaBasisopplysninger(enhet)) {
            funn.add(new CheckFinding(TrafficLight.YELLOW, "Datakvalitet", "Det finnes få basisopplysninger i åpne data."));
            return;
        }
        funn.add(new CheckFinding(TrafficLight.GREEN, "Datakvalitet", "Basisdata ser forholdsvis komplette ut."));
    }

    private String utledLokasjon(EnhetResponse enhet) {
        if (enhet.forretningsadresse() != null) {
            return formatAdresse(enhet.forretningsadresse());
        }
        if (enhet.postadresse() != null) {
            return formatAdresse(enhet.postadresse());
        }
        return "Ukjent lokasjon";
    }

    private String formatAdresse(EnhetResponse.Adresse adresse) {
        if (hasText(adresse.poststed()) && hasText(adresse.kommune())) {
            return adresse.poststed() + " (" + adresse.kommune() + ")";
        }
        return Objects.requireNonNullElse(adresse.poststed(), "Ukjent sted");
    }

    private CheckFinding vurderRoller(EnhetResponse enhet, boolean hasRoles) {
        boolean centralForm = erSentralOrganisasjonsform(enhet);

        if (hasRoles) {
            return new CheckFinding(TrafficLight.GREEN, ROLE_LABEL, "Styre eller daglig leder er registrert.");
        }

        if (centralForm) {
            return new CheckFinding(TrafficLight.RED, ROLE_LABEL, "Fant ikke styre eller daglig leder for en selskapsform som normalt bør ha det.");
        }

        return new CheckFinding(TrafficLight.YELLOW, ROLE_LABEL, "Fant ikke styre eller daglig leder i åpne rolledata.");
    }

    private boolean harRolle(RollerResponse roller, String needle) {
        return !hentRoller(roller, needle).isEmpty();
    }

    private List<String> hentRoller(RollerResponse roller, String needle) {
        if (roller == null || roller.rollegrupper() == null) {
            return List.of();
        }

        return roller.rollegrupper().stream()
                .filter(Objects::nonNull)
                .flatMap(gruppe -> gruppe.roller() == null ? Stream.empty() : gruppe.roller().stream())
                .filter(this::erAktivRolle)
                .filter(rolle -> rolleMatcher(rolle, needle))
                .map(this::rollenavn)
                .filter(this::hasText)
                .distinct()
                .toList();
    }

    private boolean harKontaktdata(EnhetResponse enhet) {
        return hasText(enhet.hjemmeside()) || hasText(enhet.epostadresse());
    }

    private boolean harTelefondata(EnhetResponse enhet) {
        return hasText(enhet.telefon()) || hasText(enhet.mobil());
    }

    private boolean harNaeringskode(EnhetResponse enhet) {
        return enhet.naeringskode1() != null && hasText(enhet.naeringskode1().kode()) && hasText(enhet.naeringskode1().beskrivelse());
    }

    private boolean harAktivitet(EnhetResponse enhet) {
        return enhet.aktivitet() != null && enhet.aktivitet().stream().anyMatch(this::hasText);
    }

    private boolean erNyttSelskap(EnhetResponse enhet) {
        if (enhet.registreringsdatoEnhetsregisteret() == null) {
            return false;
        }
        long dager = ChronoUnit.DAYS.between(enhet.registreringsdatoEnhetsregisteret(), LocalDate.now(clock));
        return dager <= 180;
    }

    private boolean harFaaBasisopplysninger(EnhetResponse enhet) {
        int antall = 0;
        antall += hasText(enhet.navn()) ? 1 : 0;
        antall += enhet.organisasjonsform() != null && hasText(enhet.organisasjonsform().kode()) ? 1 : 0;
        antall += hasText(enhet.hjemmeside()) ? 1 : 0;
        antall += hasText(enhet.epostadresse()) ? 1 : 0;
        antall += hasText(enhet.telefon()) ? 1 : 0;
        antall += hasText(enhet.mobil()) ? 1 : 0;
        antall += harNaeringskode(enhet) ? 1 : 0;
        antall += harAktivitet(enhet) ? 1 : 0;
        antall += enhet.registreringsdatoEnhetsregisteret() != null ? 1 : 0;
        return antall < 5;
    }

    private boolean erSentralOrganisasjonsform(EnhetResponse enhet) {
        return enhet.organisasjonsform() != null && CENTRAL_ORG_FORMS.contains(enhet.organisasjonsform().kode());
    }

    private String hentOrganisasjonsformBeskrivelse(EnhetResponse enhet) {
        if (enhet.organisasjonsform() == null) {
            return null;
        }
        return enhet.organisasjonsform().beskrivelse();
    }

    private String hentNaeringskodeBeskrivelse(EnhetResponse enhet) {
        if (!harNaeringskode(enhet)) {
            return null;
        }
        return enhet.naeringskode1().kode() + " - " + enhet.naeringskode1().beskrivelse();
    }

    private String hentPrimarAktivitet(EnhetResponse enhet) {
        if (!harAktivitet(enhet)) {
            return null;
        }
        return enhet.aktivitet().getFirst();
    }

    private String hentRollenavn(RollerResponse roller, String needle) {
        return hentRoller(roller, needle).stream()
                .findFirst()
                .orElse(null);
    }

    private String lagSammendrag(TrafficLight status, List<CheckFinding> funn) {
        long red = funn.stream().filter(f -> f.severity() == TrafficLight.RED).count();
        long yellow = funn.stream().filter(f -> f.severity() == TrafficLight.YELLOW).count();

        return switch (status) {
            case GREEN -> "Grønn førstelesning for B2B-samarbeid basert på åpne basisdata fra BRREG.";
            case YELLOW -> "Gul førstelesning: selskapet er nytt, tynt registrert eller har flere mangler i åpne data.";
            case RED -> "Rød førstelesning: åpne data viser minst ett alvorlig signal som bør undersøkes før samarbeid.";
        } + " Funn: " + red + " røde, " + yellow + " gule.";
    }

    private int severityRank(TrafficLight status) {
        return switch (status) {
            case GREEN -> 1;
            case YELLOW -> 2;
            case RED -> 3;
        };
    }

    private boolean isTrue(Boolean value) {
        return Boolean.TRUE.equals(value);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String førsteIkkeTom(String... values) {
        for (String value : values) {
            if (hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private Map<String, String> byggFilter(CompanySearchRequest request) {
        Map<String, String> filter = new HashMap<>();
        int requestedSize = request.resultSize() > 0 ? request.resultSize() : 25;
        filter.put("size", String.valueOf(Math.min(requestedSize, 100)));

        if (request.dager() > 0) {
            filter.put("fraRegistreringsdatoEnhetsregisteret", LocalDate.now(clock).minusDays(request.dager()).toString());
        }
        if (hasText(request.navn())) {
            filter.put("navn", request.navn().trim());
            filter.put("navnMetodeForSoek", "FORTLOEPENDE");
        }
        if (hasText(request.organisasjonsform())) {
            filter.put("organisasjonsform.kode", request.organisasjonsform().trim().toUpperCase(Locale.ROOT));
        }
        if (hasText(request.kommune())) {
            filter.put("forretningsadresse.kommune", request.kommune().trim().toUpperCase(Locale.ROOT));
        }
        if (hasText(request.naeringskode())) {
            filter.put("naeringskode1.kode", request.naeringskode().trim());
        }

        return filter;
    }

    private boolean matcherLokalFiltrering(EnhetResponse enhet, CompanySearchRequest request) {
        return !hasText(request.fylke()) || matcherFylke(enhet, request.fylke());
    }

    private boolean matcherFylke(EnhetResponse enhet, String fylke) {
        String normalized = fylke.trim().toUpperCase(Locale.ROOT);
        return Stream.of(enhet.forretningsadresse(), enhet.postadresse())
                .filter(Objects::nonNull)
                .map(EnhetResponse.Adresse::fylke)
                .filter(this::hasText)
                .map(value -> value.toUpperCase(Locale.ROOT))
                .anyMatch(normalized::equals);
    }

    private boolean erAktivRolle(RollerResponse.Rolle rolle) {
        return !Boolean.TRUE.equals(rolle.fratraadt()) && !Boolean.TRUE.equals(rolle.avregistrert());
    }

    private boolean rolleMatcher(RollerResponse.Rolle rolle, String needle) {
        return rolle.type() != null
                && hasText(rolle.type().beskrivelse())
                && rolle.type().beskrivelse().toLowerCase(Locale.ROOT).contains(needle);
    }

    private String rollenavn(RollerResponse.Rolle rolle) {
        if (rolle.person() != null && rolle.person().navn() != null) {
            return joinNonBlank(
                    rolle.person().navn().fornavn(),
                    rolle.person().navn().mellomnavn(),
                    rolle.person().navn().etternavn()
            );
        }
        if (rolle.enhet() != null && rolle.enhet().navn() != null && !rolle.enhet().navn().isEmpty()) {
            return rolle.enhet().navn().getFirst();
        }
        return null;
    }

    private String joinNonBlank(String... parts) {
        return Stream.of(parts)
                .filter(this::hasText)
                .reduce((left, right) -> left + " " + right)
                .orElse(null);
    }
}
