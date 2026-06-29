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
- Mottakerform: `{{recipientSubject}}`, `{{recipientPossessive}}`, `{{recipientObject}}`, `{{recipientPagePossessive}}`
- Domeneeksempel: `{{domainExample}}`
- Domenelinje: `{{domainLine}}`
- Pris: `{{priceValue}}`
- Registrert nettside-intro: `{{registeredWebsiteIntro}}`
- Forsiktig personvern/UU-linje: `{{websiteComplianceMailLine}}`
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
- Ikke påsta ting du ikke vet sikkert.
- Hvis kontaktperson mangler, skriv til selskapet generelt.
- Hvis telefon mangler, ikke nevn telefon.
- Ikke prøv å overbevise i første e-post. Målet er å få svar.
- Bruk maks 1-2 konkrete funn i første e-post.
- Ikke ramse opp tekniske detaljer som DMARC, SPF, DKIM, sikkerhetsheadere eller tredjepartsscripts før mottakeren har bedt om mer.

## Emneforslag

- `Nettside for {{companyName}}`
- `{{companyName}} - nettside/kontaktinfo`
- `Spørsmål om nettsiden til {{companyName}}`
- `Kort observasjon om {{registeredWebsite}}`
- `Fant ikke nettside for {{companyName}}`

## E-postmal

Emne: `Nettside for {{companyName}}`

Hei {{greeting}},

Jeg kom over {{companyName}}, men fant ikke en tydelig nettside/kontaktside.

Jeg lager enkle nettsider for små og nye virksomheter - med kort presentasjon, kontaktinfo og tydelig kontaktvei.

Pris for en enkel førsteside er fra kr {{priceValue}}.

Eksempel:
{{senderWebsite}}

Hvis det er aktuelt, kan jeg sende et konkret forslag.

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## E-postmal - registrert nettside svarer ikke

Emne: `Kort observasjon om {{registeredWebsite}}`

Hei {{greeting}},

Jeg så at {{companyName}} har {{registeredWebsite}} registrert som nettside.

Da jeg sjekket, svarte ikke siden hos meg. Det kan selvfølgelig være midlertidig, men jeg ville bare nevne det i tilfelle dere ikke er klar over det.

Hvis dere ønsker det, kan jeg ta en kort sjekk og sende en enkel vurdering av hva som eventuelt bør rettes.

Eksempel på nettsidesjekk:
{{websiteCheckSenderWebsite}}

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## E-postmal - nettside kan forbedres

Emne: `Spørsmål om nettsiden til {{companyName}}`

Hei {{greeting}},

Jeg tok en enkel førstesjekk av nettsiden til {{companyName}} og så noen punkter som kan være verdt å se nærmere på.

{{websiteQualityMailLine}}
{{websiteComplianceMailLine}}

Dette er ikke en full gjennomgang, bare en rask teknisk indikasjon.

Hvis dere ønsker det, kan jeg sende en kort rapport med konkrete funn og forslag til enkle forbedringer.

Eksempel:
{{websiteCheckSenderWebsite}}

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## E-postmal - registrert nettside bør vurderes

Emne: `Spørsmål om nettsiden til {{companyName}}`

Hei {{greeting}},

Jeg tok en enkel førstesjekk av nettsiden til {{companyName}} og så noen punkter som kan være verdt å se nærmere på.

Dette er ikke en full gjennomgang, bare en rask teknisk indikasjon.

Hvis dere ønsker det, kan jeg sende en kort rapport med konkrete funn og forslag til enkle forbedringer.

Eksempel:
{{websiteCheckSenderWebsite}}

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## Kort variant

Hei {{greeting}},

Jeg kom over {{companyName}}, men fant ikke en tydelig nettside/kontaktside.

Jeg lager enkle nettsider for små og nye virksomheter. Pris for en enkel førsteside er fra kr {{priceValue}}.

Eksempel:
{{senderWebsite}}

Hvis det er aktuelt, kan jeg sende et konkret forslag.

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## Generert eksempel

Emne: `Nettside for Eksempel AS`

Hei dere i Eksempel AS,

Jeg kom over Eksempel AS, men fant ikke en tydelig nettside/kontaktside.

Jeg lager enkle nettsider for små og nye virksomheter - med kort presentasjon, kontaktinfo og tydelig kontaktvei.

Pris for en enkel førsteside er fra kr 1.990.

Eksempel:
https://ltj-production.no/

Hvis det er aktuelt, kan jeg sende et konkret forslag.

Mvh  
Lars Johannessen  
977 24 209  
kontakt@ltj-production.no
