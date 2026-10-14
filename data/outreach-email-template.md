# Maler for tilbudsmail og oppfølging

Bruk denne malen som grunnlag når en tilbudsmail om nettside skal genereres.

## Input

- Dato: `YYYY-MM-DD`
- Selskapsnavn: `{{companyName}}`
- Organisasjonsnummer: `{{orgNumber}}`
- Kontaktperson: `{{contactPerson}}`
- E-post: `{{companyEmail}}`
- Telefon: `{{companyPhone}}`
- Kommune/fylke: `{{location}}`
- NACE: `{{naceCode}}` / `{{naceDescription}}`
- Salgsgruppe: `{{salesSegment}}`
- Tilpasset bransjetekst: `{{salesSegmentPitch}}`
- Hilsningslinje: `{{greetingLine}}` (`Hei [fornavn],` eller `Hei,`)
- Domeneeksempel: `{{domainExample}}`
- Domenelinje: `{{domainLine}}`
- Pris: `{{priceValue}}`
- Avsenders organisasjonsnummer: `{{senderOrganizationNumber}}` (LTJ Production, 838 632 122)
- Registrert nettside-intro: `{{registeredWebsiteIntro}}`
- Lokalavdeling på fellesnettsted: `{{localChapterDescription}}`
- Dokumentert observasjon: `{{websiteQualityMailLine}}`
- Kort konsekvens: `{{websiteQualityImpactLine}}`
- Oppfølgingsspørsmål: `{{followUpQuestion}}` (velges ut fra typen første henvendelse i utsendelsesloggen)
- Eksempel/URL: `{{senderWebsite}}`
- Hvorfor selskapet er relevant lead:
  - `[For eksempel: nylig registrert]`
  - `[For eksempel: mangler nettside]`
  - `[For eksempel: har e-post eller telefon registrert]`
- Tilbud:
  - Produkt: `Nettside, portal eller skreddersydd nettløsning`
  - Innhold:
    - `Nettside`
    - `Hjelp med domene`
    - `Hjelp med e-post`
    - `Tydelig kontaktpunkt`
- Tone:
  - `kort`
  - `ryddig`
  - `ikke påtrengende`
  - `konkret`

## Regler for generering

