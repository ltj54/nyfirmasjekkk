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
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
public class CompanyCheckService {

    private static final List<String> CENTRAL_ORG_FORMS = List.of("AS", "ASA", "SA");

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

    public List<CompanyCheck> hentNyeAS(int dagerSiden) {
        LocalDate fraDato = LocalDate.now(clock).minusDays(dagerSiden);
        var searchResponse = brregClient.sokEtterNyeAS(fraDato);

        if (searchResponse == null || searchResponse._embedded() == null) {
            return List.of();
        }

        return searchResponse._embedded().enheter().stream()
                .map(enhet -> vurderEnhet(enhet, null))
                .toList();
    }

    public CompanyCheck vurder(String organisasjonsnummer) {
        var enhet = brregClient.hentEnhet(organisasjonsnummer);
        var roller = brregClient.hentRoller(organisasjonsnummer);
        return vurderEnhet(enhet, roller);
    }

    private CompanyCheck vurderEnhet(EnhetResponse enhet, RollerResponse roller) {
        boolean hasRoles = roller != null && (harRolle(roller, "styre") || harRolle(roller, "daglig leder"));
        boolean hasSeriousSignals = isTrue(enhet.konkurs()) || isTrue(enhet.underTvangsavviklingEllerTvangsopplosning()) || isTrue(enhet.underAvvikling());

        List<CheckFinding> funn = new ArrayList<>();
        funn.add(new CheckFinding(TrafficLight.GREEN, "Organisasjonsnummer", "Virksomheten finnes i Enhetsregisteret."));

        if (enhet.registreringsdatoEnhetsregisteret() != null) {
            funn.add(new CheckFinding(
                    TrafficLight.GREEN,
                    "Registrering",
                    "Registrert i Enhetsregisteret " + enhet.registreringsdatoEnhetsregisteret() + "."
            ));
        }

        if (hasSeriousSignals) {
            funn.add(new CheckFinding(
                    TrafficLight.RED,
                    "Alvorlige registreringssignaler",
                    "Enheten er merket med konkurs, avvikling eller tvangsoppløsning i åpne BRREG-data."
            ));
        }

        if (harKontaktdata(enhet)) {
            funn.add(new CheckFinding(TrafficLight.GREEN, "Kontaktdata", "Nettside eller e-post er registrert."));
        } else {
            funn.add(new CheckFinding(TrafficLight.YELLOW, "Kontaktdata", "Nettside og e-post mangler i åpne data."));
        }

        if (harTelefondata(enhet)) {
            funn.add(new CheckFinding(TrafficLight.GREEN, "Telefon", "Telefon eller mobil er registrert."));
        } else {
            funn.add(new CheckFinding(TrafficLight.YELLOW, "Telefon", "Telefon og mobil mangler i åpne data."));
        }

        if (harNaeringskode(enhet)) {
            funn.add(new CheckFinding(
                    TrafficLight.GREEN,
                    "Næringskode",
                    "Næringskode " + enhet.naeringskode1().kode() + " er registrert."
            ));
        } else {
            funn.add(new CheckFinding(TrafficLight.YELLOW, "Næringskode", "Næringskode mangler eller er uklar."));
        }

        if (harAktivitet(enhet)) {
            funn.add(new CheckFinding(TrafficLight.GREEN, "Aktivitet", "Virksomhetsaktivitet er beskrevet i registeret."));
        } else {
            funn.add(new CheckFinding(TrafficLight.YELLOW, "Aktivitet", "Aktivitetsbeskrivelse mangler i åpne data."));
        }

        if (roller != null) {
            funn.add(vurderRoller(enhet, hasRoles));
        } else {
            funn.add(new CheckFinding(TrafficLight.YELLOW, "Roller", "Rolledata ikke sjekket i listevisning."));
        }

        if (erNyttSelskap(enhet)) {
            funn.add(new CheckFinding(TrafficLight.YELLOW, "Alder", "Selskapet er nylig registrert og har begrenset historikk."));
        }

        if (harFaaBasisopplysninger(enhet)) {
            funn.add(new CheckFinding(TrafficLight.YELLOW, "Datakvalitet", "Det finnes få basisopplysninger i åpne data."));
        } else {
            funn.add(new CheckFinding(TrafficLight.GREEN, "Datakvalitet", "Basisdata ser forholdsvis komplette ut."));
        }

        var status = funn.stream()
                .map(CheckFinding::severity)
                .max(Comparator.comparingInt(this::severityRank))
                .orElse(TrafficLight.YELLOW);
        int greenCount = (int) funn.stream().filter(f -> f.severity() == TrafficLight.GREEN).count();
        int yellowCount = (int) funn.stream().filter(f -> f.severity() == TrafficLight.YELLOW).count();
        int redCount = (int) funn.stream().filter(f -> f.severity() == TrafficLight.RED).count();

        String lokasjon = utledLokasjon(enhet);

        return new CompanyCheck(
                enhet.organisasjonsnummer(),
                enhet.navn(),
                enhet.organisasjonsform() == null ? null : enhet.organisasjonsform().beskrivelse(),
                status,
                lagSammendrag(status, funn),
                new CompanyFacts(
                        enhet.organisasjonsform() == null ? null : enhet.organisasjonsform().beskrivelse(),
                        enhet.registreringsdatoEnhetsregisteret(),
                        erNyttSelskap(enhet) ? "Nytt selskap" : "Etablert selskap",
                        harNaeringskode(enhet) ? enhet.naeringskode1().kode() + " - " + enhet.naeringskode1().beskrivelse() : null,
                        harAktivitet(enhet) && !enhet.aktivitet().isEmpty() ? enhet.aktivitet().getFirst() : null,
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
            return new CheckFinding(TrafficLight.GREEN, "Roller", "Styre eller daglig leder er registrert.");
        }

        if (centralForm) {
            return new CheckFinding(TrafficLight.RED, "Roller", "Fant ikke styre eller daglig leder for en selskapsform som normalt bør ha det.");
        }

        return new CheckFinding(TrafficLight.YELLOW, "Roller", "Fant ikke styre eller daglig leder i åpne rolledata.");
    }

    private boolean harRolle(RollerResponse roller, String needle) {
        if (roller == null || roller.rollegrupper() == null) {
            return false;
        }

        return roller.rollegrupper().stream()
                .filter(Objects::nonNull)
                .flatMap(gruppe -> gruppe.roller() == null ? java.util.stream.Stream.empty() : gruppe.roller().stream())
                .map(RollerResponse.Rolle::type)
                .filter(Objects::nonNull)
                .map(RollerResponse.Rolletype::beskrivelse)
                .filter(Objects::nonNull)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .anyMatch(value -> value.contains(needle));
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
}
