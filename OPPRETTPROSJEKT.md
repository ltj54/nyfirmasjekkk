# Rutiner for nye IntelliJ-prosjekter

Bruk denne rutinen når Lars ber om et nytt, blankt prosjekt under `C:\Prosjekt\`. Les hele filen før opprettelsen. Et blankt prosjekt skal være selvstendig og klart for videre arbeid. Det innebærer ikke bestilling av et ferdig nettsted eller publisering.

## 1. Navn og plassering

- Bruk én prosjektmappe: `C:\Prosjekt\<prosjektnavn>`.
- Velg et kort navn med små bokstaver, bindestreker og uten mellomrom eller norske spesialtegn, for eksempel `idsoe-radgivning-nettside`. Virksomhetens riktige navn brukes i tekster og visningsnavn.
- Bruk samme tekniske navn på lokalmappe, GitHub-repository, modul og eventuell programpakke der det passer.
- Kontroller at målmappen ikke finnes fra før. Ikke overskriv eller bland inn et eksisterende prosjekt. Ved navnekollisjon: undersøk innholdet og avklar videre bruk.
- Sjekk relevante `AGENTS.md`-filer og eksisterende prosjektinstruksjoner før arbeidet.

## 2. Rent og selvstendig prosjekt

- Opprett bare den grunnstrukturen oppgaven trenger. Velg enklest mulig teknologi ut fra kjente behov; ikke legg til backend, database eller rammeverk uten grunn.
- Ikke kopier et annet kundeprosjekt med mindre Lars ber om det. Ved gjenbruk av en mal skal bare relevant, generell kode og oppsett tas med.
- Ikke arve `.git`, historikk, remotes, IntelliJ-arbeidsområde, kundedata, logoer, analyse-ID-er, Formspree-endepunkter, domener eller hemmeligheter fra et annet prosjekt.
- Ikke kopier `node_modules`, virtuelle Python-miljøer, byggmapper eller hurtiglagre. Avhengigheter installeres for det nye prosjektet ved behov.
- Bruk én Git-rot og ett planlagt GitHub-repository for prosjektet. Ikke lag et ekstra repository eller en klone inni prosjektet for publisering.
- Ikke opprett ChatGPT Sites-prosjekt eller Sites-konfigurasjon, inkludert `.openai/hosting.json`. Ikke bruk Sites til forhåndsvisning eller publisering.

## 3. Foretrukket teknologi for nettsider

Når oppgaven gjelder en vanlig nettside som kan publiseres statisk, er følgende teknologistakk førstevalget:

- **Next.js 16** som rammeverk for nettsiden, sidene og rutene. Prosjektet skal konfigureres for statisk eksport når det skal publiseres på GitHub Pages.
- **React 19** for komponenter og nødvendige interaktive funksjoner.
- **TypeScript** for typesikker kode. Unngå JavaScript-filer når det ikke finnes en konkret grunn til å bruke dem.
- **Vanlig CSS** for en egen, responsiv utforming uten et ferdig designsystem. Ikke legg til Tailwind, Bootstrap eller et komponentbibliotek uten at prosjektet trenger det eller Lars ber om det.
- **Next Image** for bildehåndtering. Konfigurer bilder slik at de fungerer med statisk eksport og prosjektets GitHub Pages-base path.
- **GitHub Pages** som foretrukket publiseringsløsning for statiske nettsteder når Lars ber om publisering.
- **GitHub Actions** for automatisk bygging og publisering til GitHub Pages etter at dette uttrykkelig er bestilt. Workflowen skal ikke opprettes som en skjult automatisk publiseringsmekanisme før publisering er avklart.
- **ESLint** for kontroll av kodekvalitet. Tilgjengelighet skal også kontrolleres gjennom semantisk HTML, tastaturbruk, kontraster, bilder og relevante lint-regler.
- **npm og Node.js** for pakkehåndtering, lokal utvikling og produksjonsbygg. Bruk prosjektets egen `package-lock.json`, og dokumenter nødvendige kommandoer i `README.md`.

Dette er et foretrukket utgangspunkt, ikke et krav dersom kundens behov tilsier en annen løsning. Backend, database, innlogging, CRM, betaling eller andre serverfunksjoner skal fortsatt velges og avklares ut fra kravspesifikasjonen; GitHub Pages alene kan ikke kjøre slike funksjoner.

Python skal ikke inngå i et vanlig nettsideprosjekt som standard. Ikke opprett Python-skript, virtuelt miljø, Python-hurtiglager eller Python-avhengigheter når Node/Next.js-verktøyene løser oppgaven. Bruk Python bare når en konkret oppgave krever det og nytten er tydelig dokumentert.

## 4. Stier og IntelliJ

- Prosjektrot og arbeidsmappe skal være `C:\Prosjekt\<prosjektnavn>`, aldri `C:\Prosjekt` alene eller en annen kundes mappe.
- Bruk prosjekt-relative stier, IntelliJ-variabelen `$PROJECT_DIR$` og stier beregnet fra skriptets egen plassering. Unngå hardkodede absolutte stier i kode og delte konfigurasjoner.
- Kontroller modulnavn, content root, source root, ressursmapper, byggutdata og kjørekonfigurasjoner. Eventuelle modulfilreferanser skal peke på filer i dette prosjektet.
- Kjøreskript skal fungere også når de startes fra en annen arbeidsmappe. De skal ikke opprette eller endre filer i `C:\Prosjekt` utenfor prosjektmappen.
- Operativsystemets installasjoner av Git, Node, Java eller Python kan ligge utenfor prosjektet. Kravet gjelder prosjektfiler og arbeidsmapper, ikke vanlige systemverktøy.
- For Node-prosjekter: legg `package.json` og relevant låsefil i riktig prosjekt-/applikasjonsmappe. Kontroller at verktøy ikke feilaktig velger `C:\Prosjekt` som workspace på grunn av overordnede låsefiler. Sett eksplisitt rot der teknologien krever det; ikke slett andre prosjekters eller overordnede filer.
- Ved GitHub Pages må lenker og ressurser fungere under `https://ltj54.github.io/<prosjektnavn>/`. Kontroller base path og intern navigasjon. Ikke sett et `CNAME` før domene er avklart.

