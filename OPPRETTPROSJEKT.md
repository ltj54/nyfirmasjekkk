# Rutiner for nye IntelliJ-prosjekter

Bruk denne rutinen når Lars ber om et nytt, blankt prosjekt under `C:\Prosjekt\`. Les hele filen før opprettelsen. Et blankt prosjekt skal være selvstendig og klart for videre arbeid. For et vanlig nettsideprosjekt er standardmålet en offentlig tilgjengelig forhåndsvisning på GitHub Pages under kontoen `ltj54`, med mindre Lars uttrykkelig sier at prosjektet bare skal være lokalt eller ikke skal publiseres ennå. Dette betyr ikke at manglende innhold eller uavklarte kundekrav skal fylles inn med gjetninger.

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
- **GitHub Pages** som standard publiseringsløsning for statiske nettsteder. Målet er en offentlig testlenke på `https://ltj54.github.io/<prosjektnavn>/` som flere kan åpne.
- **GitHub Actions** for automatisk bygging og publisering til GitHub Pages etter en bevisst push. Workflowen kan inngå i standardoppsettet, men den skal aldri committe eller pushe lokale endringer på egen hånd.
- **ESLint** for kontroll av kodekvalitet. Tilgjengelighet skal også kontrolleres gjennom semantisk HTML, tastaturbruk, kontraster, bilder og relevante lint-regler.
- **npm og Node.js** for pakkehåndtering, lokal utvikling og produksjonsbygg. Bruk prosjektets egen `package-lock.json`, og dokumenter nødvendige kommandoer i `README.md`.

### Utforming som ikke ser KI-generert ut

- Headeren skal som standard være **sticky** og forbli synlig når brukeren scroller. Bruk for eksempel `position: sticky`, `top: 0` og en gjennomtenkt `z-index`, med en dekkende eller lesbar bakgrunn. Kontroller at headeren fungerer på mobil, ikke hopper i høyde og ikke skjuler innhold eller ankerlenker. Bruk nødvendig `scroll-margin-top` eller tilsvarende på målseksjoner.
- Ikke bruk dekorative seksjonsnumre som `01`, `02`, `03` eller lignende. De tilfører sjelden mening og er blitt et typisk generert designmønster.
- Ikke fall tilbake på den samme oppskriften med enorm overskrift, tre like kort, nummererte seksjoner og en generell avslutningsknapp. Struktur, rytme, typografi og navigasjon skal velges ut fra den konkrete virksomheten og materialet som faktisk finnes.
- Hver side skal ha minst ett tydelig særtrekk som springer ut av virksomheten: arbeidsprosess, materiale, sted, fag, produkter, bilder, tonefall eller måten kunden faktisk møter sine kunder på. Særtrekket skal påvirke både oppbygning og uttrykk, ikke bare nevnes i en overskrift.
- Skriv kortere og mer konkret. Fjern setninger som kunne stått på en hvilken som helst nettside. Unngå særlig formuleringer som «skreddersydde løsninger», «vi brenner for», «din visjon», «reisen starter her», «der kvalitet møter ...», «mer enn bare ...», «opplev forskjellen», «i hjertet av», «med lidenskap for», «unik kombinasjon», «moderne og profesjonell» og andre ubegrunnede superlativer.
- Ikke bruk ord som «unik», «ledende», «eksklusiv», «autentisk», «kvalitet» eller «profesjonell» som pynt. Bruk dem bare når innholdet viser konkret hva påstanden bygger på.
- Foretrekk navn på faktiske tjenester, materialer, steder, arbeidsmåter og valg fremfor abstrakte løfter. «Vi reparerer tregulv i Bergen og omegn» er bedre enn «Vi skaper varige resultater med kvalitet i fokus».
- Ikke dikt opp sitater, statistikk, kundegrunnlag, faglige egenskaper, historie eller personlighet for å gjøre siden mer levende. Når fakta eller kundemateriale mangler, skal designet tåle tomrommet og åpne spørsmål skal dokumenteres.
- Varier komposisjonen mellom prosjekter. Et kunstprosjekt kan være billedstyrt og stille; en håndverker kan trenge tjenester, område og referanser først; en rådgiver kan trenge problem, metode og målgruppe. Ikke kopier tidligere kundeprosjekters visuelle signatur.
- Les all synlig tekst høyt før ferdigstilling. Hvis teksten høres ut som reklamespråk Lars eller kunden ikke naturlig ville brukt, skriv den om. Målet er en tydelig menneskelig stemme, ikke maksimal mengde salgstekst.

### Kontaktskjema og FormSubmit.co

