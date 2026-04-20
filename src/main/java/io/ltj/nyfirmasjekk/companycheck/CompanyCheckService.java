package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.announcements.AnnouncementService;
import io.ltj.nyfirmasjekk.api.v1.Announcement;
import io.ltj.nyfirmasjekk.brreg.BrregClient;
import io.ltj.nyfirmasjekk.brreg.BrregClientException;
import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import io.ltj.nyfirmasjekk.brreg.EnheterSearchResponse;
import io.ltj.nyfirmasjekk.brreg.RollerResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.Stream;

@Service
public class CompanyCheckService {
    private static final Logger log = LoggerFactory.getLogger(CompanyCheckService.class);
    private static final int SOURCE_PAGE_SIZE = 100;
    private static final int FILTERED_SOURCE_PAGE_SIZE = 25;
    private static final int MAX_SOURCE_PAGES_WITH_SCORE_FILTER = 400;
    private static final int MAX_RED_SOURCE_PAGES_PER_VARIANT = 40;

    private static final List<String> CENTRAL_ORG_FORMS = List.of("AS", "ASA", "NUF", "ANS", "DA", "SA", "STIFT");
    private static final List<String> BUSINESS_REGISTRY_EXPECTED_FORMS = List.of("AS", "ASA", "NUF", "ANS", "DA", "SA");
    private static final List<String> ANNUAL_ACCOUNTS_EXPECTED_FORMS = List.of("AS", "ASA", "SA", "STIFT");

    private static final int NEW_COMPANY_DAYS = 180;
    private static final String ROLE_LABEL = "Roller";
    private static final RollerResponse EMPTY_ROLLER = new RollerResponse(List.of());

    private final BrregClient brregClient;
    private final Clock clock;
    private final ActorRiskService actorRiskService;
    private final AnnouncementService announcementService;
    private final ExecutorService executor = Executors.newFixedThreadPool(10);

    @Autowired
    public CompanyCheckService(BrregClient brregClient, ActorRiskService actorRiskService, AnnouncementService announcementService) {
        this(brregClient, Clock.systemDefaultZone(), actorRiskService, announcementService);
    }

    CompanyCheckService(BrregClient brregClient, Clock clock, ActorRiskService actorRiskService, AnnouncementService announcementService) {
        this.brregClient = brregClient;
        this.clock = clock;
        this.actorRiskService = actorRiskService;
        this.announcementService = announcementService;
    }

    public List<CompanyCheck> hentNyeAs(int dagerSiden) {
        return sok(new CompanySearchRequest(null, dagerSiden, null, null, null, "AS", null, 25));
    }

    public List<CompanyCheck> sok(CompanySearchRequest request) {
        return sokPage(request, 0).items();
    }

    public List<CompanyCheck> sok(CompanySearchRequest request, int page) {
        return sokPage(request, page).items();
    }

    public CompanySearchPage sokPage(CompanySearchRequest request, int page) {
        long startedAt = System.nanoTime();
        SearchDiagnostics diagnostics = new SearchDiagnostics(request, page);
        CompanySearchPage results = isHardRedSearch(request)
                ? sokMedRegisterdrevetRedFilter(request, page, diagnostics)
                : harTekst(request.score())
                ? sokMedScoreFilter(request, page, diagnostics)
                : sokUtenScoreFilter(request, page, diagnostics);

        long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
        log.info("Search completed in {} ms: score={}, page={}, results={}", 
                durationMs, request.score() == null ? "ALL" : request.score(), page, results.items().size());
        diagnostics.logSummary(durationMs, results.items().size());
        
        return results;
    }

    private CompanySearchPage sokMedRegisterdrevetRedFilter(CompanySearchRequest request, int page, SearchDiagnostics diagnostics) {
        Map<String, CompanyCheck> matches = new LinkedHashMap<>();
        int requestedOffset = Math.max(page, 0) * Math.max(request.resultSize(), 1);

        for (Map<String, String> redFilter : redSearchVariants()) {
            int sourcePage = 0;

            while (matches.size() < requestedOffset + request.resultSize() && sourcePage < MAX_RED_SOURCE_PAGES_PER_VARIANT) {
                var filter = byggFilter(request, sourcePage, FILTERED_SOURCE_PAGE_SIZE, redFilter);
                long fetchStartedAt = System.nanoTime();
                EnheterSearchResponse searchResponse = brregClient.sok(filter);
                diagnostics.recordFetch(hentEnheter(searchResponse).size(), fetchStartedAt);

                var pageMatches = vurderSide(searchResponse, request, diagnostics);
                pageMatches.forEach(match -> matches.putIfAbsent(match.organisasjonsnummer(), match));

                var pageInfo = searchResponse.page();
                boolean noMorePages = pageInfo == null || sourcePage >= pageInfo.totalPages() - 1;
                if (noMorePages || hentEnheter(searchResponse).isEmpty()) {
                    break;
                }

                sourcePage += 1;
            }

            if (matches.size() >= requestedOffset + request.resultSize()) {
                break;
            }
        }

        List<CompanyCheck> items = matches.values().stream()
                .skip(requestedOffset)
                .limit(request.resultSize())
                .toList();
        return buildSearchPage(items, page, request.resultSize(), matches.size());
    }

