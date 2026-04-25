# TODO

## Status 2026-04-25

### Beslutning

- Applikasjonen skal være et øyeblikksbilde av åpne BRREG-data.
- Appen skal ikke ha database, Flyway, H2, JPA eller intern snapshot-lagring.
- Historikk, nettverk og aktørrisiko skal ikke akkumuleres i appen nå.
- Det eneste som skal lagres mellom dager er outreach/loggfilene for utsendelser og notater.
- Løsningen er først og fremst énbruker og filbasert.

### Levert

- Hovedsiden er forenklet og visuelt strammet inn.
- Selskapsdetaljer åpnes som stor modal over hovedsiden, ikke som egen side.
- `Hurtigsjekk` og `Dyp analyse` er slått sammen til én sammenhengende detaljvisning.
- Søkeboksen er fjernet fra hovedsiden.
- Klikk i trefflisten går bare til detaljvisning.
- E-post, telefonnummer og webadresser i hovedkort er ikke lenger klikkbare.
- Strukturspor er fjernet som eget toppnivåfilter.
- Startpakke-/markedsføringstekst er fjernet fra hovedsiden.
- `Lead-kriterier` og `Flyt` står igjen som enkel praktisk forklaring.
- Bunntekst er fjernet.
- Trefflisten viser e-post tydelig når den finnes.
- Gule treff med registrert e-post prioriteres høyere i sortering.
- Treff uten registrert e-post tones ned kommersielt.
- Mulig nettside oppdages med navnheuristikk, reachability-sjekk og enkel innholdsmatch.
- Sannsynlig nettside demper lead-signal.
- Registrerte hendelser bruker konsekvent datoformat `YYYY-MM-DD`.
- Filbasert utsendelseslogg er på plass med `data/outreach-log.jsonl`.
- Eldre måneder arkiveres automatisk til `data/archive/outreach-log-YYYY-MM.jsonl`.
- Månedlig Markdown-rapport genereres automatisk som `data/outreach-log-YYYY-MM.md`.
- Treffkort og selskapsvisning kan markeres med `E-post sendt om nettside til kr 4.500`.
- Feltet for utsendt e-post er ikke klikkbart på hovedsiden.
- Utsendelsesnotat kan lagres fra detaljvisningen.
- Selskaper kan markeres som `Ikke aktuell`.
- Hovedsiden har egen `Utsendelser`-oversikt som viser selskaper som har fått tilbudsmail.
- Dobbel utsendelse krever eksplisitt overstyring i detaljvisningen.
- Mailtekst genereres fra [outreach-email-template.md](data/outreach-email-template.md).
- `Kopier mailtekst` og `Åpne i e-post` har nøytral knappestil.
- `Åpne i e-post` åpner mail i nytt vindu.
- `Kontakt via e-post` er fjernet.
- Pris er skrevet som `4.500`.
- Énbruker-flyt er dokumentert i [outreach-workflow.md](docs/outreach-workflow.md).
- Databaseoppsett er fjernet fra backend.
- `spring-boot-starter-data-jpa`, Flyway og H2 er fjernet fra `build.gradle`.
- `application-dev.properties`, `application-test.properties` og `application-prod.properties` med datasource-oppsett er fjernet.
- Flyway-migrasjoner er fjernet.
- H2-startvakt er fjernet.
- Snapshot-services, repositories, entities og tester for historikk/nettverk er fjernet.
- Aktørrisiko er no-op i denne øyeblikksbildeversjonen.
- `/history` og `/network` returnerer tomme lister.
- Metadata for organisasjonsformer kommer fra statisk katalog, ikke historikk.

## Neste steg

### Viktigst

- [ ] Test hele brukerflyten manuelt etter oppryddingen: filtrer treff, åpne detaljmodal, generer mailtekst, kopier, åpne i e-post, marker sendt, marker ikke aktuell, se `Utsendelser`.
- [ ] Sjekk at appen starter rent uten databasekonfigurasjon lokalt og på Render.
- [ ] Avklar om `history` og `network`-endepunktene skal beholdes som tomme kompatibilitetsendepunkter eller fjernes helt fra API/frontend.
- [ ] Rydd UI for historikk/nettverk dersom tomme seksjoner fortsatt vises i detaljmodalen.
- [ ] Bekreft at outreach-loggene er eneste ønskede persistente data i drift.

### Utsendelseslogg

- [x] Lag filbasert logg for utsendelser.
- [x] Lag månedlig Markdown-rapport.
- [x] Arkiver eldre måneder automatisk.
- [x] Lag `Utsendelser`-oversikt.
- [x] Lag `Ikke aktuell`.
- [x] Lag notatfelt og hurtigvalg i detaljvisning.
- [ ] Dokumenter tydelig at `data/` må være persistent hvis Render brukes.
- [ ] Bestem om `data/outreach-log.jsonl` og månedsrapportene skal committes til Git eller holdes utenfor Git og eksporteres manuelt.
- [ ] Vurder enkel backup-knapp eller eksportlenke for outreach-loggen.
- [ ] Vurder import fra loggfil hvis appen flyttes til ny maskin.

### Produkt

- [ ] Bestem om løsningen bare skal være intern arbeidsflate eller også ha en offentlig landingsside.
- [ ] Stram teksten videre rundt `Sterkt signal`, `Mulig signal` og `Svakt signal`.
- [ ] Gjør detaljvisningen enda mer operativ: tydelig kontaktpunkt, mulig nettside, mailtekst og status øverst.
- [ ] Vurder om leadlisten bør ha egne hurtigfiltre for `Har e-post`, `Mangler nettside`, `Ikke sendt` og `Ikke aktuell`.
- [ ] Vurder om `Alvorlige signaler` skal skjules som standard i en salgslead-flyt.

### Produksjon

- [ ] Test end-to-end mot BRREG fra produksjonsnært miljø.
- [ ] Dokumenter nødvendige miljøvariabler for backend og frontend.
- [ ] Verifiser logging, CORS, health endpoints og proxy-oppsett.
- [ ] Avklar hvordan `data/` håndteres på Render uten database.
- [ ] Hvis persistent disk ikke brukes: lag tydelig manuell rutine for nedlasting/backup av loggfilene.

### Ikke nå

- [ ] Ikke innfør database før flerbruker eller ekte historikk blir et krav.
- [ ] Ikke bygg videre på aktørrisiko eller kryssselskapsanalyse før produktet faktisk trenger historikk.
- [ ] Ikke reintroduser Flyway/JPA/H2 uten en konkret lagringsbeslutning.
- [ ] Ikke bygg CRM-integrasjon før den manuelle outreach-flyten er testet.

## Verifisering

```bash
./gradlew test
cd frontend
npm run lint
npx tsc --noEmit
```