- **FormSubmit.co** er foreløpig standardvalget når en vanlig statisk nettside senere skal få et enkelt kontaktskjema uten egen backend.
- I første skisse skal kontaktskjemaet bare gjøres visuelt og teknisk klart. Det skal ikke være koblet til FormSubmit.co, en mottakeradresse eller noen annen innsendingstjeneste.
- Skjemaet skal ikke ha en aktiv `action` mot FormSubmit.co, og sendeknappen skal ikke kunne sende eller gjøre et nettverkskall. Bruk en deaktivert knapp eller `type="button"` uten sendehåndtering. Ikke vis en falsk bekreftelse på at noe er sendt.
- Ikke legg kundens e-postadresse i et FormSubmit-endepunkt eller skjult felt før mottaker og aktivering er uttrykkelig avklart med Lars.
- Ikke test skjemaet ved å sende en melding. Første reelle innsending kan utløse en e-post fra FormSubmit.co der mottakeren blir bedt om å aktivere eller godkjenne skjemaet. En slik e-post skal aldri utløses mens siden bare er et forslag.
- Aktivering av FormSubmit.co er en separat, uttrykkelig handling etter at Lars har godkjent mottakeradressen og bedt om at skjemaet settes i drift. Aktivering inngår ikke automatisk i opprettelse, publisering eller utsending av en skisse.
- Skjemaet skal som standard ha denne synlige strukturen og teksten, tilpasset samme språk som siden:

```text
Din melding
Navn
Hva heter du?
E-post
din@epost.no
Melding
Skriv meldingen din her …

Send melding
Skjemaet åpnes for innsending når kontakttjenesten er klar. Bruk e-postadressen ved siden av i mellomtiden.
```

- Bruk synlige og korrekt tilknyttede `label`-elementer, relevante `autocomplete`-verdier og tydelig deaktivert tilstand. Når skjemaet senere aktiveres, skal personvern, mottakeradresse, POST-innsending og nødvendige FormSubmit-innstillinger kontrolleres før publisering.

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
- Når Lars ber om å kjøre `OPPRETTPROSJEKT.md` for et vanlig nettsideprosjekt, regnes dette som bestilling av en første offentlig GitHub Pages-forhåndsvisning under `ltj54`, med mindre han uttrykkelig sier «bare lokalt», «ikke publiser ennå» eller tilsvarende.
- Førstegangspubliseringen kan derfor omfatte opprettelse av repository og én bevisst første commit og push som er nødvendig for å få GitHub Pages på nett. Dette skal være en kontrollert del av den konkrete oppgaven, ikke en automatisk bakgrunnshandling.
- Ingen automatisk «Commit and Push» i kjøreskript, IntelliJ-oppgaver, Git-hooks, filovervåkere eller andre arbeidsflyter. Lokale utviklingskommandoer skal aldri committe eller pushe.
- Etter førstegangspubliseringen skal senere endringer forbli lokale inntil Lars uttrykkelig ber om en ny commit og push. En bestilling om å endre kode er ikke i seg selv en bestilling om å publisere endringen.
- Før hver commit/push: kontroller Git-status, diff, gren, remote og filene som faktisk blir med. Ta bare med oppgavens filer.
- `.gitignore` må minst dekke hemmeligheter, lokale miljøfiler, IDE-arbeidsområde, avhengigheter og midlertidige filer. Tillat en ufarlig `.env.example` med plassholdere ved behov.
- Private kundemails, fakturaer, personopplysninger og interne notater skal holdes utenfor et offentlig repository. Dokumenter hvor slikt lagres lokalt, og hva som ignoreres. Husk at `.gitignore` ikke fjerner allerede sporede filer eller tidligere historikk.

## 6. Minimum av dokumentasjon

- Lag `README.md` med formål, lokal oppstart hvis det finnes kjørbar kode, nødvendige verktøy, mappestruktur og planlagt GitHub-adresse.
- Dokumenter hvilke kommandoer som bare kjører lokalt, hvordan den første GitHub Pages-publiseringen utføres, og at senere endringer ikke publiseres før en ny uttrykkelig commit/push-bestilling.
- Lag en enkel kravspesifikasjon når kundeopplysninger er gitt. Skill mellom bekreftede ønsker, forslag og åpne spørsmål. Ikke fyll manglende opplysninger med oppdiktede fakta.
- Lag alltid `AVTALEUTKAST_NETTSIDE_OG_DRIFT.md` i det nye prosjektet med utgangspunkt i `C:\Prosjekt\nyfirmasjekk\docs\AVTALEUTKAST_NETTSIDE_OG_DRIFT.md`. Tilpass avtaleutkastet med riktige kunde-, prosjekt- og kontaktopplysninger som er kjent. Pris, leveranse, domene, hosting, drift, vedlikehold, tidsfrister og andre uavklarte vilkår skal merkes tydelig som uavklart og aldri gjettes. Behold avtalen som et internt utkast inntil innholdet er gjennomgått og godkjent for utsendelse.
- Legg gjerne en kort `AGENTS.md` i det nye prosjektet som gjentar: selvstendige stier, ingen Sites, offentlig GitHub Pages som standardmål for første forhåndsvisning, og ingen automatisk eller senere commit/push uten uttrykkelig bestilling. Dette gjør reglene tilgjengelige når prosjektet åpnes i et nytt vindu.
- Når denne rutinen kjøres, opprett eller oppdater ett CRM-kort for prosjektet i nyfirmasjekk. Bruk kjent virksomhetsidentitet og lokal prosjektsti, samt verifisert testlenke når den finnes. Unngå dubletter ved å kontrollere eksisterende kort først.
- Skill tydelig mellom skisse, kundens svar, inngått avtale, levering, fakturering og betaling. Uavklarte forhold skal stå som uavklart; en publisert forhåndsvisning er ikke en bestilling eller en sendt skisse. Ikke opprett automatisk e-post, purring eller oppfølgingshendelse.
- Et nytt prosjekt og CRM-kort skal som standard holdes utenfor alle automatiske utsendelses- og oppfølgingslister. Registrer kundesvar i eksisterende utsendelseslogg når det finnes en tidligere henvendelse, slik at en planlagt automatisk oppfølging stoppes. Ikke sett manuell oppfølgingsdato eller foreslå ny kontakt bare fordi en forhåndsvisning er laget. Tidligere manuelle saker for samme virksomhet skal knyttes som historikk til prosjektkortet, ikke vises som en ekstra oppfølgingssak.