- Hold e-posten kort, med korte avsnitt og ett enkelt spørsmål til slutt.
- Presenter avsenderen kort og si hvorfor du tar kontakt, uten å gi inntrykk av et eksisterende kundeforhold.
- Ikke anta at mottakeren trenger en nettside, har mistet kunder eller ønsker å erstatte løsningen de bruker. Gjør det enkelt å takke nei eller la være å svare.
- Skill tydelig mellom en gratis, kort skisse/vurdering og betalt utvikling eller retting. Eventuelt arbeid avtales på forhånd.
- Unngå lange lister over funksjoner, tjenester, priser og tekniske feil i den første kontakten.
- Skriv på norsk bokmål. Bruk «dere» og «deres» konsekvent om virksomheten, også når hilsenen bruker kontaktpersonens fornavn.
- Ikke bruk overdreven salgstone.
- Ikke påstå ting du ikke vet sikkert.
- Hvis kontaktperson mangler, skriv til selskapet generelt.
- Hvis telefon mangler, ikke nevn telefon.
- Ikke prøv å overbevise i første e-post. Målet er å få svar.
- `[Skriv én konkret observasjon om virksomheten her.]` erstattes automatisk med en nøktern åpning som navngir virksomheten. Ikke finn på en personlig observasjon eller påstå at nettsiden er manuelt gjennomgått. Næringskode og BRREG skal ikke nevnes i den ferdige e-posten.
- Bruk næringskode og salgsgruppe internt for å tilpasse teksten til virksomhetstypen, men skriv for mottakeren – ikke som et registerutdrag.
- For landbruk og jordbruk: fremhev at nettsiden kan vise tjenester, geografisk område og kontaktmuligheter for gårdbrukere. Ikke finn på konkrete tjenester som ikke er oppgitt.
- Skriv selskapsnavn med naturlig bruk av store og små bokstaver.
- Et gratis forslag er en kort skisse av innhold, oppbygging og aktuelle funksjoner. Behov og leveranse avklares i en kravspesifikasjon før utviklingen starter.
- Løsningen kan være en nettside med flere sider, en portal eller et system for å samle informasjon og holde oversikt over kunder og henvendelser. Antall sider er ikke en teknisk begrensning; funksjoner velges ut fra kundens behov.
- I den første nettsidehenvendelsen: fremhev en ryddig, mobilvennlig nettside og enkel kontakt. Vent med portaler og større løsninger til kunden har behov for det.
- Fortell at kunden får oppfølging og hjelp med oppdateringer etter levering, uten å love ubegrensede gratis oppdateringer.
- For en vanlig nettside er et eget, betalt webhotell som regel ikke nødvendig. Eventuelt domene og andre nødvendige tjenester avklares sammen med kunden.
- Universell utforming og personvern med fokus på GDPR inngår i planleggingen. Ikke lov full etterlevelse uten at krav, faktisk løsning og kundens bruk er vurdert.
- Fastprisen på {{priceValue}} kr gjelder en avtalt grunnløsning, inkludert utvikling, tilpasning av innhold og publisering. Grunnløsningen er ikke begrenset til én side; innhold og funksjoner avklares i en kravspesifikasjon. Vi kan starte med grunnløsningen og se på flere funksjoner senere hvis kunden ønsker det. Vi avklarer alltid hva som skal lages før arbeidet starter. Eventuelle eksterne kostnader avklares tydelig før oppstart.
- En gratis nettsidevurdering er en kort innledende vurdering med forbedringsforslag. Den inkluderer ikke retting eller en full gjennomgang.
- Bruk nøyaktig ett konkret, dokumentert funn i forbedringsmailen.
- Beskriv automatiske funn som signaler fra en førstesjekk, ikke som manuelt bekreftede feil. Ikke lov bedre Google-plassering eller påstå at kunder går tapt.
- Registrert nettside uten et godkjent funn skal legges til manuell kontroll og ikke sendes automatisk.
- Når et lokallag eller fylkeslag oppgir hovedorganisasjonens felles nettside, skal rapporten om hovedsiden ikke brukes som om lokallaget eier den. Lag bare et manuelt utkast som avklarer hvem som styrer den lokale informasjonen; ikke send automatisk.
- Når registrert nettside ikke svarer, må et manuelt utkast bygge på kontroll av adressen og andre fungerende kontakt- eller bestillingskanaler. Ikke anta at nettsiden finnes, eller at domenet bare er registrert; begge deler er mulige. Tilby å undersøke og rette en eksisterende løsning hvis det er aktuelt, eller å bygge en nettside eller app dersom adressen ennå ikke brukes og virksomheten ønsker det. Utsending i nettsidelead-batch krever eksplisitt bekreftelse og to adskilte tekniske sjekker; den manuelle plassholderen fjernes da, siden batchen ikke kan hevde manuell kontroll. Ikke oppgi fastpris før behov og omfang er avklart.
- Ikke ramse opp tekniske detaljer som DMARC, SPF, DKIM, sikkerhetsheadere eller tredjepartsscripts før mottakeren har bedt om mer.
- Avslutt alle e-poster med `Org.nr. 838 632 122` i signaturen, også oppfølginger og nettsidelead-batcher.

## E-postmal

Emne: `Nettside for {{companyName}}?`

{{greetingLine}}

[Skriv én konkret observasjon om virksomheten her.]

Jeg heter Lars og lager nettsider i LTJ Production. Jeg vet ikke om dere allerede har en løsning på plass. Hvis dette er aktuelt, kan jeg sende en kort, gratis skisse til en enkel nettside.

En avtalt grunnløsning koster {{priceValue}} kr, inkludert utvikling og publisering. Vi avklarer innhold og eventuelle andre kostnader før noe arbeid starter.

Vil dere at jeg sender en slik skisse?

Med vennlig hilsen
{{senderName}}
{{senderPhone}}
{{senderEmail}}
{{senderOrganizationNumber}}

## E-postmal - registrert nettside svarer ikke

Emne: `Et spørsmål om {{registeredWebsite}}`

{{greetingLine}}

Jeg heter Lars og lager nettsider i LTJ Production. Jeg så {{registeredWebsite}} oppført som nettadresse for {{companyName}}, men fikk ikke åpnet den ved en teknisk sjekk. Det kan være midlertidig, og jeg vet ikke om dere bruker en annen adresse.

[Fyll inn hva du har kontrollert manuelt, og om virksomheten har en annen fungerende kontakt- eller bestillingsside.]

Hvis dere vil bruke adressen, kan jeg se nærmere på hva som hindrer den i å åpnes. Hvis dere planlegger en ny nettside eller enkel app, kan jeg hjelpe med det også. En kort vurdering er gratis; eventuelt arbeid avtaler vi på forhånd.

