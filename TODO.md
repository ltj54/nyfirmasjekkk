# TODO

## Gjeldende scoringsregler

### Grønn

- Ingen tydelige alvorlige signaler i åpne registerdata
- Ingen gul eller rød aktørrisiko
- Selskapet må ha et minimum av positiv struktur, ikke bare fravær av rødt
- Nye selskaper kan være grønne hvis grunnsignalene ellers er ryddige

Minimum av positiv struktur betyr minst én av disse:
- Registrert i Foretaksregisteret når organisasjonsformen normalt forventer det
- Sentrale roller er på plass der de forventes
- Næringskode, aktivitetsbeskrivelse og kontaktdata finnes

### Gul

- Selskapet er nytt, og datagrunnlaget er tynt eller uklart
- Totalscoren er under grønn terskel
- Aktørrisiko er gul
- Selskapet er under avvikling, men uten tydelige røde struktursignaler

Tynt datagrunnlag betyr minst to av disse:
- Mangler kontaktdata
- Mangler næringskode
- Mangler aktivitetsbeskrivelse
- Mangler roller i organisasjonsformer der roller normalt forventes

### Rød

- Konkurs eller tvangsoppløsning er registrert
- Navn eller organisasjonsform viser tydelig bo-signal som `KBO`, `KONKURSBO`, `TVANGSAVVIKLINGSBO` eller `TVANGSOPPLOSNINGSBO`
- Aktørrisiko er rød
- Selskapet er under avvikling uten dempende struktursignal
- Sentrale roller mangler i organisasjonsformer der dette er kritisk

Dette dokumentet oppsummerer status for fase 5 i `nyfirmasjekk` og samler gjenstående arbeid før produksjonssetting.

## Status per 2026-04-17

### Fullført i denne fasen

- [x] Konsolidert offentlig API til `/api/company-check`
- [x] Fjernet dupliserte controllere for gammel API-flate
- [x] Flyttet `filters` inn under samme API-flate
- [x] Oppdatert frontend-proxyer til å bruke kun ny flate
- [x] Lagt til integrasjonstester for `search`, detaljer, `history`, `network`, `events`, ugyldig orgnr, `404` og `502`
- [x] Gjort databaseoppsett miljøstyrt med profiler for `dev`, `test` og `prod`
- [x] Flyttet database- og JPA-oppsett til miljøspesifikk konfigurasjon
- [x] Innført Flyway
- [x] Lagt inn første migrasjon for eksisterende skjema
- [x] Ryddet frontend-kontrakt og TypeScript-typer mot backend
- [x] Lagt til Caffeine-cache for BRREG-oppslag
- [x] Konfigurert cache-TTL
- [x] Lagt til observability med Actuator, Micrometer og Prometheus
- [x] Forbedret logging av søkeparametere og responstid
- [x] Gjort filtermetadata datadrevet
- [x] Forbedret empty states og feilhåndtering i UI
- [x] Justert risikomodell for strukturelle hendelser og nye selskaper

### Verifisert i kodebasen

- [x] `CompanyCheckController` eksponerer `/api/company-check`
- [x] Frontend bruker `/api/company-check` i proxy-ruter og UI-kall
- [x] `application.properties` eksponerer `health`, `info`, `metrics` og `prometheus`
- [x] `build.gradle` inkluderer `flyway-core`, `caffeine` og Prometheus-registry
- [x] Første Flyway-migrasjon finnes i `src/main/resources/db/migration/V1__Create_initial_schema.sql`
- [x] Miljøfiler finnes for `application-dev.properties`, `application-test.properties` og `application-prod.properties`

## Produksjonsklarhetssjekkliste

### Må være på plass før produksjon

- [x] Kjør full backend-testpakke og bekreft grønn build
- [x] Kjør frontend-build og bekreft at proxy-ruter fungerer mot backend
- [ ] Verifiser `application-prod.properties` mot faktisk produksjonsmiljø
- [ ] Bekreft at produksjon ikke bruker H2 eller lokal filbasert database
- [ ] Sett eksplisitt produksjonsdatabase med riktige credentials via miljøvariabler eller secrets
- [ ] Bekreft at Flyway kjører automatisk og trygt i produksjon
- [ ] Verifiser at `ddl-auto` i produksjon ikke gjør ukontrollerte skjemaendringer
- [ ] Test end-to-end mot BRREG fra et produksjonsnært miljø
- [ ] Definer timeout, retry-strategi og feilhåndtering for eksterne BRREG-kall
- [ ] Verifiser at cache-oppsett og TTL er riktige for produksjonslast
- [ ] Bekreft at `/actuator/health` og `/actuator/prometheus` er riktig eksponert og beskyttet
- [ ] Sikre at sensitive data ikke logges i applikasjonslogger eller proxy-logger
- [ ] Verifiser CORS, origin-policy og proxy-oppsett for frontend i produksjon
- [ ] Dokumenter nødvendige miljøvariabler for backend og frontend
- [ ] Lag enkel deploy- og rollback-prosedyre

