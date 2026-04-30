# TODO

## Status 2026-04-27

### Beslutning

- Applikasjonen skal være et øyeblikksbilde av åpne BRREG-data.
- Appen skal ikke ha database, Flyway, H2, JPA eller intern snapshot-lagring.
- Historikk, nettverk og aktørrisiko skal ikke akkumuleres i appen nå.
- Det eneste som skal lagres mellom dager er outreach/loggfilene for utsendelser og notater.
- Outreach-loggfiler er append-only historikk og skal ikke redigeres eller slettes manuelt; feil korrigeres med nye hendelser.
- Løsningen er først og fremst énbruker og filbasert.
- Løsningen skal være en intern arbeidsflate, ikke en offentlig landingsside.
- Dagens oppsett uten database, aktørrisiko, historikk og CRM-integrasjon fungerer som ønsket nå.

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
- Nettsideforslag håndterer nå romertall/tall i selskapsnavn, f.eks. `FONNES BÅTSERVICE II AS` -> `fonnesbatservice.no`.
- Nettsideforslag håndterer typiske struktursuffiks (`HOLDING`, `EIENDOM`, `INVEST`, `Norge/Norway`) og `og`/`&`-varianter.
- Nettsideforslag tar med bindestrekvarianter som sekundære forslag, f.eks. `fonnes-batservice.no`.
- Nettsideforslag håndterer lange bransjenavn bedre, f.eks. `ROMERIKE RENHOLD OG VEDLIKEHOLDSSERVICE AS` -> `romerikerenhold.no` og `romerikerenholdservice.no`.
- Generiske e-postdomener som `yahoo.no`, `hotmail.no`, `outlook.no` og lignende blokkerer ikke lenger navnebaserte nettsideforslag.
- Innholdsmatch for mulig nettside tåler mellomrom og romertall/tall bedre.
- Lead-klassifisering er samlet i én felles vurdering slik at badge, sortering og kommersiell tekst ikke viser motstridende leadvurderinger.
- UI skiller nå tydelig mellom `Registerstatus` (`Ryddig registerstatus`, `Begrenset registerinfo`, `Alvorlige registerspor`) og `Leadvurdering` (`Sterkt lead`, `Mulig lead`, `Svakt lead`).
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
- `Utsendelser` har nedlasting av autoritativ JSONL-logg for backup/eksport.
- `Utsendelser` kan importere autoritativ JSONL-logg ved flytting til ny maskin.
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
- `/history` og `/network` er fjernet fra API-et.
- Historikk- og nettverksseksjoner er fjernet fra detaljvisningen.
- Metadata for organisasjonsformer kommer fra statisk katalog, ikke historikk.
- Leadlisten har hurtigfiltre for `Har e-post`, `Mangler nettside`, `Ikke sendt` og `Ikke aktuell`.
- `data/`-strategien er dokumentert i [outreach-workflow.md](docs/outreach-workflow.md).
- Frontend production build er gjort uavhengig av Google Fonts/nettverk.
- Appen er verifisert uten databaseavhengigheter gjennom backend-tester og Spring Boot-startforsøk.

## Neste steg

### Viktigst

- [x] Test hele brukerflyten manuelt etter oppryddingen: filtrer treff, åpne detaljmodal, generer mailtekst, kopier, åpne i e-post, marker sendt, marker ikke aktuell, se `Utsendelser`.
- [x] Sjekk at appen starter rent uten databasekonfigurasjon lokalt.
- [x] Sjekk Render-start etter deploy, spesielt at `data/` peker til ønsket persistent plassering.
- [x] Fjern `history` og `network` fra API/frontend i øyeblikksbildeversjonen.
- [x] Rydd UI for historikk/nettverk i detaljmodalen.
- [x] Bekreft at outreach-loggene er eneste ønskede persistente data i drift.

### Utsendelseslogg

- [x] Lag filbasert logg for utsendelser.
- [x] Lag månedlig Markdown-rapport.
- [x] Arkiver eldre måneder automatisk.
- [x] Lag `Utsendelser`-oversikt.
- [x] Lag `Ikke aktuell`.
- [x] Lag notatfelt og hurtigvalg i detaljvisning.
- [x] Dokumenter tydelig at `data/` må være persistent hvis Render brukes.
- [x] Beslutt at outreach-loggene er append-only og ikke skal endres manuelt.
- [x] Bestem endelig rutine: commit `data/outreach-log.jsonl` og månedsrapportene til privat Git, eller hold dem lokalt og eksporter manuelt.
- [x] Lag enkel eksportlenke for outreach-loggen.
- [x] Lag import fra JSONL-loggfil hvis appen flyttes til ny maskin.

### Produkt

- [x] Bestem om løsningen bare skal være intern arbeidsflate eller også ha en offentlig landingsside: bare intern arbeidsflate.
- [x] Stram teksten videre rundt `Sterkt lead`, `Mulig lead` og `Svakt lead`.
- [x] Gjør detaljvisningen enda mer operativ: tydelig kontaktpunkt, mulig nettside, mailtekst og status øverst.
- [x] Vurder om leadlisten bør ha egne hurtigfiltre for `Har e-post`, `Mangler nettside`, `Ikke sendt` og `Ikke aktuell`.
- [x] Vurder om `Alvorlige registerspor` skal skjules som standard i en salgslead-flyt.

### Produksjon

- [x] Test end-to-end mot BRREG fra produksjonsnært miljø.
- [x] Dokumenter nødvendige miljøvariabler for backend og frontend, inkludert `company-check.outreach-log-path` ved drift.
- [x] Verifiser logging, CORS, health endpoints og proxy-oppsett.
- [x] Avklar hvordan `data/` håndteres på Render uten database.
- [x] Hvis persistent disk ikke brukes: lag tydelig manuell rutine for nedlasting/backup av loggfilene.

### Ikke nå

- [x] Ikke innfør database før flerbruker eller ekte historikk blir et krav.
- [x] Ikke bygg videre på aktørrisiko eller kryssselskapsanalyse før produktet faktisk trenger historikk.
- [x] Ikke reintroduser Flyway/JPA/H2 uten en konkret lagringsbeslutning.
- [x] Ikke bygg CRM-integrasjon før den manuelle outreach-flyten er testet.

## Verifisering

```bash
./gradlew test
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

Sist kjørt 2026-04-27: `./gradlew test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
Merk: `bootRun` på standardport feilet fordi `8080` allerede var i bruk, ikke på grunn av databasekonfigurasjon. Start på tilfeldig port ble holdt i gang til timeout.
