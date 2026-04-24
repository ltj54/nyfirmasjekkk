# TODO

## Status 2026-04-24

### Levert

- Hovedsiden og selskapsvisningen er forenklet og visuelt strammet inn
- Selskapsdetaljer åpnes som stor modal over hovedsiden, ikke som egen side
- `Hurtigsjekk` og `Dyp analyse` er slått sammen til én sammenhengende visning
- Trefflisten viser e-post tydelig når den finnes
- Gule treff med registrert e-post prioriteres høyere i sortering
- Treff uten registrert e-post tones ned kommersielt
- Mulig nettside oppdages med navnheuristikk, reachability-sjekk og enkel innholdsmatch
- Sannsynlig nettside demper lead-signal
- Historikk komprimeres, like snapshots grupperes og ren støy skjules
- Registrerte hendelser bruker konsekvent datoformat `YYYY-MM-DD`
- Strukturspor brukes fortsatt i summary, sortering og detaljvisning
- Strukturspor er fjernet som eget toppnivåfilter i hovedsøket
- Filbasert utsendelseslogg er på plass med `data/outreach-log.jsonl`
- Eldre måneder arkiveres automatisk til `data/archive/outreach-log-YYYY-MM.jsonl`
- Månedlig Markdown-rapport genereres automatisk som `data/outreach-log-YYYY-MM.md`
- Treffkort og selskapsvisning kan markeres med `E-post sendt om nettside til kr 4.500`
- Utsendelsesnotat kan lagres fra UI, med faste hurtigvalg for vanlige oppfølgingsnotater
- Dobbel utsendelse krever eksplisitt overstyring
- Mailtekst genereres fra [outreach-email-template.md](data/outreach-email-template.md)
- `Kopier mailtekst` og `Åpne i e-post` er koblet til selskapsvisningen
- Énbruker-flyt er dokumentert i [outreach-workflow.md](docs/outreach-workflow.md)

## Neste steg

### Kommersiell flyt

- [ ] Bestem om løsningen primært er internt salgsverktøy, offentlig side eller begge deler
- [ ] Bestem endelig pakkestruktur og prisvisning for nettsidetilbudet
- [ ] Bestem om leadflyten skal gå til manuell oppfølging, skjema eller CRM
- [ ] Vurder om vurderingsscore skal tones mer ned til fordel for `Sterkt signal`, `Mulig signal` og `Svakt signal`
- [ ] Stram videre inn teksten i UI rundt `mulighetssignal`, `registerspor` og `kontaktbarhet`

### Utsendelseslogg

- [x] Utvid loggformatet slik at hver hendelse tydelig lagrer dato/tid, orgnr, navn, pris, kanal, status og notat
- [x] Lag rullerende Markdown-rapport, for eksempel `data/outreach-log-YYYY-MM.md`
- [x] Roter eller arkiver loggen per måned så den ikke vokser uoversiktlig
- [ ] Dokumenter tydelig at filbasert lagring krever persistent disk på Render for å være trygg ved restart/deploy
- [ ] Hvis persistent disk ikke brukes: avklar manuell Git-basert eksport/import eller annen billig lagring

### Flerbruker

- [x] Avklar om løsningen bare skal brukes av én person eller flere
- [ ] Hvis flere skal bruke den: innfør innlogging før utsendelsesloggen brukes operativt
- [ ] Hvis flere skal bruke den: bytt fra fil/GitHub-modell til delt database
- [ ] Design loggformatet slik at `userId` og `userEmail` kan legges til uten omskriving
- [ ] Vurder enkel auth + database hvis flerbruker blir aktuelt, for eksempel Supabase Auth + Postgres

### Produkt og data

- [ ] Utvid kryssselskapsanalyse videre med dypere mønstre på tvers av selskaper og tidslinjer
- [ ] Vurder om tidsnære strukturmønstre også skal løftes tydeligere i trefflisten
- [ ] Vurder precomputede signaler eller batch-felter for raskere søk og enklere sortering
- [ ] Vurder om hendelser bør caches eller preberegnes for å redusere dyr detaljlasting
- [ ] Bygg videre på rollehistorikk og endringer over tid hvis dette gir tydelig verdi i UI

### Produksjon

- [ ] Verifiser `application-prod.properties` mot faktisk produksjonsmiljø
- [ ] Bekreft at produksjon ikke bruker H2 eller lokal filbasert database
- [ ] Sett eksplisitt produksjonsdatabase med riktige credentials via miljøvariabler eller secrets
- [ ] Bekreft at Flyway kjører automatisk og trygt i produksjon
- [ ] Test end-to-end mot BRREG fra et produksjonsnært miljø
- [ ] Dokumenter nødvendige miljøvariabler for backend og frontend
- [ ] Verifiser logging, CORS, health endpoints og proxy-oppsett i produksjon

## Anbefalt rekkefølge

1. Avklar énbruker vs flerbruker
2. Avklar hvordan utsendelsesloggen faktisk skal lagres i drift
3. Bestem kommersiell flyt: pris, pakke og oppfølging
4. Deretter: videre produktforbedringer i strukturmønstre og precomputede signaler

## Verifisering

```bash
./gradlew test
cd frontend
npm run lint
npx tsc --noEmit
```