## 7. Førstegangspublisering til GitHub Pages

- Kontroller GitHub-kontoen `ltj54`, repository-navn og synlighet. For en side som flere skal kunne se, skal repository og GitHub Pages-oppsett være offentlig tilgjengelig, med mindre Lars bestemmer noe annet.
- Bruk GitHub Pages for kompatible statiske nettsteder som standard ved kjøring av denne rutinen. Et repository på GitHub alene gjør ikke nettstedet tilgjengelig for kunden.
- Gjør den nødvendige første commit/push som en uttrykkelig og kontrollert del av førstegangspubliseringen. Ikke installer noen mekanisme som senere committer eller pusher automatisk.
- Etter at den første testlenken er verifisert, skal nye lokale endringer ikke publiseres før Lars ber om en ny commit og push.
- Backend, database og serverbaserte funksjoner trenger en egnet driftsløsning; avklar denne før publisering. Ikke anta at GitHub Pages kan kjøre dem.
- Kontroller at bare nettstedets offentlige filer inngår i publiseringen.
- Verifiser den faktiske nettadressen etter publisering, inkludert intern navigasjon og ressurser. Noter kundens testlenke når den er bekreftet.
- Kontaktskjemaer følger FormSubmit.co-rutinen i punkt 3: De skal bare klargjøres i første skisse, være ute av stand til å sende og tydelig fremstå som en demonstrasjon. Mottaker og aktivering skal avklares før FormSubmit.co kobles til, og ingen testinnsending eller godkjenningsmail skal utløses på forhånd.
- Domenet skal eies av kunden når dette avtales. Ikke endre DNS eller eksisterende e-postoppsett som en del av å opprette et blankt prosjekt.

## 8. Kontroll og overlevering

1. Bekreft at alle prosjektfiler ligger i riktig mappe, og at IntelliJ kan åpne prosjektet derfra.
2. Søk etter gamle prosjektnavn, absolutte stier til andre prosjekter og feil bruk av `C:\Prosjekt` som rot eller arbeidsmappe.
3. Kontroller Git-rot, gren, remote dersom satt, `.gitignore` og Git-status.
4. Kontroller at ingen Sites-konfigurasjon eller automatisk commit/push er lagt inn. En kontrollert første commit/push til GitHub Pages er tillatt og forventet når prosjektet ikke er bestilt som bare lokalt.
5. Kontroller at `AVTALEUTKAST_NETTSIDE_OG_DRIFT.md` finnes og er tilpasset kjente kunde- og prosjektopplysninger uten oppdiktede vilkår.
6. Hvis prosjektet har kjørbar kode, prøv relevante oppstarts-/byggkommandoer. Et rent dokumentasjonsprosjekt trenger ikke en kunstig applikasjon eller testpakke.
7. Kontroller at nøyaktig ett CRM-kort finnes for prosjektet, med riktig status og uten å antyde at skissen er sendt eller bestilt når den ikke er det. Kontroller også at tidligere utsendelse ikke kan gi automatisk oppfølging, og at det ikke finnes en separat manuell oppfølgingssak for samme prosjekt.
8. Kontroller sticky header ved scrolling på bred og smal skjerm, inkludert at menypunkter og ankerlenker ikke havner skjult under headeren. Søk i synlig tekst og layout etter dekorative seksjonsnumre, generiske salgsklisjeer og gjenbrukte KI-mønstre, og fjern dem før overlevering.
9. Oppsummer konkret: opprettet mappe, hva som er klart, hva som er kontrollert, den verifiserte offentlige GitHub Pages-lenken, CRM-kortet og nøyaktig hvilken commit/push som ble gjort. Hvis Lars ba om bare lokal klargjøring, oppgi tydelig at repository, commit, push og publisering ikke er utført.

Ved senere avvikling brukes `SLETTERUTINER.md` i nyfirmasjekk-prosjektet.
