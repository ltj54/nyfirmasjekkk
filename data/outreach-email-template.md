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
- Bruk nøyaktig ett konkret, dokumentert funn i forbedringsmailen.
- Registrert nettside uten et godkjent funn skal legges til manuell kontroll og ikke sendes automatisk.
- Ikke ramse opp tekniske detaljer som DMARC, SPF, DKIM, sikkerhetsheadere eller tredjepartsscripts før mottakeren har bedt om mer.

## E-postmal

Emne: `Fant ikke nettsiden til {{companyName}}`

{{greetingLine}}

Jeg kom over {{companyName}}, men fant ikke en tydelig nettside eller kontaktside.

Jeg lager profesjonelle nettsider for små virksomheter, med presentasjon, kontaktinformasjon og en tydelig vei for kunder som ønsker å ta kontakt.

Jeg tilbyr en profesjonell førsteside til {{priceValue}} kr.

Her er et eksempel på hvordan jeg jobber:
{{senderWebsite}}

Skal jeg sende et uforpliktende forslag til hvordan en side for {{companyName}} kan se ut?

Mvh  
{{senderName}}  
LTJ Production
{{senderPhone}}  
{{senderEmail}}

## E-postmal - registrert nettside svarer ikke

Emne: `Nettsiden til {{companyName}} svarte ikke`

{{greetingLine}}

Jeg så at {{registeredWebsite}} er registrert som nettside for {{companyName}}.

Da jeg sjekket den, svarte ikke siden hos meg. Det kan selvfølgelig være midlertidig, men jeg ville nevne det i tilfelle dere ikke er klar over det.

Hvis nettsiden ikke er ferdig eller ikke lenger skal brukes, kan jeg hjelpe med å få på plass en ny nettside med tydelig presentasjon og kontaktinformasjon.

Jeg tilbyr en profesjonell førsteside til {{priceValue}} kr.

Her kan dere se hvordan jeg jobber:
{{senderWebsite}}

Er det aktuelt at jeg sender et uforpliktende forslag?

Mvh  
{{senderName}}  
LTJ Production
{{senderPhone}}  
{{senderEmail}}

## E-postmal - nettside kan forbedres

Emne: `En observasjon om nettsiden til {{companyName}}`

{{greetingLine}}

Jeg tok en rask førstesjekk av nettsiden til {{companyName}}.

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

Jeg kom over nettsiden til {{companyName}} i forbindelse med en gjennomgang av lokale virksomheter.

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
