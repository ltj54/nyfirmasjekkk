# Formular for tilbudsmail

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
- Eksempel/URL: `{{senderWebsite}}`
- Hvorfor selskapet er relevant lead:
  - `[For eksempel: nylig registrert]`
  - `[For eksempel: mangler nettside]`
  - `[For eksempel: har e-post eller telefon registrert]`
- Tilbud:
  - Produkt: `Nettside`
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

- Hold e-posten kort, helst 6-9 linjer før signatur.
- Skriv på norsk bokmal.
- Ikke bruk overdreven salgstone.
- Ikke påstå ting du ikke vet sikkert.
- Hvis kontaktperson mangler, skriv til selskapet generelt.
- Hvis telefon mangler, ikke nevn telefon.
- Ikke prøv å overbevise i første e-post. Målet er å få svar.
- `[Skriv én konkret observasjon om virksomheten her.]` erstattes automatisk med en naturlig, virksomhetsspesifikk åpning. Næringskode og BRREG skal ikke nevnes i den ferdige e-posten.
- Bruk næringskode og salgsgruppe internt for å tilpasse teksten til virksomhetstypen, men skriv for mottakeren – ikke som et registerutdrag.
- Skriv selskapsnavn med naturlig bruk av store og små bokstaver.
- Et gratis forslag er bare en kort tekstskisse av overskrift, seksjoner og stil. Ikke lag design eller bygg siden før pris og leveranse er akseptert.
- Bruk nøyaktig ett konkret, dokumentert funn i forbedringsmailen.
- Registrert nettside uten et godkjent funn skal legges til manuell kontroll og ikke sendes automatisk.
- Ikke ramse opp tekniske detaljer som DMARC, SPF, DKIM, sikkerhetsheadere eller tredjepartsscripts før mottakeren har bedt om mer.

## E-postmal

Emne: `Et forslag til nettside for {{companyName}}`

{{greetingLine}}

[Skriv én konkret observasjon om virksomheten her.]

{{salesSegmentPitch}}

Jeg lager profesjonelle og mobiltilpassede nettsider for små virksomheter og organisasjoner.

En førsteside koster fast {{priceValue}} kr og tilpasses med deres innhold, bilder og kontaktinformasjon. Jeg hjelper også med publisering.

Dersom dere senere ønsker flere sider, påmelding, booking, nettbutikk eller andre funksjoner, kan dette bygges ut etter avtale. Domene og drift avklarer vi ut fra hva dere allerede har og trenger.

Her kan dere se et eksempel på hvordan jeg arbeider:
{{senderWebsite}}

Hvis dette kan være interessant, sender jeg gjerne et kort og uforpliktende forslag til hvordan nettsiden for {{companyName}} kan bygges opp.

Med vennlig hilsen
{{senderName}}
LTJ Production
{{senderPhone}}
{{senderEmail}}

## E-postmal - registrert nettside svarer ikke

Emne: `Nettsiden til {{companyName}} svarte ikke`

{{greetingLine}}

[Skriv én konkret observasjon om virksomheten her.]

{{salesSegmentPitch}}

Jeg så også at {{registeredWebsite}} er registrert som nettside, men siden svarte ikke da jeg sjekket. Det kan selvfølgelig være midlertidig.

Jeg lager profesjonelle og mobiltilpassede nettsider for små virksomheter og organisasjoner.

En førsteside koster fast {{priceValue}} kr og tilpasses med deres innhold, bilder og kontaktinformasjon. Jeg hjelper også med publisering. Dersom dere senere ønsker flere sider, påmelding, booking, nettbutikk eller andre funksjoner, kan dette bygges ut etter avtale. Domene og drift avklarer vi ut fra hva dere allerede har og trenger.

Her kan dere se hvordan jeg jobber:
{{senderWebsite}}

Hvis dette kan være interessant, sender jeg gjerne et kort og uforpliktende forslag til hvordan nettsiden for {{companyName}} kan bygges opp.

Med vennlig hilsen
{{senderName}}  
LTJ Production
{{senderPhone}}  
{{senderEmail}}

## E-postmal - nettside kan forbedres

Emne: `En observasjon om nettsiden til {{companyName}}`

{{greetingLine}}

[Skriv én konkret observasjon om virksomheten her.]

{{websiteQualityMailLine}}
{{websiteQualityImpactLine}}

Dette er ikke en full gjennomgang, men det kan være verdt å se nærmere på.

Hvis dette kan være interessant, sender jeg gjerne en kort og uforpliktende rapport med konkrete funn og forslag til forbedringer.

Her er et eksempel på hva jeg ser etter:
{{websiteCheckSenderWebsite}}

Skal jeg sende den?

Med vennlig hilsen
{{senderName}}  
LTJ Production
{{senderPhone}}  
{{senderEmail}}

## E-postmal - registrert nettside bør vurderes manuelt

Emne: `Nettsiden til {{companyName}}`

{{greetingLine}}

[Skriv én konkret observasjon om virksomheten her.]

Jeg tilbyr korte nettsidesjekker med vurdering av blant annet mobilbruk, kontaktinformasjon, teknisk kvalitet og personvern.

Hvis dette kan være interessant, tar jeg gjerne en nærmere titt på siden deres og sender noen konkrete og uforpliktende forslag.

Her kan dere se hva sjekken omfatter:
{{websiteCheckSenderWebsite}}

Kan det være interessant?

Med vennlig hilsen
{{senderName}}  
LTJ Production
{{senderPhone}}  
{{senderEmail}}

## Oppfølging etter 4–14 arbeidsdager

Send bare én oppfølging. Tilpass første setning og avslutt kontakten dersom det fortsatt er stille.

Emne: `Oppfølging: nettside for {{companyName}}`

{{greetingLine}}

Ville bare høre om {{recipientSubject}} fikk sett meldingen min om nettside for {{companyName}}.

Jeg tror det kan løses ryddig uten å gjøre prosjektet større enn nødvendig.

Hvis dette kan være interessant, sender jeg gjerne et kort og uforpliktende forslag til hvordan siden kan bygges opp.

Med vennlig hilsen
{{senderName}}
LTJ Production
{{senderPhone}}
{{senderEmail}}