### Bør være på plass snart etterpå

- [ ] Legg til alarmer for høy feilrate, høy responstid og BRREG-feil
- [ ] Legg til dashbord for søk, detaljvisning, cache-hit-rate og eksterne feil
- [ ] Verifiser rate limiting eller annen beskyttelse mot misbruk
- [ ] Legg til smoke-test etter deploy
- [ ] Vurder readiness/liveness-prober hvis appen skal kjøres i containerplattform
- [ ] Dokumenter driftshåndtering for migrasjoner og incident-respons

## Merknader

- Fase 5-oppgavene er gjennomført og reflektert i kodebasen.
- Produksjonsklarhet er neste arbeidspakke, ikke nye funksjonskrav.
- `TODO.md` bør heretter brukes som operativ sjekkliste for verifisering før produksjonssetting.
- 2026-04-20: Frontend-build og proxy-ruter verifisert etter siste UI-opprydding.
- 2026-04-20: Dublettreff i søk er fikset ved deduplisering på organisasjonsnummer før paginering.
- 2026-04-20: `CompanyCheckServiceTests` er kjørt grønn etter opprydding i utdatert test for nettside-filter.
- 2026-04-20: Full backend-testpakke (`./gradlew test`) er kjørt grønn.
- 2026-04-20: Normalisert hendelsesmodell er innført i API-et med `CompanyEvent`, brukt i detaljrespons og `/events`, og komprimerte hendelsesbadges er vist i trefflisten.
- 2026-04-20: Strukturert scoreforklaring er innført i API-et med `ScoreEvidence`, og frontend bruker nå backendens forklaringsfelt direkte.
- 2026-04-20: Detaljvisningen er delt i `Hurtigsjekk` og `Dyp analyse`, og begrepsbruken i UI er strammet rundt `mulighetssignal`, `registerspor` og `kontaktbarhet`.

## BRREG-roadmap

### Kan bruke nå

- [x] Utnytt `underKonkursbehandling` mer direkte i søk og vurdering
- [x] Utnytt `underAvvikling` og `underTvangsavviklingEllerTvangsopplosning` mer systematisk i listefiltre
- [x] Bruk `registrertIForetaksregisteret` tydeligere som positivt struktursignal
- [x] Bruk `fraStiftelsesdato` og `tilStiftelsesdato` mer aktivt i modenhetsvurdering
- [x] Skill tydeligere mellom raske listefiltre og full detaljvurdering

### Høy produktverdi

- [x] Bygg tydelig hendelsesprofil per selskap: nyregistrering, vedtektsendring, adresseendring, avvikling, konkurs
- [ ] Bygg forklarbar aktørkontekst: hvor mange selskaper en rolleholder er knyttet til, og hvor mange av dem som er røde eller avviklet
- [ ] Vis strukturmønstre rundt nye selskaper: samme personer, nylige konkurser, bo-signaler, omregistreringer
- [x] Gjør scoreforklaringen mer konkret i UI med registerspor i stedet for generelle etiketter
- [x] Introduser to nivåer i produktet: hurtigsjekk og dyp analyse

### Anbefalt rekkefølge

- [x] Prioriter først hendelsesprofil og konkret scoreforklaring, siden dette kan bygges på eksisterende data og gir raskest produktløft
- [ ] Bygg deretter forklarbar aktørkontekst i detaljvisning før eventuell utvidelse til trefflisten
- [x] Introduser hurtigsjekk og dyp analyse når hendelser og forklaringer er på plass i samme datamodell
- [ ] Utsett avanserte strukturmønstre til grunnlaget for hendelser, historikk og aktørkontekst er stabilt

### Neste arbeidspakke

- [x] Definer en normalisert hendelsesmodell for UI og API: nyregistrering, vedtektsendring, adresseendring, avvikling, konkurs
- [x] Kartlegg hvilke eksisterende BRREG-kilder og interne snapshots som allerede kan drive hendelsesprofilen
- [x] Vis hendelser i detaljvisning som tidslinje eller prioritert punktliste
- [x] Vis korte hendelsesbadges i trefflisten for de mest relevante signalene
- [x] Bytt generelle scoretekster i UI med konkrete registerspor som faktisk trigget vurderingen
- [x] Vis eksplisitt hvilke regler og datakilder som ligger bak scoreforklaringen
- [ ] Bygg første versjon av aktørkontekst per rolleholder: antall selskaper, antall røde, antall avviklede
- [ ] Presenter aktørkontekst som forklarende tekst i detaljvisning, ikke bare som rå tellerverdier
- [x] Skill UI tydelig mellom hurtigsjekk og dyp analyse uten å duplisere backendlogikk
- [x] Definer hva som skal vises i hurtigsjekk: score, viktigste signaler og 2-3 sentrale hendelser
- [x] Definer hva som skal vises i dyp analyse: hendelsesprofil, aktørkontekst, historikk og nettverk