## 5. Git og GitHub ltj54

- Klargjør lokal Git-versjonskontroll med `main` som hovedgren og en tilpasset `.gitignore`.
- Kontroller at prosjektet har sin egen Git-rot og ikke utilsiktet ligger under et annet repository.
- Dokumenter planlagt repository som `https://github.com/ltj54/<prosjektnavn>`. Når riktig repository er bekreftet, kan lokal `origin` settes til denne adressen.
- Ikke opprett repository på GitHub, commit, push eller publiser automatisk. Klargjøring lokalt er standard. Utfør slike handlinger når Lars uttrykkelig ber om dem; en tidligere tydelig bestilling innenfor samme oppgave gjelder fortsatt.
- Ingen automatisk «Commit and Push» i kjøreskript, IntelliJ-oppgaver eller Git-hooks. Utviklingskommandoer skal ikke publisere.
- Før en bestilt commit/push: kontroller Git-status, diff, gren, remote og filene som faktisk blir med. Ta bare med oppgavens filer.
- `.gitignore` må minst dekke hemmeligheter, lokale miljøfiler, IDE-arbeidsområde, avhengigheter og midlertidige filer. Tillat en ufarlig `.env.example` med plassholdere ved behov.
- Private kundemails, fakturaer, personopplysninger og interne notater skal holdes utenfor et offentlig repository. Dokumenter hvor slikt lagres lokalt, og hva som ignoreres. Husk at `.gitignore` ikke fjerner allerede sporede filer eller tidligere historikk.

## 6. Minimum av dokumentasjon

- Lag `README.md` med formål, lokal oppstart hvis det finnes kjørbar kode, nødvendige verktøy, mappestruktur og planlagt GitHub-adresse.
- Dokumenter hvilke kommandoer som bare kjører lokalt, og hvordan publisering eventuelt skal utføres senere.
- Lag en enkel kravspesifikasjon når kundeopplysninger er gitt. Skill mellom bekreftede ønsker, forslag og åpne spørsmål. Ikke fyll manglende opplysninger med oppdiktede fakta.
- Legg gjerne en kort `AGENTS.md` i det nye prosjektet som gjentar: selvstendige stier, ingen Sites og ingen commit/push/publisering uten bestilling. Dette gjør reglene tilgjengelige når prosjektet åpnes i et nytt vindu.
- Ikke opprett et CRM-kort automatisk. Oppdater et eksisterende kort med lokal sti og avtalte prosjektopplysninger når det inngår i oppgaven. Nye CRM-kort opprettes bare når Lars ber om det.

## 7. Publisering når Lars ber om det

- Kontroller GitHub-kontoen `ltj54`, repository-navn og synlighet. Følg Lars' valg om offentlig/private filer og repository.
- Bruk GitHub Pages for kompatible statiske nettsteder når det er ønsket. Et repository på GitHub alene gjør ikke nettstedet tilgjengelig for kunden.
- Backend, database og serverbaserte funksjoner trenger en egnet driftsløsning; avklar denne før publisering. Ikke anta at GitHub Pages kan kjøre dem.
- Kontroller at bare nettstedets offentlige filer inngår i publiseringen.
- Verifiser den faktiske nettadressen etter publisering, inkludert intern navigasjon og ressurser. Noter kundens testlenke når den er bekreftet.
- Kontaktskjemaer skal ha en avklart mottaker og tjeneste før de aktiveres. En demonstrasjon skal tydelig fremstå som en demonstrasjon.
- Domenet skal eies av kunden når dette avtales. Ikke endre DNS eller eksisterende e-postoppsett som en del av å opprette et blankt prosjekt.

## 8. Kontroll og overlevering

1. Bekreft at alle prosjektfiler ligger i riktig mappe, og at IntelliJ kan åpne prosjektet derfra.
2. Søk etter gamle prosjektnavn, absolutte stier til andre prosjekter og feil bruk av `C:\Prosjekt` som rot eller arbeidsmappe.
3. Kontroller Git-rot, gren, remote dersom satt, `.gitignore` og Git-status.
4. Kontroller at ingen Sites-konfigurasjon eller automatisk commit/push er lagt inn.
5. Hvis prosjektet har kjørbar kode, prøv relevante oppstarts-/byggkommandoer. Et rent dokumentasjonsprosjekt trenger ikke en kunstig applikasjon eller testpakke.
6. Oppsummer konkret: opprettet mappe, hva som er klart, hva som er kontrollert, og om repository, commit, push og publisering faktisk er utført eller bare planlagt.

Ved senere avvikling brukes `SLETTERUTINER.md` i nyfirmasjekk-prosjektet.
