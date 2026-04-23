# TODO

## Nåværende prioritet

### Produksjon

- [ ] Verifiser `application-prod.properties` mot faktisk produksjonsmiljø
- [ ] Bekreft at produksjon ikke bruker H2 eller lokal filbasert database
- [ ] Sett eksplisitt produksjonsdatabase med riktige credentials via miljøvariabler eller secrets
- [ ] Bekreft at Flyway kjører automatisk og trygt i produksjon
- [ ] Test end-to-end mot BRREG fra et produksjonsnært miljø
- [ ] Dokumenter nødvendige miljøvariabler for backend og frontend

### Produkt

- [~] Utvid strukturmønstre fra første versjon til faktisk kryssselskapsanalyse på tvers av selskaper og tidslinjer
- [x] Definer første terskler for når aktørkontekst skal fremheves som relevant signal
- [x] Legg inn tomtilstander og fallback-visning når hendelser eller aktørdata mangler
- [x] Fas ut rå `announcements` fra detaljresponsen når `events` dekker UI-behovet fullt ut
- [x] Utvid aktørkontekst med første presise historikkfelt for sist sett rødt, konkurs og avvikling
- [~] Spisse verdiforslaget og CTA-er for kommersiell bruk mot nye virksomheter

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
- 2026-04-21: Status re-verifisert. `./gradlew test` og `frontend/npm run build` er fortsatt grønne etter siste UI- og API-opprydding.
- 2026-04-21: Frontend-skripter er gjort tryggere i dev. `.next` slettes ikke lenger automatisk før `dev`/`build`, og standard `npm run dev` bruker webpack i stedet for Turbopack.
- 2026-04-21: Første versjon av forklarbar aktørkontekst er levert i API og UI, inkludert telling av røde og avviklede selskaper per rolleholder og mer forklarende nettverksvisning.
- 2026-04-21: Første versjon av strukturmønstre er levert i detaljvisning med `structureSignals`, inkludert signaler for nytt selskap, konkurshistorikk, avviklingshistorikk, delte aktører og mulig omregistrering.
- 2026-04-21: Trefflisten bruker nå normaliserte `structureSignals` fra API-et i `CompanySummary`, i stedet for lokal frontend-utledning.
- 2026-04-21: Søket har fått eget filter for strukturspor (`Nytt selskap`, `Tynt datagrunnlag`, `Konkursspor`, `Avviklingsspor`).
- 2026-04-21: Trefflisten sorterer nå også på strukturspor, slik at selskaper med høyere relevante strukturmønstre løftes opp før kontaktbarhet og dato.
- 2026-04-21: Strukturspor i søk er utvidet videre med `Bo-signal`, `Aktørrisiko` og `Mulig omregistrering` i summary- og filterlaget.
- 2026-04-22: IDE-varsler er ryddet i `CompanyRoleSnapshotEntity`, `CompanyCheckController`, `CompanyApiV1Mapper` og `company-check-shell.tsx`.
- 2026-04-22: Frontend-lint er gjort kjørbar igjen med `eslint src`, kompatibel `eslint@9`, og grønn verifisering med `npm run lint` og `npx tsc --noEmit`.
- 2026-04-23: Første reelle kryssselskapsanalyse er innført med tidsnære strukturspor for relaterte konkurser, avviklinger og klynger av nye selskaper med samme aktører.
- 2026-04-23: Aktørkontekst har fått første terskelmodell med `ACTOR_CONTEXT_ELEVATED`, og UI løfter signalet i hurtigsjekk og treffliste når terskelen passeres.
- 2026-04-23: Tomtilstander i dyp analyse er strammet slik at manglende strukturmønstre, nettverk, historikk og hendelser forklares tydeligere.
- 2026-04-23: Rå `announcements` er fjernet fra detaljresponsen og frontend-kontrakten. Kunngjøringer brukes fortsatt internt til scoring og normaliserte `events`.
- 2026-04-23: Aktørkontekst er utvidet med `lastRedSeenAt`, `lastBankruptcySeenAt` og `lastDissolvedSeenAt`, og UI viser sist sett-datoer i nettverksdelen.
- 2026-04-23: Første kommersielle lead-visning er lagt inn i treffliste og hurtigsjekk, med CTA-er, nettside-/kontaktforklaring og demping av røde selskaper før salgsarbeid.

## Produktutvikling

### Merknad om retning

- Produksjonsklarhet er neste operative arbeidspakke for drift.
- Produktutvikling fortsetter parallelt rundt strukturmønstre, aktørkontekst og kommersiell retning.
- Delene under brukes som backlog for videre produktarbeid.

## BRREG-roadmap

### Kan bruke nå

- [x] Utnytt `underKonkursbehandling` mer direkte i søk og vurdering
- [x] Utnytt `underAvvikling` og `underTvangsavviklingEllerTvangsopplosning` mer systematisk i listefiltre
- [x] Bruk `registrertIForetaksregisteret` tydeligere som positivt struktursignal
- [x] Bruk `fraStiftelsesdato` og `tilStiftelsesdato` mer aktivt i modenhetsvurdering
- [x] Skill tydeligere mellom raske listefiltre og full detaljvurdering

### Høy produktverdi