    private CompanySearchPage sokUtenScoreFilter(CompanySearchRequest request, int page, SearchDiagnostics diagnostics) {
        List<CompanyCheck> matches = new ArrayList<>();
        int requestedOffset = Math.max(page, 0) * Math.max(request.resultSize(), 1);
        int matchedBeforePage = 0;
        int sourcePage = 0;

        while (true) {
            var filter = byggFilter(request, sourcePage);
            long fetchStartedAt = System.nanoTime();
            EnheterSearchResponse searchResponse = brregClient.sok(filter);
            diagnostics.recordFetch(hentEnheter(searchResponse).size(), fetchStartedAt);
            var pageMatches = vurderSide(searchResponse, request, diagnostics);

            if (matchedBeforePage + pageMatches.size() > requestedOffset && matches.size() < request.resultSize()) {
                int fromIndex = Math.max(0, requestedOffset - matchedBeforePage);
                int toIndex = Math.min(pageMatches.size(), fromIndex + (request.resultSize() - matches.size()));
                if (fromIndex < toIndex) {
                    matches.addAll(pageMatches.subList(fromIndex, toIndex));
                }
            }
            matchedBeforePage += pageMatches.size();

            var pageInfo = searchResponse.page();
            boolean noMorePages = pageInfo == null || sourcePage >= pageInfo.totalPages() - 1;
            if (noMorePages || hentEnheter(searchResponse).isEmpty()) {
                break;
            }

            sourcePage += 1;
        }

        return buildSearchPage(matches, page, request.resultSize(), matchedBeforePage);
    }

    private CompanySearchPage sokMedScoreFilter(CompanySearchRequest request, int page, SearchDiagnostics diagnostics) {
        List<CompanyCheck> matches = new ArrayList<>();
        int requestedOffset = Math.max(page, 0) * Math.max(request.resultSize(), 1);
        int matchedBeforePage = 0;
        int sourcePage = 0;

        while (matches.size() < request.resultSize() && sourcePage < MAX_SOURCE_PAGES_WITH_SCORE_FILTER) {
            var filter = byggFilter(request, sourcePage, FILTERED_SOURCE_PAGE_SIZE);
            long fetchStartedAt = System.nanoTime();
            EnheterSearchResponse searchResponse = brregClient.sok(filter);
            diagnostics.recordFetch(hentEnheter(searchResponse).size(), fetchStartedAt);
            var pageMatches = vurderSide(searchResponse, request, diagnostics);
            if (matchedBeforePage + pageMatches.size() > requestedOffset) {
                int fromIndex = Math.max(0, requestedOffset - matchedBeforePage);
                matches.addAll(pageMatches.subList(fromIndex, pageMatches.size()));
            }
            matchedBeforePage += pageMatches.size();

            var pageInfo = searchResponse.page();
            boolean noMorePages = pageInfo == null || sourcePage >= pageInfo.totalPages() - 1;
            if (noMorePages || hentEnheter(searchResponse).isEmpty()) {
                break;
            }

            sourcePage += 1;
        }

        List<CompanyCheck> items = matches.stream()
                .limit(request.resultSize())
                .toList();
        return buildSearchPage(items, page, request.resultSize(), matchedBeforePage);
    }

