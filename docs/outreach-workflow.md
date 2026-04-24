# Outreach Workflow

## Mål

Dette oppsettet er laget for én bruker uten databasekostnad.

- autoritativ logg: `data/outreach-log.jsonl`
- arkiv for eldre måneder: `data/archive/outreach-log-YYYY-MM.jsonl`
- lesbar månedsrapport: `data/outreach-log-YYYY-MM.md`
- daglig synk: vanlig `git add`, `git commit`, `git push`

## Daglig bruk

1. Åpne appen og marker `E-post sendt om nettside til kr 4.500` når du faktisk har sendt.
2. Appen skriver en ny linje i `data/outreach-log.jsonl`.
3. Eldre måneder flyttes automatisk til `data/archive/`.
4. Appen oppdaterer samtidig månedlig Markdown-rapport i `data/outreach-log-YYYY-MM.md`.
5. Når du er ferdig for dagen, commit og push logg, arkiv og rapport.

## Neste dag

1. Hent siste endringer fra GitHub før du starter.
2. Åpne appen som normalt.
3. Status for tidligere kontaktede selskaper leses fra loggen.

## Viktig

- Dette er trygt nok for én bruker.
- Dette er ikke en god flerbrukerløsning.
- Uten persistent disk på Render kan lokale endringer forsvinne ved restart eller deploy hvis de ikke er pushet.
- Git brukes her som gratis historikk og manuell backup, ikke som database.