- [x] Bygg tydelig hendelsesprofil per selskap: nyregistrering, vedtektsendring, adresseendring, avvikling, konkurs
- [x] Bygg første versjon av forklarbar aktørkontekst: hvor mange selskaper en rolleholder er knyttet til, og hvor mange av dem som er røde eller avviklet
- [~] Vis strukturmønstre rundt nye selskaper: samme personer, nylige konkurser, bo-signaler, omregistreringer
- [x] Gjør scoreforklaringen mer konkret i UI med registerspor i stedet for generelle etiketter
- [x] Introduser to nivåer i produktet: hurtigsjekk og dyp analyse

### Neste steg når du tar dette opp igjen

- [~] Innfør strukturmønstre rundt nye selskaper: tidsnær kryssselskapsanalyse er levert i detaljvisning; gjenstår eventuell søke-/summary-integrasjon og dypere historikkmodellering
- [x] Utvid aktørkonteksten videre med mer presis historikk, for eksempel når de røde eller avviklede selskapene ble sist sett
- [x] Vurder å vise relaterte selskaper med mer eksplisitt strukturstatus enn bare farge og avviklingsmarkør
- [~] Strukturspor i søk dekker nå bo-signal, aktørrisiko og mulig omregistrering; gjenstår dypere mønstre på tvers av flere selskaper og tidslinjer
- [x] Fas ut rå `announcements` fra detaljresponsen når `events` dekker UI-behovet fullt ut
- [ ] Rydd opp videre i domenespråket mellom backend og frontend rundt `mulighetssignal`, `registerspor` og `kontaktbarhet`
- [x] Vurder kommersielle CTA-er i hurtigsjekk og treffliste når aktørkontekst er på plass

### Backend-oppgaver

- [ ] Vurder om hendelser bør caches eller preberegnes for å unngå dyr detaljlasting
- [x] Utvid strukturmønstre fra snapshot-basert første versjon til kryssselskapsanalyse med tidsnærhet
- [x] Utvid aktørkontekst med mer presis historikk, for eksempel sist sett rødt eller avviklet
- [ ] Vurder precomputede signaler eller batch-oppdaterte felter for raskere søk og filtrering

### Frontend-oppgaver

- [x] Legg inn tomtilstander og fallback-visning når hendelser eller aktørdata mangler
- [x] Vurder å vise relaterte selskaper med enda tydeligere strukturstatus enn bare farge og avviklingsmarkør
- [ ] Stram videre inn domenespråket i UI rundt `mulighetssignal`, `registerspor` og `kontaktbarhet`

### Datamodell og avklaringer

- [x] Definer første terskler for når aktørkontekst skal fremheves som relevant signal
- [x] Avklar når rå `announcements` kan fases ut fra detaljresponsen
- [ ] Avklar om kommersiell visning skal tone ned vurderingsscore til fordel for `mulighetssignal`

### Krever mer integrasjon eller videre modellering

- [ ] Rollehistorikk og endring over tid
- [ ] Bedre tidslinje for strukturelle hendelser på tvers av kunngjøringer og snapshots
- [~] Mønstre på tvers av selskaper og personer, ikke bare enkeltoppslag
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
- [x] Legge inn tydelige CTA-er i trefflisten og detaljvisningen for tilbud om nettside
- [ ] Lage enkel landingsseksjon for tjenesten: nettside, domene, e-post og kontaktpunkt
- [ ] Definere et lavterskel tilbud med fast pris eller tydelig startpakke
- [~] Gjøre søket mer egnet for salgsarbeid: fremhev selskaper uten nettside eller med tynn offentlig profil
- [x] Vise hvorfor et selskap er relevant lead, ikke bare hvilken score det har
- [~] Lage enkel kontaktflyt fra UI til skjema, e-post eller CRM
- [ ] Vurdere om vurderingsscore skal tones ned til fordel for "mulighetssignal" i kommersiell visning
- [ ] Skrive kort, konkret salgsbudskap rettet mot nyregistrerte selskaper
- [ ] Bestemme om løsningen primært er et internt salgsverktøy, en offentlig landingsside eller begge deler

## Komprimert arbeidslogg

### Levert 2026-04-20 til 2026-04-23

- Fikset dublettreff i søk ved deduplisering på organisasjonsnummer før paginering
- Kjørt backend-testpakke grønn og holdt testene oppdatert
- Innført `CompanyEvent`, `ScoreEvidence`, `structureSignals`, hurtigsjekk/dyp analyse og første versjon av forklarbar aktørkontekst
- Utvidet treffliste, detaljvisning og søkefilter med strukturspor
- Innført tidsnær kryssselskapsanalyse og første terskelmodell for løftet aktørkontekst
- Fjernet rå `announcements` fra detaljrespons og frontend-kontrakt til fordel for normaliserte `events`
- Lagt til sist sett-historikk for røde, konkurs- og avviklingsspor i aktørkontekst
- Lagt inn første kommersielle lead-CTA i treffkort og hurtigsjekk, inkludert forklaring av nettside-/kontaktmulighet
- Ryddet frontend-devoppsett, IDE-varsler, lint og typecheck

### Stabil verifisering

```bash
./gradlew test
cd frontend
npm run lint
npx tsc --noEmit
```

### Dev-merknad

- Hvis en gammel `next dev`-prosess fortsatt kjører, stopp den før du starter en ny:

```bash
taskkill /PID <pid> /F
```

### Operativt neste steg

- Vurder om tidsnære kryssselskapsmønstre også bør integreres i søk/summary, eller om de bør holdes til dyp analyse
- Spiss forsiden og eventuelt egen landingsseksjon for nettside-startpakke til nye virksomheter
- Vurder materialiserte felter eller egen indeks hvis strukturfiltrering på tidsnære mønstre skal brukes i søk