    private CompanySearchPage buildSearchPage(List<CompanyCheck> items, int page, int size, long totalElements) {
        int safeSize = Math.max(size, 1);
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / safeSize);
        return new CompanySearchPage(items, Math.max(page, 0), safeSize, totalElements, totalPages);
    }

    private List<CompanyCheck> vurderSide(EnheterSearchResponse searchResponse, CompanySearchRequest request, SearchDiagnostics diagnostics) {
        var enheter = hentEnheter(searchResponse);
        if (enheter.isEmpty()) {
            return List.of();
        }

        long preFilterStartedAt = System.nanoTime();
        List<EnhetResponse> filteredEnheter = enheter.stream()
                .filter(enhet -> matcherEnhet(enhet, request))
                .toList();
        diagnostics.recordPrefilter(enheter.size(), filteredEnheter.size(), preFilterStartedAt);

        if (isHardRedSearch(request)) {
            long scoringStartedAt = System.nanoTime();
            List<CompanyCheck> results = filteredEnheter.stream()
                    .filter(this::hasHardRedSignal)
                    .map(this::byggHardRedSearchCheck)
                    .toList();
            diagnostics.recordScoring(filteredEnheter.size(), results.size(), scoringStartedAt);
            return results;
        }

        if (isFastGreenSearch(request)) {
            long scoringStartedAt = System.nanoTime();
            List<CompanyCheck> results = filteredEnheter.stream()
                    .filter(this::canBeFastGreen)
                    .map(this::byggFastGreenSearchCheck)
                    .toList();
            diagnostics.recordScoring(filteredEnheter.size(), results.size(), scoringStartedAt);
            return results;
        }

        long scoringStartedAt = System.nanoTime();
        List<Future<CompanyCheck>> futures = filteredEnheter.stream()
                .map(enhet -> executor.submit(() -> vurderFraSok(enhet)))
                .toList();

        List<CompanyCheck> results = futures.stream()
                .map(this::awaitCheck)
                .filter(Objects::nonNull)
                .filter(check -> matcherRequest(check, request))
                .toList();
        diagnostics.recordScoring(filteredEnheter.size(), results.size(), scoringStartedAt);
        return results;
    }

    private boolean isHardRedSearch(CompanySearchRequest request) {
        return request != null && "RED".equalsIgnoreCase(request.score());
    }

    private boolean isFastGreenSearch(CompanySearchRequest request) {
        return request != null && "GREEN".equalsIgnoreCase(request.score());
    }

    public CompanyCheck vurder(String organisasjonsnummer) {
        var enhet = brregClient.hentEnhet(organisasjonsnummer);
        var roller = brregClient.hentRoller(organisasjonsnummer);
        var announcements = announcementService.announcementsFor(enhet);
        return vurderEnhet(enhet, roller, announcements);
    }

    private CompanyCheck vurderFraSok(EnhetResponse enhet) {
        var roller = brregClient.hentRoller(enhet.organisasjonsnummer());
        // Ingen kunngjøringer i søkemodus (lazy loading i detaljer)
        return vurderEnhet(enhet, roller, List.of());
    }

    private CompanyCheck awaitCheck(Future<CompanyCheck> future) {
        try {
            return future.get();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BrregClientException("Avbrutt", exception);
        } catch (ExecutionException exception) {
            throw new BrregClientException("Feil under søk", exception.getCause());
        }
    }

    private CompanyCheck vurderEnhet(EnhetResponse enhet, RollerResponse roller, List<Announcement> announcements) {
        boolean hasRoles = roller != null && (!hentRoller(roller, "styre").isEmpty() || hentDagligLeder(roller) != null);
        boolean hasFissionOrMerger = announcements.stream()
                .anyMatch(a -> "FISSION".equals(a.type()) || "MERGER".equals(a.type()));
        boolean isBankruptcy = isBankruptcy(enhet);
        boolean isForcedDissolution = isForcedDissolution(enhet);
        boolean isVoluntaryDissolution = isVoluntaryDissolution(enhet);
        String organisasjonsformKode = hentOrganisasjonsformKode(enhet);

        long alderDager = modenhetsAlderDager(enhet);
        boolean isVeryNew = alderDager < NEW_COMPANY_DAYS;

        ActorRiskSummary actorRisk = actorRiskService.summarize(enhet.organisasjonsnummer(), roller);
        List<CheckFinding> funn = new ArrayList<>();
        byggFunn(enhet, organisasjonsformKode, roller, hasRoles, isBankruptcy, isForcedDissolution, isVoluntaryDissolution, hasFissionOrMerger, isVeryNew, actorRisk, funn);

        var status = bestemStatus(enhet, organisasjonsformKode, hasRoles, isBankruptcy, isForcedDissolution, isVoluntaryDissolution, hasFissionOrMerger, isVeryNew, actorRisk);
        int greenCount = (int) funn.stream().filter(f -> f.severity() == TrafficLight.GREEN).count();
        int yellowCount = (int) funn.stream().filter(f -> f.severity() == TrafficLight.YELLOW).count();
        int redCount = (int) funn.stream().filter(f -> f.severity() == TrafficLight.RED).count();

        return new CompanyCheck(
                enhet.organisasjonsnummer(),
                enhet.navn(),
                hentOrganisasjonsformKode(enhet),
                status,
                lagSammendrag(status, funn),
                byggCompanyFacts(enhet, roller, hasRoles, isBankruptcy || isForcedDissolution || isVoluntaryDissolution),
                new CompanyMetrics(greenCount, yellowCount, redCount),
                List.copyOf(funn),
                List.of("BRREG API"),
                List.of("Basert på åpne registerdata.")
        );
    }

    private CompanyCheck byggHardRedSearchCheck(EnhetResponse enhet) {
        List<CheckFinding> funn = List.of(
                new CheckFinding(TrafficLight.GREEN, "Organisasjonsnummer", "OK"),
                new CheckFinding(TrafficLight.RED, "Alvorlige signaler", "Konkurs eller tvangsoppløsning.")
        );
        return new CompanyCheck(
                enhet.organisasjonsnummer(),
                enhet.navn(),
                hentOrganisasjonsformKode(enhet),
                TrafficLight.RED,
                "Forhold som kan påvirke drift eller betalingsevne. Undersøk!",
                byggCompanyFacts(enhet, EMPTY_ROLLER, false, true),
                new CompanyMetrics(1, 0, 1),
                funn,
                List.of("BRREG API"),
                List.of("Basert på åpne registerdata. Hurtigvurdering for listevisning.")
        );
    }

    private CompanyCheck byggFastGreenSearchCheck(EnhetResponse enhet) {
        List<CheckFinding> funn = List.of(
                new CheckFinding(TrafficLight.GREEN, "Organisasjonsnummer", "OK"),
                new CheckFinding(TrafficLight.GREEN, "Struktur", "Ryddige grunnsignaler.")
        );
        return new CompanyCheck(
                enhet.organisasjonsnummer(),
                enhet.navn(),
                hentOrganisasjonsformKode(enhet),
                TrafficLight.GREEN,
                "Ryddig førsteinntrykk.",
                byggCompanyFacts(enhet, EMPTY_ROLLER, false, false),
                new CompanyMetrics(2, 0, 0),
                funn,
                List.of("BRREG API"),
                List.of("Basert på åpne registerdata. Hurtigvurdering for listevisning.")
        );
    }

    private CompanyFacts byggCompanyFacts(EnhetResponse enhet, RollerResponse roller, boolean hasRoles, boolean hasSeriousSignals) {
        long alderDager = modenhetsAlderDager(enhet);
        return new CompanyFacts(
                hentOrganisasjonsformKode(enhet),
                enhet.registreringsdatoEnhetsregisteret(),
                alderDager < NEW_COMPANY_DAYS ? "Nytt selskap" : "Etablert selskap",
                hentNaeringskodeBeskrivelse(enhet),
                hentPrimarAktivitet(enhet),
                hentDagligLeder(roller),
                hentRoller(roller, "styre"),
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
                utledLokasjon(enhet)
        );
    }

    private void byggFunn(EnhetResponse enhet, String organisasjonsformKode, RollerResponse roller, boolean hasRoles, boolean isB, boolean isF, boolean isV, boolean hasFM, boolean isN, ActorRiskSummary ar, List<CheckFinding> funn) {
        funn.add(new CheckFinding(TrafficLight.GREEN, "Organisasjonsnummer", "OK"));
        leggTilOrganisasjonsformFunn(organisasjonsformKode, funn);
        leggTilStrukturelleFunn(isB, isF, isV, hasFM, isN, funn);
        leggTilAldersfunn(enhet, funn);
        leggTilAktorrisikoFunn(ar, funn);
        leggTilRollefunn(enhet, roller, hasRoles, funn);
    }

    private void leggTilStrukturelleFunn(boolean isB, boolean isF, boolean isV, boolean hasFM, boolean isN, List<CheckFinding> funn) {
        if (isB || isF) {
            funn.add(new CheckFinding(TrafficLight.RED, "Alvorlige signaler", "Konkurs eller tvangsoppløsning."));
        } else if (isV) {
            funn.add(new CheckFinding(hasFM || isN ? TrafficLight.YELLOW : TrafficLight.RED, "Avvikling", "Selskapet er under oppløsning."));
        } else if (hasFM) {
            funn.add(new CheckFinding(TrafficLight.GREEN, "Struktur", "Fisjon/Fusjon."));
        }
    }

    private void leggTilAldersfunn(EnhetResponse enhet, List<CheckFinding> funn) {
        long alder = modenhetsAlderDager(enhet);
        if (alder < NEW_COMPANY_DAYS) {
            funn.add(new CheckFinding(TrafficLight.YELLOW, "Alder", "Nytt selskap."));
        }
    }

    private void leggTilRollefunn(EnhetResponse enhet, RollerResponse roller, boolean hasRoles, List<CheckFinding> funn) {
        if (roller != null) {
            if (hasRoles) {
                funn.add(new CheckFinding(TrafficLight.GREEN, ROLE_LABEL, "Registrert."));
            } else if (erSentralOrganisasjonsform(enhet)) {
                funn.add(new CheckFinding(TrafficLight.RED, ROLE_LABEL, "Mangler ledelse."));
            }
        }
    }

    private void leggTilAktorrisikoFunn(ActorRiskSummary ar, List<CheckFinding> funn) {
        if (ar.riskLevel() != TrafficLight.GREEN) {
            funn.add(new CheckFinding(ar.riskLevel(), "Aktørrisiko", "Historikk hos tilknyttede personer."));
        }
    }

    private void leggTilOrganisasjonsformFunn(String organisasjonsformKode, List<CheckFinding> funn) {
        int adjustment = OrganizationFormCatalog.scoreAdjustment(organisasjonsformKode);
        if (adjustment == 0) {
            return;
        }

        String label = OrganizationFormCatalog.displayLabelForValue(organisasjonsformKode);
        if (label == null) {
            label = organisasjonsformKode;
        }

        funn.add(new CheckFinding(
                adjustment > 0 ? TrafficLight.GREEN : TrafficLight.YELLOW,
                "Organisasjonsform",
                label + (adjustment > 0 ? " trekker svakt opp" : " trekker ned") + " (" + formatScoreAdjustment(adjustment) + ")."
        ));
    }

    private String formatScoreAdjustment(int adjustment) {
        return adjustment > 0 ? "+" + adjustment : String.valueOf(adjustment);
    }

    private String lagSammendrag(TrafficLight status, List<CheckFinding> funn) {
        return switch (status) {
            case GREEN -> "Ryddig førsteinntrykk.";
            case YELLOW -> "Selskapet er nytt eller har begrenset info. Sjekk nærmere.";
            case RED -> "Forhold som kan påvirke drift eller betalingsevne. Undersøk!";
        };
    }

    private TrafficLight bestemStatus(EnhetResponse en, String organisasjonsformKode, boolean hr, boolean isB, boolean isF, boolean isV, boolean hasFM, boolean isN, ActorRiskSummary ar) {
        int score = beregnPoengsum(en, organisasjonsformKode, hr, isB, isF, isV, hasFM, ar, isN);
        if (isB || isF || ar.riskLevel() == TrafficLight.RED) return TrafficLight.RED;
        if (isV && !hasFM && !isN) return TrafficLight.RED;
        if (erSentralOrganisasjonsform(en) && !hr && !isN) return TrafficLight.RED;
        if (isN && harTyntDatagrunnlag(en, hr)) return TrafficLight.YELLOW;
        if (!harMinimumPositivStruktur(en, hr)) return TrafficLight.YELLOW;
        if (score < 80 || ar.riskLevel() == TrafficLight.YELLOW) return TrafficLight.YELLOW;
        return TrafficLight.GREEN;
    }

    private int beregnPoengsum(EnhetResponse en, String organisasjonsformKode, boolean hr, boolean isB, boolean isF, boolean isV, boolean hasFM, ActorRiskSummary ar, boolean isN) {
        int s = 100;
        s += OrganizationFormCatalog.scoreAdjustment(organisasjonsformKode);
        if (isB) s -= 70; if (isF) s -= 60; if (erSentralOrganisasjonsform(en) && !hr) s -= 50;
        if (ar.riskLevel() == TrafficLight.RED) s -= 40; if (ar.riskLevel() == TrafficLight.YELLOW) s -= 15;
        long modenhetsAlder = modenhetsAlderDager(en);
        if (modenhetsAlder < NEW_COMPANY_DAYS) s -= 15;
        if (modenhetsAlder >= NEW_COMPANY_DAYS && !hasText(en.sisteInnsendteAarsregnskap())) s -= 10;
        if (hasFM) s -= 5; if (isV && !isB && !isF) s -= 10;
        if (isN && !isB && !isF && !(erSentralOrganisasjonsform(en) && !hr) && s < 55) s = 55;
        return Math.max(0, Math.min(100, s));
    }

    private boolean erSentralOrganisasjonsform(EnhetResponse en) {
        String code = normalizedOrganisasjonsformCode(en);
        return code != null && CENTRAL_ORG_FORMS.contains(code);
    }

    private boolean harTyntDatagrunnlag(EnhetResponse en, boolean hasRoles) {
        int mangler = 0;
        if (!harKontaktdata(en)) mangler += 1;
        if (en.naeringskode1() == null) mangler += 1;
        if (!hasText(hentPrimarAktivitet(en))) mangler += 1;
        if (erSentralOrganisasjonsform(en) && !hasRoles) mangler += 1;
        return mangler >= 2;
    }

    private boolean harMinimumPositivStruktur(EnhetResponse en, boolean hasRoles) {
        if (shouldExpectBusinessRegistry(en) && Boolean.TRUE.equals(en.registrertIForetaksregisteret())) {
            return true;
        }
        if (erSentralOrganisasjonsform(en) && hasRoles) {
            return true;
        }
        return hasText(hentPrimarAktivitet(en)) && en.naeringskode1() != null && harKontaktdata(en);
    }

    private boolean shouldExpectBusinessRegistry(EnhetResponse en) {
        String code = normalizedOrganisasjonsformCode(en);
        return code != null && BUSINESS_REGISTRY_EXPECTED_FORMS.contains(code);
    }

    private String hentOrganisasjonsformKode(EnhetResponse en) {
        return normalizedOrganisasjonsformCode(en);
    }

    private String normalizedOrganisasjonsformCode(EnhetResponse en) {
        if (en.organisasjonsform() == null) {
            return null;
        }
        String code = OrganizationFormCatalog.normalizeCode(en.organisasjonsform().kode());
        if (code != null) {
            return code;
        }
        return OrganizationFormCatalog.normalizeCode(en.organisasjonsform().beskrivelse());
    }

    private String hentNaeringskodeBeskrivelse(EnhetResponse en) {
        return (en.naeringskode1() != null) ? en.naeringskode1().kode() + " - " + en.naeringskode1().beskrivelse() : null;
    }

    private String hentPrimarAktivitet(EnhetResponse en) {
        return (en.aktivitet() != null && !en.aktivitet().isEmpty()) ? en.aktivitet().getFirst() : null;
    }

    private String hentDagligLeder(RollerResponse r) {
        return hentRoller(r, "daglig leder").stream().findFirst().orElse(null);
    }

    private List<String> hentRoller(RollerResponse r, String needle) {
        if (r == null || r.rollegrupper() == null) return List.of();
        return r.rollegrupper().stream().filter(Objects::nonNull)
                .flatMap(g -> g.roller() == null ? Stream.empty() : g.roller().stream())
                .filter(rolle -> !Boolean.TRUE.equals(rolle.fratraadt()) && !Boolean.TRUE.equals(rolle.avregistrert()))
                .filter(rolle -> rolle.type() != null && hasText(rolle.type().beskrivelse()) && rolle.type().beskrivelse().toLowerCase(Locale.ROOT).contains(needle))
                .map(this::rollenavn).filter(Objects::nonNull).distinct().toList();
    }

    private String rollenavn(RollerResponse.Rolle r) {
        if (r.person() != null && r.person().navn() != null) {
            return Stream.of(r.person().navn().fornavn(), r.person().navn().mellomnavn(), r.person().navn().etternavn())
                    .filter(this::hasText).reduce((l, ri) -> l + " " + ri).orElse(null);
        }
        return (r.enhet() != null && r.enhet().navn() != null && !r.enhet().navn().isEmpty()) ? r.enhet().navn().getFirst() : null;
    }

    private long alderDager(EnhetResponse en) {
        return en.registreringsdatoEnhetsregisteret() == null ? 9999 : ChronoUnit.DAYS.between(en.registreringsdatoEnhetsregisteret(), LocalDate.now(clock));
    }

    private long modenhetsAlderDager(EnhetResponse enhet) {
        LocalDate registreringsdato = enhet.registreringsdatoEnhetsregisteret();
        LocalDate stiftelsesdato = enhet.stiftelsesdato();

        if (registreringsdato == null && stiftelsesdato == null) {
            return 9999;
        }
        if (registreringsdato == null) {
            return ChronoUnit.DAYS.between(stiftelsesdato, LocalDate.now(clock));
        }
        if (stiftelsesdato == null) {
            return ChronoUnit.DAYS.between(registreringsdato, LocalDate.now(clock));
        }

        LocalDate modenhetsdato = stiftelsesdato.isBefore(registreringsdato) ? stiftelsesdato : registreringsdato;
        return ChronoUnit.DAYS.between(modenhetsdato, LocalDate.now(clock));
    }

    private String utledLokasjon(EnhetResponse en) {
        var adr = preferredAddress(en);
        if (adr == null) return "Ukjent";
        return hasText(adr.poststed()) && hasText(adr.kommune()) ? adr.poststed() + " (" + adr.kommune() + ")" : Objects.requireNonNullElse(adr.poststed(), "Ukjent");
    }

    private EnhetResponse.Adresse preferredAddress(EnhetResponse enhet) {
        return enhet.forretningsadresse() != null ? enhet.forretningsadresse() : enhet.postadresse();
    }

    private boolean harKontaktdata(EnhetResponse en) { return hasText(en.hjemmeside()) || hasText(en.epostadresse()); }
    private boolean isTrue(Boolean b) { return Boolean.TRUE.equals(b); }
    private boolean hasText(String s) { return s != null && !s.isBlank(); }
    private String forsteIkkeTom(String... v) { for (String s : v) if (hasText(s)) return s; return null; }

    private Map<String, String> byggFilter(CompanySearchRequest r, int p) {
        return byggFilter(r, p, SOURCE_PAGE_SIZE);
    }

    private Map<String, String> byggFilter(CompanySearchRequest r, int p, int size) {
        return byggFilter(r, p, size, Map.of());
    }

    private Map<String, String> byggFilter(CompanySearchRequest r, int p, int size, Map<String, String> extraParams) {
        Map<String, String> f = new HashMap<>();
        f.put("size", String.valueOf(size)); f.put("page", String.valueOf(p));
        if (r.dager() > 0) f.put("fraRegistreringsdatoEnhetsregisteret", LocalDate.now(clock).minusDays(r.dager()).toString());
        if (hasText(r.navn())) f.put("navn", r.navn().trim());
        extraParams.forEach(f::put);
        f.put("sort", "registreringsdatoEnhetsregisteret,desc");
        return f;
    }

    private List<EnhetResponse> hentEnheter(EnheterSearchResponse s) {
        return (s != null && s._embedded() != null && s._embedded().enheter() != null) ? s._embedded().enheter() : List.of();
    }

    private boolean matcherRequest(CompanyCheck check, CompanySearchRequest request) {
        return matcherScore(check, request.score());
    }

    private boolean matcherScore(CompanyCheck c, String s) { return !hasText(s) || c.status().name().equalsIgnoreCase(s); }
    private boolean matcherEnhet(EnhetResponse enhet, CompanySearchRequest request) {
        return matcherOrganisasjonsform(enhet, request.organisasjonsform())
                && matcherFylke(enhet, request.fylke())
                && matcherKommune(enhet, request.kommune());
    }

    private boolean matcherOrganisasjonsform(EnhetResponse enhet, String organisasjonsform) {
        if (!hasText(organisasjonsform)) {
            return true;
        }
        return enhet.organisasjonsform() != null
                && organisasjonsform.trim().equalsIgnoreCase(enhet.organisasjonsform().kode());
    }

    private boolean matcherFylke(EnhetResponse enhet, String fylke) {
        if (!hasText(fylke)) {
            return true;
        }
        return java.util.Optional.ofNullable(preferredAddress(enhet))
                .map(EnhetResponse.Adresse::fylke)
                .map(value -> value.equalsIgnoreCase(fylke.trim()))
                .orElse(false);
    }

    private boolean matcherKommune(EnhetResponse enhet, String kommune) {
        if (!hasText(kommune)) {
            return true;
        }
        return java.util.Optional.ofNullable(preferredAddress(enhet))
                .map(EnhetResponse.Adresse::kommune)
                .map(value -> value.equalsIgnoreCase(kommune.trim()))
                .orElse(false);
    }
    private boolean harTekst(String value) { return hasText(value); }
    private boolean isBankruptcy(EnhetResponse enhet) {
        return isTrue(enhet.konkurs())
                || hasOrgForm(enhet, "KBO")
                || containsInName(enhet, "KONKURSBO");
    }

    private boolean isForcedDissolution(EnhetResponse enhet) {
        return isTrue(enhet.underTvangsavviklingEllerTvangsopplosning())
                || containsInName(enhet, "TVANGSAVVIKLINGSBO")
                || containsInName(enhet, "TVANGSOPPLOSNINGSBO");
    }

    private boolean isVoluntaryDissolution(EnhetResponse enhet) {
        return isTrue(enhet.underAvvikling())
                || containsInName(enhet, "AVVIKLINGSBO");
    }

    private boolean hasOrgForm(EnhetResponse enhet, String code) {
        return enhet.organisasjonsform() != null && code.equalsIgnoreCase(enhet.organisasjonsform().kode());
    }

    private boolean containsInName(EnhetResponse enhet, String token) {
        return hasText(enhet.navn()) && enhet.navn().toUpperCase(Locale.ROOT).contains(token);
    }

    private boolean hasHardRedSignal(EnhetResponse enhet) {
        return isBankruptcy(enhet) || isForcedDissolution(enhet);
    }

    private List<Map<String, String>> redSearchVariants() {
        return List.of(
                Map.of("konkurs", "true"),
                Map.of("underTvangsavviklingEllerTvangsopplosning", "true"),
                Map.of("underAvvikling", "true"),
                Map.of("underKonkursbehandling", "true")
        );
    }

    private boolean canBeFastGreen(EnhetResponse enhet) {
        if (hasHardRedSignal(enhet) || isVoluntaryDissolution(enhet)) {
            return false;
        }
        if (harTyntDatagrunnlag(enhet, false)) {
            return false;
        }
        if (OrganizationFormCatalog.scoreAdjustment(normalizedOrganisasjonsformCode(enhet)) <= -2) {
            return false;
        }
        if (erSentralOrganisasjonsform(enhet) && !Boolean.TRUE.equals(enhet.registrertIForetaksregisteret())) {
            return false;
        }
        return hasEnhetOnlyPositiveStructure(enhet);
    }

    private boolean hasEnhetOnlyPositiveStructure(EnhetResponse enhet) {
        if (shouldExpectBusinessRegistry(enhet) && Boolean.TRUE.equals(enhet.registrertIForetaksregisteret())) {
            return true;
        }
        return hasText(hentPrimarAktivitet(enhet)) && enhet.naeringskode1() != null && harKontaktdata(enhet);
    }

    private static final class SearchDiagnostics {
        private final String score;
        private final int requestedPage;
        private int fetchCalls;
        private int fetchedCandidates;
        private int prefilteredCandidates;
        private int scoredCandidates;
        private int matchedCandidates;
        private long fetchMs;
        private long prefilterMs;
        private long scoringMs;

        private SearchDiagnostics(CompanySearchRequest request, int page) {
            this.score = request.score() == null ? "ALL" : request.score();
            this.requestedPage = page;
        }

        private void recordFetch(int fetchedCount, long startedAt) {
            fetchCalls += 1;
            fetchedCandidates += fetchedCount;
            fetchMs += elapsedMs(startedAt);
        }

        private void recordPrefilter(int inputCount, int filteredCount, long startedAt) {
            prefilteredCandidates += filteredCount;
            prefilterMs += elapsedMs(startedAt);
        }

        private void recordScoring(int scoredCount, int matchedCount, long startedAt) {
            scoredCandidates += scoredCount;
            matchedCandidates += matchedCount;
            scoringMs += elapsedMs(startedAt);
        }

        private void logSummary(long totalMs, int returnedCount) {
            log.info(
                    "Search diagnostics: score={}, requestedPage={}, fetchCalls={}, fetchedCandidates={}, prefilteredCandidates={}, scoredCandidates={}, matchedCandidates={}, returnedCount={}, fetchMs={}, prefilterMs={}, scoringMs={}, totalMs={}",
                    score,
                    requestedPage,
                    fetchCalls,
                    fetchedCandidates,
                    prefilteredCandidates,
                    scoredCandidates,
                    matchedCandidates,
                    returnedCount,
                    fetchMs,
                    prefilterMs,
                    scoringMs,
                    totalMs
            );
        }

        private long elapsedMs(long startedAt) {
            return (System.nanoTime() - startedAt) / 1_000_000;
        }
    }
}