### Neste steg når du tar dette opp igjen

- [ ] Bygg første versjon av forklarbar aktørkontekst i API-et: totaltilknytninger, røde selskaper, avviklede selskaper per rolleholder
- [ ] Presenter aktørkontekst tydeligere i detaljvisningen som innsikt, ikke bare rå tall og badge-lister
- [ ] Innfør strukturmønstre rundt nye selskaper: samme personer, nylige konkurser, bo-signaler og mulige omregistreringer
- [ ] Vurder å fase ut rå `announcements` i detaljresponsen når `events` dekker UI-behovet fullt ut
- [ ] Rydd opp videre i domenespråket mellom backend og frontend rundt `mulighetssignal`, `registerspor` og `kontaktbarhet`
- [ ] Vurder kommersielle CTA-er i hurtigsjekk og treffliste når aktørkontekst er på plass

### Backend-oppgaver

- [x] Definer API-kontrakt for hendelser per selskap i `api/v1`
- [x] Utvid mapperen til å levere normaliserte hendelser fra BRREG-data og kunngjøringer
- [x] Normaliser hendelsestyper til et lite, stabilt sett som UI kan stole på
- [x] Legg inn prioritering eller sortering av hendelser etter alvorlighet og dato
- [x] Koble scoreforklaring tydelig til konkrete regler og underliggende registerfelt
- [x] Utvid detaljresponsen med forklaringsfelt som skiller mellom signal, regel og datakilde
- [ ] Utvid nettverks- eller aktørresponsen med oppsummering per rolleholder: totaltilknytninger, røde selskaper, avviklede selskaper
- [ ] Vurder om hendelser bør caches eller preberegnes for å unngå dyr detaljlasting
- [x] Legg inn tester for mapping av hendelser og scoreforklaringer
- [ ] Legg inn tester for aktørkontekst

### Frontend-oppgaver

- [x] Definer TypeScript-typer for hendelsesprofil og utvidet scoreforklaring
- [x] Legg til seksjon for hendelsesprofil i detaljvisning
- [x] Presenter hendelser som tidslinje eller prioritert punktliste med tydelige etiketter
- [x] Legg til komprimerte hendelsesbadges i trefflisten
- [x] Bytt generelle forklaringstekster i UI med konkrete registerspor
- [x] Skill visuelt mellom “hurtigsjekk” og “dyp analyse” i detaljvisningen
- [x] Lag en kompakt hurtigsjekkvisning med score, viktigste signaler og sentrale hendelser
- [x] Lag en dyp analyse-visning med hendelser, aktørkontekst, historikk og nettverk
- [ ] Sørg for at aktørkontekst vises som forklarende innsikt, ikke bare tellerverdier
- [ ] Legg inn tomtilstander og fallback-visning når hendelser eller aktørdata mangler

### Datamodell og avklaringer

- [x] Bestem endelig liste over hendelsestyper som produktet skal bruke i første versjon
- [x] Bestem hvilke hendelser som skal vises i treffliste versus kun i detaljvisning
- [x] Definer hvilke scoreårsaker som alltid skal vises eksplisitt i UI
- [x] Definer hvilke datakilder som skal navngis i forklaringen, for eksempel BRREG, roller, kunngjøringer og historikksnapshots
- [ ] Avklar om aktørkontekst i første versjon skal være snapshot-basert eller historikkbasert
- [ ] Definer terskler for når aktørkontekst skal fremheves som relevant signal
- [x] Bestem om hurtigsjekk og dyp analyse skal være to faner, to seksjoner eller to ulike innganger

### Krever mer integrasjon eller videre modellering

- [ ] Rollehistorikk og endring over tid
- [ ] Bedre tidslinje for strukturelle hendelser på tvers av kunngjøringer og snapshots
- [ ] Mønstre på tvers av selskaper og personer, ikke bare enkeltoppslag
- [ ] Vurdere precomputede signaler eller batch-oppdaterte risikofelter for raskere søk
- [ ] Vurdere materialiserte felter eller egen indeks for hurtigfiltrering

### Arbeidsprinsipper videre

