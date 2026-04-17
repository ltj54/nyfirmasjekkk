# TODO

Dette dokumentet er arbeidslisten for fase 5 i `nyfirmasjekk`.

## Ukeplan

### Gjør denne først

- Konsolider API til én offentlig flate
- Grunn: dette fjerner duplisering, gjør frontend/backend-retningen tydelig og forenkler de neste oppgavene

Status:
- Startet 2026-04-17
- `filters` er flyttet inn i `/api/company-check`, slik at frontend nå bruker samme backendflate for søk, detaljer, `history`, `network`, `events` og filtre
- Gradle-testene passerer etter endringen

### 1. Konsolider API til én offentlig flate
- Velg én API-kontrakt: `/api/company-check` eller `/api/v1`
- Oppdater frontend-proxyer til å bruke valgt flate
- Fjern eller marker gammel API som deprecated

Ferdig når:
- Alle frontend-kall går mot én API-flate
- Dupliserte endepunkter er borte eller deprecated
- Testene passerer

### 2. Legg til integrasjonstester for API-endepunkter
- Test søk, detaljer, `history`, `network` og `events`
- Test ugyldig orgnr, 404 og 502

Ferdig når:
- Kritiske endepunkter har integrasjonstester
- Feiltilfeller returnerer forventet status og format

### 3. Gjør databaseoppsettet miljøstyrt
- Innfør profiler for `dev`, `test` og `prod`
- Flytt databasevalg og JPA-oppsett til miljøspesifikk konfig

Ferdig når:
- Databasen styres av miljø/profil
- Produksjon bruker ikke ukritisk `ddl-auto=update`

### 4. Innfør databasemigreringer
- Velg Flyway eller Liquibase
- Lag første migrasjon for eksisterende tabeller

Ferdig når:
- Skjema opprettes via migrasjoner
- Skjemaendringer spores i repoet

### 5. Rydd frontend-kontrakten mot backend
- Normaliser proxy-ruter og responsbruk
- Rydd i TypeScript-typer som overlapper gammel og ny modell

Ferdig når:
- Frontend bruker én konsistent kontrakt
- TypeScript-typene stemmer med backendrespons

## Senere

- Caching for BRREG-oppslag
- Observability for søk og detaljvisning
- Datadrevne filtermetadata
- Tydelige empty states i UI
- Produksjonsklarhetssjekkliste
