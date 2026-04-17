package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.brreg.BrregClient;
import io.ltj.nyfirmasjekk.brreg.BrregClientException;
import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import io.ltj.nyfirmasjekk.brreg.EnheterSearchResponse;
import io.ltj.nyfirmasjekk.brreg.RollerResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.Stream;

@Service
public class CompanyCheckService {
    private static final Logger log = LoggerFactory.getLogger(CompanyCheckService.class);

    private static final List<String> CENTRAL_ORG_FORMS = List.of("AS", "ASA", "SA");
    private static final String ROLE_LABEL = "Roller";
    private static final int HIGH_ATTENTION_COMPANY_DAYS = 90;
    private static final int NEW_COMPANY_DAYS = 365;
    private static final int YELLOW_SCORE_THRESHOLD = 3;
    private static final List<String> BUSINESS_REGISTRY_EXPECTED_FORMS = List.of("AS", "ASA", "ANS", "DA", "NUF", "SA", "SE", "KS");
    private static final List<String> ANNUAL_ACCOUNTS_EXPECTED_FORMS = List.of("AS", "ASA", "ANS", "DA", "NUF", "SA", "SE", "KS");
    private static final RollerResponse EMPTY_ROLLER = new RollerResponse(List.of());

    private final BrregClient brregClient;
    private final Clock clock;
    private final ActorRiskService actorRiskService;

    @Autowired
    public CompanyCheckService(BrregClient brregClient, ActorRiskService actorRiskService) {
        this(brregClient, Clock.systemDefaultZone(), actorRiskService);
    }

    CompanyCheckService(BrregClient brregClient, Clock clock) {
        this(brregClient, clock, ActorRiskService.noOp());
    }

    CompanyCheckService(BrregClient brregClient, Clock clock, ActorRiskService actorRiskService) {
        this.brregClient = brregClient;
        this.clock = clock;
        this.actorRiskService = actorRiskService;
    }

    public List<CompanyCheck> hentNyeAs(int dagerSiden) {
        return sok(new CompanySearchRequest(null, dagerSiden, null, null, null, "AS", null, 25));
    }

    public List<CompanyCheck> sok(CompanySearchRequest request) {
        return sok(request, 0);
    }

    public List<CompanyCheck> sok(CompanySearchRequest request, int page) {
        if ("RED".equalsIgnoreCase(request.score())) {
            return sokRodeSelskaper(request, page);
        }
        if ("GREEN".equalsIgnoreCase(request.score())) {
            return sokGronneSelskaper(request, page);
        }

        int requestedPage = Math.max(page, 0);
        int pageSize = request.resultSize() > 0 ? request.resultSize() : 100;
        int offset = requestedPage * pageSize;
        int matchedCount = 0;
        int upstreamPage = 0;
        List<CompanyCheck> results = new ArrayList<>();
        long startedAt = System.nanoTime();

        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            while (true) {
                var searchResponse = brregClient.sok(byggFilter(request, upstreamPage));
                var enheter = hentEnheter(searchResponse);

                if (enheter.isEmpty()) {
                    break;
                }

                List<Future<CompanyCheck>> futures = enheter.stream()
                        .filter(Objects::nonNull)
                        .filter(enhet -> matcherLokalFiltrering(enhet, request))
                        .map(enhet -> executor.submit(() -> vurderFraSok(enhet)))
                        .toList();

                for (Future<CompanyCheck> future : futures) {
                    var check = awaitCheck(future);
                    if (!matcherScore(check, request.score())) {
                        continue;
                    }

                    if (matchedCount++ < offset) {
                        continue;
                    }

                    results.add(check);
                    if (results.size() >= pageSize) {
                        return results;
                    }
                }

                upstreamPage++;
                if (erSisteSide(searchResponse, upstreamPage)) {
                    break;
                }
            }
        }

