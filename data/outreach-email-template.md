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
- Skriv selskapsnavn med naturlig bruk av store og små bokstaver.
- Et gratis forslag er en kort skisse av innhold, oppbygging og aktuelle funksjoner. Behov og leveranse avklares i en kravspesifikasjon før utviklingen starter.
- Løsningen kan være en nettside med flere sider, en portal eller et system med database og CRM. Antall sider er ikke en teknisk begrensning; funksjoner velges ut fra kundens behov.
- Universell utforming og personvern med fokus på GDPR inngår i planleggingen. Ikke lov full etterlevelse uten at krav, faktisk løsning og kundens bruk er vurdert.
- Fastprisen på {{priceValue}} kr gjelder en avtalt grunnløsning, inkludert utvikling, tilpasning av innhold og publisering. Grunnløsningen er ikke begrenset til én side; innhold og funksjoner avklares i en kravspesifikasjon. Større løsninger prises separat etter behovsavklaring, og prisen avtales før arbeidet starter. Eventuelle kostnader til domene, hosting og betalte tredjepartstjenester avklares på forhånd.
- En gratis nettsidevurdering er en kort innledende vurdering med forbedringsforslag. Den inkluderer ikke retting eller en full gjennomgang.
- Bruk nøyaktig ett konkret, dokumentert funn i forbedringsmailen.
- Beskriv automatiske funn som signaler fra en førstesjekk, ikke som manuelt bekreftede feil. Ikke lov bedre Google-plassering eller påstå at kunder går tapt.
- Registrert nettside uten et godkjent funn skal legges til manuell kontroll og ikke sendes automatisk.
- Ikke ramse opp tekniske detaljer som DMARC, SPF, DKIM, sikkerhetsheadere eller tredjepartsscripts før mottakeren har bedt om mer.

## E-postmal

Emne: `Nettside for {{companyName}}?`

{{greetingLine}}

[Skriv én konkret observasjon om virksomheten her.]

{{salesSegmentPitch}}

Jeg utvikler mobiltilpassede nettsider og skreddersydde løsninger – fra presentasjonssider til portaler med database og CRM. Vi avklarer behovene sammen, med vekt på universell utforming og personvern, inkludert GDPR.

En avtalt grunnløsning koster fast {{priceValue}} kr, inkludert utvikling, tilpasning av innhold og publisering. Vi avklarer innhold og funksjoner i en kravspesifikasjon. Større løsninger prises separat etter behovsavklaring, og prisen avtales før arbeidet starter.

Eventuelle kostnader til domene, hosting og betalte tredjepartstjenester avklarer vi på forhånd.

Her kan dere se hvordan jeg arbeider:
{{senderWebsite}}

Skal jeg sende et kort, gratis og uforpliktende forslag til innhold, oppbygging og aktuelle funksjoner?

Med vennlig hilsen
{{senderName}}
{{senderPhone}}
{{senderEmail}}

## E-postmal - registrert nettside svarer ikke

Emne: `Spørsmål om nettsiden til {{companyName}}`

{{greetingLine}}

Jeg fikk ikke åpnet {{registeredWebsite}}, som er registrert som nettside for {{companyName}}. Det kan være midlertidig eller skyldes selve sjekken.

Hvis dere ønsker en ny løsning, kan jeg hjelpe med alt fra en mobiltilpasset nettside til en portal med database og CRM. Vi avklarer behovene sammen, med vekt på universell utforming og personvern, inkludert GDPR.

En avtalt grunnløsning koster fast {{priceValue}} kr, inkludert utvikling, tilpasning av innhold og publisering. Vi avklarer innhold og funksjoner i en kravspesifikasjon. Større løsninger prises separat etter behovsavklaring, og prisen avtales før arbeidet starter.

Eventuelle kostnader til domene, hosting og betalte tredjepartstjenester avklarer vi på forhånd.

Her kan dere se hvordan jeg jobber:
{{senderWebsite}}

Er dette fortsatt riktig nettadresse for dere?

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

Jeg ser blant annet på tydelig innhold, mobilbruk, kontaktmuligheter og forhold knyttet til universell utforming og personvern.

Den første vurderingen er gratis og uforpliktende, med noen konkrete forbedringsforslag. Eventuelt videre arbeid avtaler vi på forhånd.

Her kan dere se hva sjekken omfatter:
{{websiteCheckSenderWebsite}}

Skal jeg sende en slik vurdering?

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
