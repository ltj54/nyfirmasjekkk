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
- `[Skriv én konkret observasjon om virksomheten her.]` erstattes automatisk med en sann, virksomhetsspesifikk setning fra BRREG-data før sending.
- Et gratis forslag er bare en kort tekstskisse av overskrift, seksjoner og stil. Ikke lag design eller bygg siden før pris og leveranse er akseptert.
- Bruk nøyaktig ett konkret, dokumentert funn i forbedringsmailen.
- Registrert nettside uten et godkjent funn skal legges til manuell kontroll og ikke sendes automatisk.
- Ikke ramse opp tekniske detaljer som DMARC, SPF, DKIM, sikkerhetsheadere eller tredjepartsscripts før mottakeren har bedt om mer.

## E-postmal

Emne: `Et forslag til nettside for {{companyName}}`

{{greetingLine}}

[Skriv én konkret observasjon om virksomheten her.]

Jeg lager enkle nettsider som gjør det lettere for nye kunder å forstå hva virksomheten tilbyr og ta kontakt.

En enkel førsteside koster fast {{priceValue}} kr. Jeg tilpasser den til virksomheten, sørger for at den fungerer godt på mobil og hjelper med publisering. Hvis dere ønsker booking, nettbutikk eller flere sider, kan jeg også hjelpe med det – så finner vi omfang og pris sammen. Domene og drift avklarer vi ut fra hva dere allerede har og trenger.

Her er et eksempel på hvordan jeg jobber:
{{senderWebsite}}

Er det greit at jeg sender et kort, tekstbasert forslag til hvordan siden kan bygges opp?

Mvh
{{senderName}}
LTJ Production
{{senderPhone}}
{{senderEmail}}

## E-postmal - registrert nettside svarer ikke

Emne: `Nettsiden til {{companyName}} svarte ikke`

{{greetingLine}}

[Skriv én konkret observasjon om virksomheten her.]

Jeg så også at {{registeredWebsite}} er registrert som nettside, men siden svarte ikke da jeg sjekket. Det kan selvfølgelig være midlertidig.

Jeg kan lage en enkel nettside som gjør det lettere for nye kunder å forstå hva dere tilbyr og ta kontakt.

En enkel førsteside koster fast {{priceValue}} kr. Jeg tilpasser den til virksomheten, sørger for at den fungerer godt på mobil og hjelper med publisering. Hvis dere ønsker booking, nettbutikk eller flere sider, kan jeg også hjelpe med det – så finner vi omfang og pris sammen. Domene og drift avklarer vi ut fra hva dere allerede har og trenger.

Her kan dere se hvordan jeg jobber:
{{senderWebsite}}

Er det greit at jeg sender et kort, tekstbasert forslag til hvordan siden kan bygges opp?

Mvh  
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

Hvis dere ønsker det, kan jeg sende en kort rapport med konkrete funn og forslag til forbedringer.

Her er et eksempel på hva jeg ser etter:
{{websiteCheckSenderWebsite}}

Skal jeg sende rapporten?

Mvh  
{{senderName}}  
LTJ Production
{{senderPhone}}  
{{senderEmail}}

## E-postmal - registrert nettside bør vurderes manuelt

Emne: `Nettsiden til {{companyName}}`

{{greetingLine}}

[Skriv én konkret observasjon om virksomheten her.]

Jeg tilbyr korte nettsidesjekker med vurdering av blant annet mobilbruk, kontaktinformasjon, teknisk kvalitet og personvern.

Hvis det er interessant, kan jeg ta en nærmere titt på siden deres og sende noen konkrete punkter.

Her kan dere se hva sjekken omfatter:
{{websiteCheckSenderWebsite}}

Er det aktuelt?

Mvh  
{{senderName}}  
LTJ Production
{{senderPhone}}  
{{senderEmail}}

## Oppfølging etter 4–6 arbeidsdager

Send bare én oppfølging. Tilpass første setning og avslutt kontakten dersom det fortsatt er stille.

Emne: `Oppfølging: nettside for {{companyName}}`

{{greetingLine}}

Ville bare høre om du fikk sett meldingen min om nettside for {{companyName}}.

Jeg tror det kan løses ryddig uten å gjøre prosjektet større enn nødvendig.

Gi gjerne beskjed dersom du vil at jeg skal sende en kort, tekstbasert skisse av hvordan siden kan bygges opp.

Mvh
{{senderName}}
LTJ Production
{{senderPhone}}
{{senderEmail}}
