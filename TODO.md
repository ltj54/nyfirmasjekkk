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

- [ ] Kjør full backend-testpakke og bekreft grønn build
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

## BRREG-roadmap

### Kan bruke nå

- [x] Utnytt `underKonkursbehandling` mer direkte i søk og vurdering
- [x] Utnytt `underAvvikling` og `underTvangsavviklingEllerTvangsopplosning` mer systematisk i listefiltre
- [x] Bruk `registrertIForetaksregisteret` tydeligere som positivt struktursignal
- [x] Bruk `fraStiftelsesdato` og `tilStiftelsesdato` mer aktivt i modenhetsvurdering
- [x] Skill tydeligere mellom raske listefiltre og full detaljvurdering

### Høy produktverdi

- [ ] Bygg tydelig hendelsesprofil per selskap: nyregistrering, vedtektsendring, adresseendring, avvikling, konkurs
- [ ] Bygg forklarbar aktørkontekst: hvor mange selskaper en rolleholder er knyttet til, og hvor mange av dem som er røde eller avviklet
- [ ] Vis strukturmønstre rundt nye selskaper: samme personer, nylige konkurser, bo-signaler, omregistreringer
- [ ] Gjør scoreforklaringen mer konkret i UI med registerspor i stedet for generelle etiketter
- [ ] Introduser to nivåer i produktet: hurtigsjekk og dyp analyse

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