Er det relevant at jeg sender en kort vurdering?

Med vennlig hilsen
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}
{{senderOrganizationNumber}}

## E-postmal - Audiograf Julie Johnsen

Emne: `Et spørsmål om merennlyd.no`

Hei Julie,

Jeg heter Lars og lager nettsider i LTJ Production. Jeg så www.merennlyd.no oppført som nettadresse for Audiograf Julie Johnsen, men fikk ikke åpnet den ved en teknisk sjekk. Det kan være midlertidig.

Hvis dere fortsatt bruker bestillingssiden hos SumUp, kan det hende at adressen bare trenger å kobles til den. Hvis dere ønsker en egen nettside, kan jeg hjelpe med det også. En kort vurdering er gratis; eventuelt arbeid avtaler vi på forhånd.

Vil dere at jeg ser nærmere på adressen og sender en kort vurdering?

Med vennlig hilsen
{{senderName}}
{{senderPhone}}
{{senderEmail}}
{{senderOrganizationNumber}}

## E-postmal - Audiograf Julie Johnsen - batch

Hei Julie,

Jeg heter Lars og lager nettsider i LTJ Production. Jeg så www.merennlyd.no oppført som nettadresse for Audiograf Julie Johnsen, men fikk ikke åpnet den ved en teknisk sjekk. Det kan være midlertidig.

Hvis dere fortsatt bruker bestillingssiden hos SumUp, kan det hende at adressen bare trenger å kobles til den. Hvis dere ønsker en egen nettside, kan jeg hjelpe med det også. En kort vurdering er gratis; eventuelt arbeid avtaler vi på forhånd.

Vil dere at jeg ser nærmere på adressen og sender en kort vurdering?

Med vennlig hilsen
{{senderName}}
{{senderPhone}}
{{senderEmail}}
{{senderOrganizationNumber}}

## E-postmal - nettside kan forbedres

Emne: `En observasjon om nettsiden til {{companyName}}`

{{greetingLine}}

Jeg heter Lars og lager nettsider i LTJ Production. En automatisk førstesjekk av nettsiden til {{companyName}} ga dette mulige funnet:

{{websiteQualityMailLine}}

Jeg har ikke kontrollert det manuelt, så det kan være uproblematisk. En kort vurdering er gratis; eventuelle endringer avtaler vi på forhånd.

Vil dere at jeg ser nærmere på det?

Med vennlig hilsen
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}
{{senderOrganizationNumber}}

## E-postmal - registrert nettside bør vurderes manuelt

Emne: `Nettsiden til {{companyName}}`

{{greetingLine}}

Jeg heter Lars og lager nettsider i LTJ Production. Jeg kom over nettsiden til {{companyName}} og lurte på om dere ønsker en kort vurdering av innhold, mobilvisning og kontaktmuligheter.

Den første vurderingen er gratis. Eventuelle endringer avtaler vi på forhånd.

Er det aktuelt?

Med vennlig hilsen
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}
{{senderOrganizationNumber}}

## E-postmal - lokallag med felles nettside

Emne: `Et spørsmål om {{localChapterDescription}}`

{{greetingLine}}

Jeg heter Lars og lager nettsider i LTJ Production. Jeg så at {{localChapterDescription}} oppgir {{registeredWebsite}} som nettside. Det ser ut til å være et felles nettsted, så jeg vet ikke hvem som styrer den lokale informasjonen.

Hvis dere ønsker det, kan jeg se på muligheter innenfor løsningen dere allerede bruker. Jeg foreslår ikke å erstatte fellesnettstedet.

Er det dere lokalt som bestemmer hvordan informasjonen presenteres?

Med vennlig hilsen
{{senderName}}
{{senderPhone}}
{{senderEmail}}
{{senderOrganizationNumber}}

## Oppfølging etter 4–14 arbeidsdager

Send bare én oppfølging, kun når mottakeren ikke har svart. Velg spørsmålet ut fra den første henvendelsen i utsendelsesloggen, og avslutt kontakten dersom det fortsatt er stille.

Emne: `Oppfølging: nettside for {{companyName}}`

{{greetingLine}}

Jeg følger opp e-posten min om nettsiden til {{companyName}} én gang.

{{followUpQuestion}}

Hvis det ikke er aktuelt, trenger dere ikke svare. Jeg kontakter dere ikke igjen om dette.

Med vennlig hilsen
{{senderName}}
{{senderPhone}}
{{senderEmail}}
{{senderOrganizationNumber}}
