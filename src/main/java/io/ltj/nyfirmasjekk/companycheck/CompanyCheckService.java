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
    private static final int HIGH_ATTENTION_COMPANY_DAYS = 90;
    private static final int NEW_COMPANY_DAYS = 365;
    private static final int YELLOW_SCORE_THRESHOLD = 3;
    private static final List<String> BUSINESS_REGISTRY_EXPECTED_FORMS = List.of("AS", "ASA", "ANS", "DA", "NUF", "SA", "SE", "KS");
    private static final List<String> ANNUAL_ACCOUNTS_EXPECTED_FORMS = List.of("AS", "ASA", "ANS", "DA", "NUF", "SA", "SE", "KS");

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

        var status = bestemStatus(enhet, hasRoles, hasSeriousSignals);
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
                        enhet.registrertIMvaregisteret(),
                        enhet.registrertIForetaksregisteret(),
                        enhet.antallAnsatte(),
                        enhet.harRegistrertAntallAnsatte(),
                        enhet.sisteInnsendteAarsregnskap(),
                        enhet.stiftelsesdato(),
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
                    "Selskapet er registrert i Enhetsregisteret."
            ));
        }
    }

    private void leggTilAlvorligeSignalFunn(boolean hasSeriousSignals, List<CheckFinding> funn) {
        if (hasSeriousSignals) {
            funn.add(new CheckFinding(
                    TrafficLight.RED,
                    "Alvorlige registreringssignaler",
                    "Åpne registerdata viser alvorlige forhold som bør sjekkes før samarbeid."
            ));
        }
    }

    private void leggTilKontaktfunn(EnhetResponse enhet, List<CheckFinding> funn) {
        if (harKontaktdata(enhet)) {
            funn.add(new CheckFinding(TrafficLight.GREEN, "Kontaktdata", "Det finnes synlige kontaktopplysninger i registeret."));
            return;
        }
        funn.add(new CheckFinding(TrafficLight.YELLOW, "Kontaktdata", "Det finnes få kontaktopplysninger i åpne registerdata."));
    }

    private void leggTilTelefonfunn(EnhetResponse enhet, List<CheckFinding> funn) {
        if (harTelefondata(enhet)) {
            funn.add(new CheckFinding(TrafficLight.GREEN, "Telefon", "Telefonopplysninger er registrert."));
            return;
        }
        funn.add(new CheckFinding(TrafficLight.YELLOW, "Telefon", "Telefonopplysninger mangler i åpne registerdata."));
    }

    private void leggTilNaeringskodefunn(EnhetResponse enhet, List<CheckFinding> funn) {
        if (harNaeringskode(enhet)) {
            funn.add(new CheckFinding(
                    TrafficLight.GREEN,
                    "Næringskode",
                    "Bransje er registrert."
            ));
            return;
        }
        funn.add(new CheckFinding(TrafficLight.YELLOW, "Næringskode", "Bransjeopplysninger mangler eller er uklare."));
    }

    private void leggTilAktivitetsfunn(EnhetResponse enhet, List<CheckFinding> funn) {
        if (harAktivitet(enhet)) {
            funn.add(new CheckFinding(TrafficLight.GREEN, "Aktivitet", "Selskapet har en registrert aktivitetsbeskrivelse."));
            return;
        }
        funn.add(new CheckFinding(TrafficLight.YELLOW, "Aktivitet", "Selskapet mangler en tydelig aktivitetsbeskrivelse i åpne data."));
    }

    private void leggTilRollefunn(EnhetResponse enhet, RollerResponse roller, boolean hasRoles, List<CheckFinding> funn) {
        if (roller != null) {
            funn.add(vurderRoller(enhet, hasRoles));
            return;
        }
        funn.add(new CheckFinding(TrafficLight.YELLOW, ROLE_LABEL, "Rolleopplysninger kunne ikke vurderes i denne visningen."));
    }

    private void leggTilAldersfunn(EnhetResponse enhet, List<CheckFinding> funn) {
        long alderDager = alderDager(enhet);
        if (alderDager <= HIGH_ATTENTION_COMPANY_DAYS) {
            funn.add(new CheckFinding(TrafficLight.YELLOW, "Alder", "Selskapet er helt nytt og har lite historikk."));
            return;
        }
        if (alderDager <= NEW_COMPANY_DAYS) {
            funn.add(new CheckFinding(TrafficLight.YELLOW, "Alder", "Selskapet er forholdsvis nytt og har begrenset historikk."));
        }
    }

    private void leggTilDatakvalitetsfunn(EnhetResponse enhet, List<CheckFinding> funn) {
        if (harFaaBasisopplysninger(enhet)) {
            funn.add(new CheckFinding(TrafficLight.YELLOW, "Datakvalitet", "Det finnes lite offentlig informasjon å støtte vurderingen på."));
            return;
        }
        funn.add(new CheckFinding(TrafficLight.GREEN, "Datakvalitet", "Det finnes et greit grunnlag i åpne registerdata."));
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
            return new CheckFinding(TrafficLight.GREEN, ROLE_LABEL, "Ledelse eller sentrale roller er registrert.");
        }

        if (centralForm) {
            return new CheckFinding(TrafficLight.RED, ROLE_LABEL, "Sentrale rolleopplysninger mangler for en selskapsform som normalt skal ha dem.");
        }

        return new CheckFinding(TrafficLight.GREEN, ROLE_LABEL, "Ingen tydelige rolleavvik er funnet for denne organisasjonsformen.");
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
        return alderDager(enhet) <= NEW_COMPANY_DAYS;
    }

    private long alderDager(EnhetResponse enhet) {
        if (enhet.registreringsdatoEnhetsregisteret() == null) {
            return Long.MAX_VALUE;
        }
        return ChronoUnit.DAYS.between(enhet.registreringsdatoEnhetsregisteret(), LocalDate.now(clock));
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
            case GREEN -> "Åpne registerdata gir et ryddig førsteinntrykk.";
            case YELLOW -> "Åpne registerdata viser noen forhold som bør vurderes litt nærmere.";
            case RED -> "Åpne registerdata viser forhold som bør undersøkes før samarbeid.";
        } + " Registrerte signaler: " + red + " alvorlige og " + yellow + " moderate.";
    }

    private int severityRank(TrafficLight status) {
        return switch (status) {
            case GREEN -> 1;
            case YELLOW -> 2;
            case RED -> 3;
        };
    }

    private TrafficLight bestemStatus(EnhetResponse enhet, boolean hasRoles, boolean hasSeriousSignals) {
        if (hasSeriousSignals || (erSentralOrganisasjonsform(enhet) && !hasRoles)) {
            return TrafficLight.RED;
        }
        return beregnVarselpoeng(enhet) >= YELLOW_SCORE_THRESHOLD ? TrafficLight.YELLOW : TrafficLight.GREEN;
    }

    private int beregnVarselpoeng(EnhetResponse enhet) {
        int poeng = 0;
        long alderDager = alderDager(enhet);

        if (alderDager <= HIGH_ATTENTION_COMPANY_DAYS) {
            poeng += 2;
        } else if (alderDager <= NEW_COMPANY_DAYS) {
            poeng += 1;
        }
        poeng += harKontaktdata(enhet) ? 0 : 1;
        poeng += harTelefondata(enhet) ? 0 : 1;
        poeng += harNaeringskode(enhet) ? 0 : 1;
        poeng += harAktivitet(enhet) ? 0 : 1;
        poeng += harFaaBasisopplysninger(enhet) ? 1 : 0;
        poeng += manglerForventetForetaksregister(enhet) ? 1 : 0;
        poeng += manglerForventetMva(enhet, alderDager) ? 1 : 0;
        poeng += manglerForventetAnsattsignal(enhet, alderDager) ? 1 : 0;
        poeng += manglerForventetAarsregnskap(enhet, alderDager) ? 1 : 0;

        return poeng;
    }

    private boolean isTrue(Boolean value) {
        return Boolean.TRUE.equals(value);
    }

    private boolean manglerForventetForetaksregister(EnhetResponse enhet) {
        return forventerForetaksregister(enhet) && !Boolean.TRUE.equals(enhet.registrertIForetaksregisteret());
    }

    private boolean manglerForventetMva(EnhetResponse enhet, long alderDager) {
        if (alderDager <= NEW_COMPANY_DAYS) {
            return false;
        }
        return forventerMvaSignal(enhet) && !Boolean.TRUE.equals(enhet.registrertIMvaregisteret());
    }

    private boolean manglerForventetAnsattsignal(EnhetResponse enhet, long alderDager) {
        if (alderDager <= NEW_COMPANY_DAYS) {
            return false;
        }
        return Boolean.TRUE.equals(enhet.harRegistrertAntallAnsatte()) && Integer.valueOf(0).equals(enhet.antallAnsatte());
    }

    private boolean manglerForventetAarsregnskap(EnhetResponse enhet, long alderDager) {
        if (alderDager <= NEW_COMPANY_DAYS) {
            return false;
        }
        return forventerAarsregnskap(enhet) && !hasText(enhet.sisteInnsendteAarsregnskap());
    }

    private boolean forventerForetaksregister(EnhetResponse enhet) {
        return harOrganisasjonsform(enhet, BUSINESS_REGISTRY_EXPECTED_FORMS);
    }

    private boolean forventerAarsregnskap(EnhetResponse enhet) {
        return harOrganisasjonsform(enhet, ANNUAL_ACCOUNTS_EXPECTED_FORMS);
    }

    private boolean forventerMvaSignal(EnhetResponse enhet) {
        return harOrganisasjonsform(enhet, BUSINESS_REGISTRY_EXPECTED_FORMS) || hasText(enhet.hjemmeside()) || harAktivitet(enhet);
    }

    private boolean harOrganisasjonsform(EnhetResponse enhet, List<String> forms) {
        return enhet.organisasjonsform() != null
                && hasText(enhet.organisasjonsform().kode())
                && forms.contains(enhet.organisasjonsform().kode().trim().toUpperCase(Locale.ROOT));
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