- [x] Prioriter forklarbarhet foran mer kompleks score
- [x] Utvid ikke røde regler uten tydelig dokumenterbare registersignaler
- [x] La BRREG gjøre mest mulig grovsortering før lokal scoring
- [ ] Bruk nye datakilder bare når de gir tydelig produktverdi i UI eller risikoanalyse

## Kommersiell retning

### Dreie siden mot lead-gen for nye firmaer

- [x] Avklart retning: siden skal ikke bare vurdere selskaper, men brukes til å tilby nettside til nye firmaer
- [x] Avklart produktvinkel: selg synlighet og troverdighet fra start, ikke bare "hjemmeside"
- [ ] Spisse verdiforslaget på forsiden mot nye virksomheter uten tydelig digital tilstedeværelse
- [ ] Legge inn tydelige CTA-er i trefflisten og detaljvisningen for tilbud om nettside
- [ ] Lage enkel landingsseksjon for tjenesten: nettside, domene, e-post og kontaktpunkt
- [ ] Definere et lavterskel tilbud med fast pris eller tydelig startpakke
- [ ] Gjøre søket mer egnet for salgsarbeid: fremhev selskaper uten nettside eller med tynn offentlig profil
- [ ] Vise hvorfor et selskap er relevant lead, ikke bare hvilken score det har
- [ ] Lage enkel kontaktflyt fra UI til skjema, e-post eller CRM
- [ ] Vurdere om vurderingsscore skal tones ned til fordel for "mulighetssignal" i kommersiell visning
- [ ] Skrive kort, konkret salgsbudskap rettet mot nyregistrerte selskaper
- [ ] Bestemme om løsningen primært er et internt salgsverktøy, en offentlig landingsside eller begge deler

## Arbeidslogg 2026-04-20

### Levert i denne økten

- Fikset dublettreff i søk ved deduplisering på organisasjonsnummer før paginering
- Ryddet og oppdatert tester rundt `CompanyCheckService`
- Kjørt full backend-testpakke grønn
- Innført normalisert hendelsesmodell i API-et med `CompanyEvent`
- Utvidet detaljrespons og `/events` til å bruke normaliserte hendelser
- Vist komprimerte hendelsesbadges i trefflisten
- Innført strukturert scoreforklaring i API-et med `ScoreEvidence`
- Koblet frontend til backendens scoreforklaring i stedet for lokal utledning
- Delt detaljvisningen i `Hurtigsjekk` og `Dyp analyse`
- Strammet begrepsbruk i UI rundt `mulighetssignal`, `registerspor` og `kontaktbarhet`

### Viktigste filer endret

- `src/main/java/io/ltj/nyfirmasjekk/companycheck/CompanyCheckService.java`
- `src/main/java/io/ltj/nyfirmasjekk/companycheck/CompanyCheckController.java`
- `src/main/java/io/ltj/nyfirmasjekk/api/v1/CompanyApiV1Mapper.java`
- `src/main/java/io/ltj/nyfirmasjekk/api/v1/CompanyDetails.java`
- `src/main/java/io/ltj/nyfirmasjekk/api/v1/CompanySummary.java`
- `src/main/java/io/ltj/nyfirmasjekk/api/v1/CompanyScoreResponse.java`
- `src/main/java/io/ltj/nyfirmasjekk/api/v1/CompanyEvent.java`
- `src/main/java/io/ltj/nyfirmasjekk/api/v1/ScoreEvidence.java`
- `frontend/src/lib/company-check.ts`
- `frontend/src/components/company-check-shell.tsx`
- `src/test/java/io/ltj/nyfirmasjekk/companycheck/CompanyCheckServiceTests.java`
- `src/test/java/io/ltj/nyfirmasjekk/companycheck/CompanyCheckApiIntegrationTests.java`
- `src/test/java/io/ltj/nyfirmasjekk/api/v1/CompanyApiV1MapperTests.java`

### Verifisert i denne økten

```bash
./gradlew test
./gradlew test --tests io.ltj.nyfirmasjekk.companycheck.CompanyCheckServiceTests
./gradlew test --tests io.ltj.nyfirmasjekk.api.v1.CompanyApiV1MapperTests --tests io.ltj.nyfirmasjekk.companycheck.CompanyCheckApiIntegrationTests
cd frontend
npm run build
```

### Anbefalt startpunkt neste gang

- Start med aktørkontekst i backend og detaljvisning
- Avklar om aktørkontekst skal være snapshot-basert eller historikkbasert
- Deretter bygg strukturmønstre rundt nye selskaper
- To continue this session, run codex resume 019dab9b-00a0-75e3-a19b-3cd25cb152f6