        logSearchPath("DEFAULT", request, page, upstreamPage, matchedCount, results.size(), startedAt);
        return results;
    }

    private List<CompanyCheck> sokGronneSelskaper(CompanySearchRequest request, int page) {
        int requestedPage = Math.max(page, 0);
        int pageSize = request.resultSize() > 0 ? request.resultSize() : 100;
        int offset = requestedPage * pageSize;
        int matchedCount = 0;
        int upstreamPage = 0;
        List<CompanyCheck> results = new ArrayList<>();
        long startedAt = System.nanoTime();

        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            while (true) {
                var searchResponse = brregClient.sok(byggFilter(request, upstreamPage));
                var enheter = hentEnheter(searchResponse);

                if (enheter.isEmpty()) {
                    break;
                }

                List<Future<CompanyCheck>> futures = enheter.stream()
                        .filter(Objects::nonNull)
                        .filter(enhet -> matcherLokalFiltrering(enhet, request))
                        .filter(this::kanVaereGrontTreff)
                        .map(enhet -> executor.submit(() -> vurderGrontSoketreff(enhet)))
                        .toList();

                for (Future<CompanyCheck> future : futures) {
                    CompanyCheck check = awaitCheck(future);
                    if (check == null || !matcherScore(check, request.score())) {
                        continue;
                    }

                    if (matchedCount++ < offset) {
                        continue;
                    }

                    results.add(check);
                    if (results.size() >= pageSize) {
                        return results;
                    }
                }

                upstreamPage++;
                if (erSisteSide(searchResponse, upstreamPage)) {
                    break;
                }
            }
        }

        logSearchPath("GREEN", request, page, upstreamPage, matchedCount, results.size(), startedAt);
        return results;
    }

    private List<CompanyCheck> sokRodeSelskaper(CompanySearchRequest request, int page) {
        int requestedPage = Math.max(page, 0);
        int pageSize = request.resultSize() > 0 ? request.resultSize() : 100;
        int offset = requestedPage * pageSize;
        int targetCount = offset + pageSize;
        List<EnhetResponse> collected = new ArrayList<>();
        Map<String, EnhetResponse> unique = new HashMap<>();
        String[] seriousSignalFilters = {"konkurs", "underAvvikling", "underTvangsavviklingEllerTvangsopplosning"};
        long startedAt = System.nanoTime();
        int upstreamPage = 0;

        for (String signalFilter : seriousSignalFilters) {
            upstreamPage = 0;

            while (unique.size() < targetCount) {
                var response = brregClient.sok(byggFilter(request, upstreamPage, signalFilter));
                var enheter = hentEnheter(response);
                if (enheter.isEmpty()) {
                    break;
                }

                for (var enhet : enheter) {
                    if (enhet == null || !matcherLokalFiltrering(enhet, request)) {
                        continue;
                    }
                    if (unique.putIfAbsent(enhet.organisasjonsnummer(), enhet) == null) {
                        collected.add(enhet);
                    }
                }

                upstreamPage++;
                if (erSisteSide(response, upstreamPage)) {
                    break;
                }
            }
        }

        var results = collected.stream()
                .map(enhet -> vurderEnhet(enhet, null))
                .filter(check -> matcherScore(check, request.score()))
                .sorted((left, right) -> {
                    LocalDate leftDate = left.fakta() == null ? null : left.fakta().registreringsdato();
                    LocalDate rightDate = right.fakta() == null ? null : right.fakta().registreringsdato();
                    if (leftDate == null && rightDate == null) {
                        return left.navn().compareToIgnoreCase(right.navn());
                    }
                    if (leftDate == null) {
                        return 1;
                    }
                    if (rightDate == null) {
                        return -1;
                    }
                    int byDate = rightDate.compareTo(leftDate);
                    return byDate != 0 ? byDate : left.navn().compareToIgnoreCase(right.navn());
                })
                .skip(offset)
                .limit(pageSize)
                .toList();
        logSearchPath("RED", request, page, upstreamPage, unique.size(), results.size(), startedAt);
        return results;
    }

    public CompanyCheck vurder(String organisasjonsnummer) {
        var enhet = brregClient.hentEnhet(organisasjonsnummer);
        var roller = brregClient.hentRoller(organisasjonsnummer);
        return vurderEnhet(enhet, roller);
    }

    private CompanyCheck vurderFraSok(EnhetResponse enhet) {
        return vurderEnhet(enhet, brregClient.hentRoller(enhet.organisasjonsnummer()));
    }

    private CompanyCheck vurderGrontSoketreff(EnhetResponse enhet) {
        if (!erSentralOrganisasjonsform(enhet)) {
            return vurderEnhet(enhet, EMPTY_ROLLER);
        }
        return vurderEnhet(enhet, brregClient.hentRoller(enhet.organisasjonsnummer()));
    }

    private CompanyCheck awaitCheck(Future<CompanyCheck> future) {
        try {
            return future.get();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BrregClientException("Avbrutt under vurdering av selskaper", exception);
        } catch (ExecutionException exception) {
            throw new BrregClientException("Klarte ikke vurdere selskaper i søket", exception.getCause());
        }
    }

    private CompanyCheck vurderEnhet(EnhetResponse enhet, RollerResponse roller) {
        boolean hasRoles = roller != null && (harRolle(roller, "styre") || harDagligLeder(roller));
        boolean hasSeriousSignals = isTrue(enhet.konkurs()) || isTrue(enhet.underTvangsavviklingEllerTvangsopplosning()) || isTrue(enhet.underAvvikling());
        ActorRiskSummary actorRisk = actorRiskService.summarize(enhet.organisasjonsnummer(), roller);
        List<CheckFinding> funn = new ArrayList<>();
        byggFunn(enhet, roller, hasRoles, hasSeriousSignals, actorRisk, funn);

        var status = bestemStatus(enhet, hasRoles, hasSeriousSignals, actorRisk);
        int greenCount = (int) funn.stream().filter(f -> f.severity() == TrafficLight.GREEN).count();
        int yellowCount = (int) funn.stream().filter(f -> f.severity() == TrafficLight.YELLOW).count();
        int redCount = (int) funn.stream().filter(f -> f.severity() == TrafficLight.RED).count();

        String organisasjonsformBeskrivelse = hentOrganisasjonsformBeskrivelse(enhet);
        String modenhet = erNyttSelskap(enhet) ? "Nytt selskap" : "Etablert selskap";
        String naeringskode = hentNaeringskodeBeskrivelse(enhet);
        String aktivitet = hentPrimarAktivitet(enhet);
        String dagligLeder = hentDagligLeder(roller);
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
                        forsteIkkeTom(enhet.telefon(), enhet.mobil()),
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
                        "Signatur/prokura, reelle rettighetshavere, kunngjøringer og oppdateringsstrømmer are ikke vurdert ennå.",
                        "Rød status dekker foreløpig bare alvorlige signaler som faktisk finnes i de åpne feltene vi leser."
                )
        );
    }

    private void byggFunn(
            EnhetResponse enhet,
            RollerResponse roller,
            boolean hasRoles,
            boolean hasSeriousSignals,
            ActorRiskSummary actorRisk,
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
        leggTilAktorrisikoFunn(actorRisk, funn);
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

    private void leggTilAktorrisikoFunn(ActorRiskSummary actorRisk, List<CheckFinding> funn) {
        if (actorRisk.totalRelatedCompanyCount() == 0) {
            return;
        }
        if (actorRisk.riskLevel() == TrafficLight.RED) {
            funn.add(new CheckFinding(
                    TrafficLight.RED,
                    "Aktørrisiko",
                    "Tilknyttede aktører går igjen i flere selskaper med alvorlige signaler."
            ));
            return;
        }
        if (actorRisk.riskLevel() == TrafficLight.YELLOW) {
            funn.add(new CheckFinding(
                    TrafficLight.YELLOW,
                    "Aktørrisiko",
                    "Tilknyttede aktører har historikk fra selskaper som bør vurderes nærmere."
            ));
        }
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

    private boolean harDagligLeder(RollerResponse roller) {
        return hentDagligLeder(roller) != null;
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

    private String hentDagligLeder(RollerResponse roller) {
        return hentRoller(roller, "daglig leder").stream()
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
        } + " Registrerte signaler: " + red + " alvorlige and " + yellow + " moderate.";
    }

    private TrafficLight bestemStatus(EnhetResponse enhet, boolean hasRoles, boolean hasSeriousSignals, ActorRiskSummary actorRisk) {
        if (hasSeriousSignals || (erSentralOrganisasjonsform(enhet) && !hasRoles) || actorRisk.riskLevel() == TrafficLight.RED) {
            return TrafficLight.RED;
        }
        if (actorRisk.riskLevel() == TrafficLight.YELLOW) {
            return TrafficLight.YELLOW;
        }
        return beregnVarselpoeng(enhet, actorRisk) >= YELLOW_SCORE_THRESHOLD ? TrafficLight.YELLOW : TrafficLight.GREEN;
    }

    private int beregnVarselpoeng(EnhetResponse enhet, ActorRiskSummary actorRisk) {
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
        poeng += actorRisk.riskLevel() == TrafficLight.YELLOW ? 1 : 0;

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

    private String forsteIkkeTom(String... values) {
        for (String value : values) {
            if (hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private Map<String, String> byggFilter(CompanySearchRequest request, int page) {
        return byggFilter(request, page, null);
    }

    private Map<String, String> byggFilter(CompanySearchRequest request, int page, String seriousSignalFilter) {
        Map<String, String> filter = new HashMap<>();
        int requestedSize = request.resultSize() > 0 ? request.resultSize() : 100;
        filter.put("size", String.valueOf(Math.min(requestedSize, 100)));
        filter.put("page", String.valueOf(page));

        if (request.dager() > 0) {
            filter.put("fraRegistreringsdatoEnhetsregisteret", LocalDate.now(clock).minusDays(request.dager()).toString());
        }
        if (hasText(request.navn())) {
            filter.put("navn", request.navn().trim());
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
        if (hasText(seriousSignalFilter)) {
            filter.put(seriousSignalFilter, "true");
        }

        // Sorter etter registreringsdato for å få de nyeste først
        filter.put("sort", "registreringsdatoEnhetsregisteret,desc");

        return filter;
    }

    private List<EnhetResponse> hentEnheter(EnheterSearchResponse searchResponse) {
        if (searchResponse == null || searchResponse._embedded() == null || searchResponse._embedded().enheter() == null) {
            return List.of();
        }
        return searchResponse._embedded().enheter();
    }

    private boolean erSisteSide(EnheterSearchResponse searchResponse, int nextPage) {
        return searchResponse == null
                || searchResponse.page() == null
                || nextPage >= searchResponse.page().totalPages();
    }

    private boolean matcherLokalFiltrering(EnhetResponse enhet, CompanySearchRequest request) {
        return matcherNavn(enhet, request.navn())
                && (!hasText(request.fylke()) || matcherFylke(enhet, request.fylke()));
    }

    private boolean matcherNavn(EnhetResponse enhet, String navn) {
        if (!hasText(navn)) {
            return true;
        }

        String normalizedName = normaliserSoketekst(enhet.navn());
        return Stream.of(normaliserSoketekst(navn).split(" "))
                .filter(this::hasText)
                .allMatch(normalizedName::contains);
    }

    private boolean matcherScore(CompanyCheck check, String score) {
        return !hasText(score) || check.status().name().equalsIgnoreCase(score);
    }

    private boolean kanVaereGrontTreff(EnhetResponse enhet) {
        if (isTrue(enhet.konkurs()) || isTrue(enhet.underTvangsavviklingEllerTvangsopplosning()) || isTrue(enhet.underAvvikling())) {
            return false;
        }
        return beregnVarselpoeng(enhet, ActorRiskSummary.none()) < YELLOW_SCORE_THRESHOLD;
    }

    private String normaliserSoketekst(String value) {
        if (!hasText(value)) {
            return "";
        }
        return value.trim()
                .replaceAll("\\s+", " ")
                .toUpperCase(Locale.ROOT);
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

    private void logSearchPath(
            String path,
            CompanySearchRequest request,
            int page,
            int upstreamPage,
            int matchedCount,
            int resultCount,
            long startedAt
    ) {
        long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
        log.info(
                "company-check {} path in {} ms: score={}, dager={}, page={}, upstreamPages={}, matched={}, returned={}",
                path,
                durationMs,
                request.score() == null ? "ALL" : request.score(),
                request.dager(),
                Math.max(page, 0),
                upstreamPage + 1,
                matchedCount,
                resultCount
        );
    }
}
