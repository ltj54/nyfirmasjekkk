# Outreach Workflow

## Mål

Dette oppsettet er laget for én bruker uten databasekostnad.

- autoritativ logg: `data/outreach-log.jsonl`
- arkiv for eldre måneder: `data/archive/outreach-log-YYYY-MM.jsonl`
- lesbar månedsrapport: `data/outreach-log-YYYY-MM.md`
- lagrede data: bare outreach/logg, ikke BRREG-historikk, nettverk eller snapshots
- daglig backup: vanlig `git add`, `git commit`, `git push` eller `Last ned logg` fra `Utsendelser`

## Daglig bruk

1. Åpne appen og marker `E-post sendt om nettside til kr 4.500` når du faktisk har sendt.
2. Appen skriver en ny linje i `data/outreach-log.jsonl`.
3. Eldre måneder flyttes automatisk til `data/archive/`.
4. Appen oppdaterer samtidig månedlig Markdown-rapport i `data/outreach-log-YYYY-MM.md`.
5. Bruk `Last ned logg` i `Utsendelser` hvis du vil hente en samlet JSONL-eksport fra aktiv logg og arkiv.
6. Når du er ferdig for dagen, commit og push logg, arkiv og rapport hvis Git er valgt backup-rutine.

## Neste dag

1. Hent siste endringer fra GitHub før du starter.
2. Åpne appen som normalt.
3. Status for tidligere kontaktede selskaper leses fra loggen.

## Flytting til ny maskin

1. Last ned JSONL-loggen fra `Utsendelser`.
2. Start appen på ny maskin.
3. Bruk `Importer logg` i `Utsendelser`.
4. Appen hopper over linjer som allerede finnes og oppdaterer månedsrapportene.

## Viktig

- Dette er trygt nok for én bruker.
- Dette er ikke en god flerbrukerløsning.
- Uten persistent disk på Render kan lokale endringer forsvinne ved restart eller deploy hvis de ikke er pushet.
- Git brukes her som gratis historikk og manuell backup, ikke som database.
- På Render må `data/` ligge på persistent disk hvis appen skal huske utsendelser mellom restart/deploy uten manuell Git-rutine.
- Hvis persistent disk ikke brukes, må `data/outreach-log.jsonl`, `data/outreach-log-YYYY-MM.md` og `data/archive/` lastes ned eller committes før restart/deploy.
- Eksporten fra UI er ment som backup/transportformat. Markdown-rapporten er lesbar oversikt, men JSONL-filen er den autoritative loggen.
