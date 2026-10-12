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
- Skriv på norsk bokmål. Bruk «dere» og «deres» konsekvent om virksomheten, også når hilsenen bruker kontaktpersonens fornavn.
- Ikke bruk overdreven salgstone.
- Ikke påstå ting du ikke vet sikkert.
- Hvis kontaktperson mangler, skriv til selskapet generelt.
- Hvis telefon mangler, ikke nevn telefon.
- Ikke prøv å overbevise i første e-post. Målet er å få svar.
- `[Skriv én konkret observasjon om virksomheten her.]` erstattes automatisk med en naturlig, virksomhetsspesifikk åpning. Næringskode og BRREG skal ikke nevnes i den ferdige e-posten.
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
- Når registrert nettside ikke svarer, må et konkret utkast bygge på manuell kontroll av feilen og andre fungerende kontakt- eller bestillingskanaler. Ikke send slike meldinger automatisk, og ikke tilby en ny nettside eller oppgi fastpris som standard.
- Ikke ramse opp tekniske detaljer som DMARC, SPF, DKIM, sikkerhetsheadere eller tredjepartsscripts før mottakeren har bedt om mer.

## E-postmal

Emne: `Nettside for {{companyName}}?`

{{greetingLine}}

[Skriv én konkret observasjon om virksomheten her.]

{{salesSegmentPitch}}

Jeg kan hjelpe dere med en ryddig, mobilvennlig nettside som viser hva dere tilbyr og gjør det enkelt for kunder å ta kontakt.

En avtalt grunnløsning koster fast {{priceValue}} kr, inkludert utvikling, tilpasning av innhold og publisering. Vi blir enige om innhold og funksjoner før arbeidet starter, og kan bygge videre senere hvis dere ønsker det.

Jeg følger også opp etter levering og hjelper med oppdateringer når det er behov, så dere har noen å kontakte også etter at nettsiden er ferdig.

For en vanlig nettside er et eget, betalt webhotell som regel ikke nødvendig. Et eventuelt domene og andre nødvendige tjenester avklarer vi sammen.

Her kan dere se hvordan jeg arbeider:
{{senderWebsite}}

Kan jeg sende et kort, gratis og uforpliktende forslag til hvordan nettsiden deres kan se ut og hva den kan inneholde?

Med vennlig hilsen
{{senderName}}
{{senderPhone}}
{{senderEmail}}

## E-postmal - registrert nettside svarer ikke

Emne: `Et spørsmål om {{registeredWebsite}}`

{{greetingLine}}

Jeg så at {{registeredWebsite}} er oppgitt som nettside for {{companyName}}. Ved min kontroll fikk jeg ikke åpnet den som forventet. Det kan være midlertidig, så dette må bekreftes på nytt.

[Fyll inn hva du har kontrollert manuelt, og om virksomheten har en annen fungerende kontakt- eller bestillingsside.]

Hvis adressen fortsatt skal brukes, kan jeg se nærmere på hva som må til for å få domenet og lenken videre til eksisterende tilbud til å fungere. Eventuelt arbeid avtaler vi først etter at årsaken er avklart.

Er dette fortsatt riktig nettadresse for dere?

Med vennlig hilsen
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## E-postmal - Audiograf Julie Johnsen

Emne: `Et spørsmål om merennlyd.no`

Hei Julie,

Jeg så at www.merennlyd.no er oppgitt som nettside for Audiograf Julie Johnsen. Da jeg sjekket adressen 11. oktober 2026, fikk jeg sertifikatfeil. I en separat teknisk kontroll gikk www-adressen videre til merennlyd.no, som svarte med 404. Dette kan ha endret seg siden sjekken.

Jeg fant også bestillingssiden deres hos SumUp, der kunder kan se tjenestene og bestille time. Derfor ville jeg først undersøkt om det registrerte domenet kan rettes og lede folk trygt til siden dere allerede bruker – ikke foreslått en ny nettside uten å vite om dere trenger det.

Er merennlyd.no fortsatt ment å være adressen kundene skal bruke? Hvis ja, kan jeg sende en kort, uforpliktende vurdering av hva som bør kontrolleres.

Med vennlig hilsen
{{senderName}}
{{senderPhone}}
{{senderEmail}}

## E-postmal - nettside kan forbedres

Emne: `En observasjon om nettsiden til {{companyName}}`

{{greetingLine}}

En automatisk førstesjekk av nettsiden til {{companyName}} ga følgende signal:

{{websiteQualityMailLine}}
{{websiteQualityImpactLine}}

Funnet bør kontrolleres manuelt før vi konkluderer med at noe bør endres.

Jeg kan først sende en kort, gratis vurdering med noen konkrete forbedringsforslag. Eventuelt videre arbeid avtaler vi på forhånd.

Her er et eksempel på hva jeg ser etter:
{{websiteCheckSenderWebsite}}

Skal jeg sende en slik uforpliktende vurdering?

Med vennlig hilsen
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## E-postmal - registrert nettside bør vurderes manuelt

Emne: `Nettsiden til {{companyName}}`

{{greetingLine}}

Jeg kom over nettsideadressen til {{companyName}} og vil høre om dere ønsker en kort vurdering av siden.

Jeg ser blant annet på tydelig innhold, mobilbruk, kontaktmuligheter og om siden er enkel å bruke for flest mulig.

Den første vurderingen er gratis og uforpliktende, med noen konkrete forbedringsforslag. Eventuelt videre arbeid avtaler vi på forhånd.

Her kan dere se hva sjekken omfatter:
{{websiteCheckSenderWebsite}}

Skal jeg sende en slik vurdering?

Med vennlig hilsen
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## E-postmal - lokallag med felles nettside

Emne: `Et spørsmål om {{localChapterDescription}}`

{{greetingLine}}

Jeg så at {{localChapterDescription}} oppgir {{registeredWebsite}} som nettside. Det ser ut til å være et felles nettsted for organisasjonen, ikke nødvendigvis en side lokallaget selv styrer.

Hvis dere ønsker å gjøre lokale aktiviteter og kontaktinformasjon enklere å finne, kan jeg se på muligheter innenfor løsningen dere allerede bruker, i samråd med dem som administrerer den. Jeg foreslår ikke å erstatte fellesnettstedet.

Er det dere lokalt som bestemmer hvordan informasjonen om lokallaget presenteres på nettsiden?

Med vennlig hilsen
{{senderName}}
{{senderPhone}}
{{senderEmail}}

## Oppfølging etter 4–14 arbeidsdager

Send bare én oppfølging, kun når mottakeren ikke har svart. Velg spørsmålet ut fra den første henvendelsen i utsendelsesloggen, og avslutt kontakten dersom det fortsatt er stille.

Emne: `Oppfølging: nettside for {{companyName}}`

{{greetingLine}}

Ville bare følge opp e-posten min om nettsiden til {{companyName}}.

{{followUpQuestion}}

Hvis det ikke er aktuelt, er det helt i orden. Jeg lar saken ligge dersom jeg ikke hører fra dere.

Med vennlig hilsen
{{senderName}}
{{senderPhone}}
{{senderEmail}}
